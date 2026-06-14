import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { encodeUsageMarker } from '@/lib/tokens';

export const runtime = 'edge';

const MODEL_ID = 'claude-haiku-4-5';

interface LogEntry {
  foodName: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface Macro {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

function buildSystemPrompt(macros: Macro, logs: LogEntry[]) {
  const consumed = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.macros.calories,
      protein: acc.protein + log.macros.protein,
      carbs: acc.carbs + log.macros.carbs,
      fat: acc.fat + log.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: Math.max(0, macros.targetCalories - consumed.calories),
    protein: Math.max(0, macros.targetProtein - consumed.protein),
    carbs: Math.max(0, macros.targetCarbs - consumed.carbs),
    fat: Math.max(0, macros.targetFat - consumed.fat),
  };

  const loggedFoods = logs.map((l) => l.foodName);

  return [
    'You are a supportive nutrition assistant inside MacroLens, a macro-tracking app.',
    'Your job is to suggest foods or meals that help the user reach their daily nutrition targets.',
    'Frame suggestions around ADDING nourishing foods to meet daily minimums for protein, fiber, and key nutrients - never around restriction, deficits, or "earning" food through exercise.',
    'Keep responses concise (2-4 short suggestions), practical, and encouraging.',
    'Format with short paragraphs or simple bullet points; avoid heavy markdown headers.',
    '',
    `Remaining today: ~${Math.round(remaining.calories)} kcal, ${Math.round(remaining.protein)}g protein, ${Math.round(remaining.carbs)}g carbs, ${Math.round(remaining.fat)}g fat.`,
    loggedFoods.length > 0
      ? `Already logged today: ${loggedFoods.join(', ')}.`
      : 'Nothing logged yet today.',
  ].join('\n');
}

export async function POST(req: Request) {
  const body = await req.json();
  const { macros, logs = [], messages } = body;

  const systemPrompt = buildSystemPrompt(macros, logs);

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        const usage = await result.usage;
        const inputTokens =
          (usage as any).inputTokens ?? (usage as any).promptTokens ?? 0;
        const outputTokens =
          (usage as any).outputTokens ?? (usage as any).completionTokens ?? 0;

        const usagePayload = encodeUsageMarker({
          inputTokens,
          outputTokens,
          systemPrompt,
          model: MODEL_ID,
        });

        controller.enqueue(encoder.encode(usagePayload));
      } catch (err) {
        console.error('Error streaming suggestion:', err);
        controller.error(err);
        return;
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}