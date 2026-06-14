import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { encodeUsageMarker } from '@/lib/tokens';

export const runtime = 'edge';

const MODEL_ID = 'claude-haiku-4-5';

/**
 * Builds the system prompt sent to Claude for nutrition suggestions.
 * Framed around daily minimums and nourishing additions, not
 * calorie deficits/restriction (see Phase 3 notes).
 *
 * Exposed here (rather than buried inline) so the same string can be
 * surfaced verbatim in the Token Transparency Panel - users should see
 * exactly what's being sent on their behalf.
 */
function buildSystemPrompt(context: {
  remainingCalories?: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
  loggedFoods?: string[];
}) {
  const { remainingCalories, remainingProtein, remainingCarbs, remainingFat, loggedFoods } = context;

  return [
    'You are a supportive nutrition assistant inside MacroLens, a macro-tracking app.',
    'Your job is to suggest foods or meals that help the user reach their daily nutrition targets.',
    'Frame suggestions around ADDING nourishing foods to meet daily minimums for protein, fiber, and key nutrients - never around restriction, deficits, or "earning" food through exercise.',
    'Keep responses concise (2-4 short suggestions), practical, and encouraging.',
    '',
    `Remaining today: ~${remainingCalories ?? 'unknown'} kcal, ${remainingProtein ?? 'unknown'}g protein, ${remainingCarbs ?? 'unknown'}g carbs, ${remainingFat ?? 'unknown'}g fat.`,
    loggedFoods && loggedFoods.length > 0
      ? `Already logged today: ${loggedFoods.join(', ')}.`
      : 'Nothing logged yet today.',
  ].join('\n');
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, context = {} } = body;

  const systemPrompt = buildSystemPrompt(context);

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Stream the visible text to the client token-by-token, same as before.
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        // After the text stream finishes, the SDK resolves usage totals.
        // Different AI SDK versions name these fields slightly differently,
        // so we check both.
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
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}