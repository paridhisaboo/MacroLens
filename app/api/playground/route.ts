import Anthropic from '@anthropic-ai/sdk';
import { PROMPT_STRATEGIES, type PromptContext, type SuggestionScore } from '@/lib/tokens';

export const runtime = 'edge';

const client = new Anthropic();
const MODEL_ID = 'claude-haiku-4-5';

const SCORER_SYSTEM = `You are a nutrition suggestion evaluator. Score AI-generated nutrition suggestions on three axes. Respond ONLY with valid JSON matching this exact shape, no other text:
{"relevance":0,"specificity":0,"tone":0,"reasons":{"relevance":"","specificity":"","tone":""}}

Scoring rubric:
- relevance (1-5): 5 = directly addresses macro gaps shown; 1 = ignores context entirely
- specificity (1-5): 5 = names specific foods with rough amounts; 1 = only vague categories
- tone (1-5): 5 = purely additive/encouraging; 1 = uses restriction/deficit/guilt language`;

export interface PlaygroundResult {
  strategyId: string;
  strategyName: string;
  systemPrompt: string;
  response: string;
  score: SuggestionScore;
  inputTokens: number;
  outputTokens: number;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { strategyId, context }: { strategyId: string; context: PromptContext } = body;

  const strategy = PROMPT_STRATEGIES.find(s => s.id === strategyId);
  if (!strategy) {
    return Response.json({ error: `Unknown strategy: ${strategyId}` }, { status: 400 });
  }

  const systemPrompt = strategy.buildPrompt(context);

  // Step 1: get suggestion
  let suggestionMsg: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    suggestionMsg = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: "Give me suggestions based on what I've eaten today." }],
    });
  } catch (err) {
    console.error('Suggestion failed:', err);
    return Response.json({ error: 'Suggestion call failed', detail: String(err) }, { status: 500 });
  }

  const response = suggestionMsg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  // Step 2: score the suggestion
  let scoreData: Omit<SuggestionScore, 'overall' | 'inputTokens' | 'outputTokens'>;
  let scorerInputTokens = 0;
  let scorerOutputTokens = 0;

  try {
    const scorerMsg = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 512,
      system: SCORER_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          `Macro gaps: ${Math.round(context.remainingCalories ?? 0)} kcal, ${Math.round(context.remainingProtein ?? 0)}g protein, ${Math.round(context.remainingCarbs ?? 0)}g carbs, ${Math.round(context.remainingFat ?? 0)}g fat remaining.`,
          context.loggedFoods?.length > 0 ? `Logged today: ${context.loggedFoods.join(', ')}.` : 'Nothing logged today.',
          '',
          'Suggestion to score:',
          response.slice(0, 800),  // ← add .slice(0, 800) to cap input length,
        ].join('\n'),
      }],
    });

    scorerInputTokens = scorerMsg.usage.input_tokens;
    scorerOutputTokens = scorerMsg.usage.output_tokens;

    const scoreRaw = scorerMsg.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = scoreRaw.replace(/```json|```/g, '').trim();
    scoreData = JSON.parse(cleaned);
  } catch (err) {
    console.error('Scorer failed:', err);
    // Return a fallback score so the UI still renders
    scoreData = {
      relevance: 0,
      specificity: 0,
      tone: 0,
      reasons: { relevance: 'Scoring failed', specificity: 'Scoring failed', tone: 'Scoring failed' },
    };
  }

  const overall = scoreData.relevance && scoreData.specificity && scoreData.tone
    ? Math.round(((scoreData.relevance + scoreData.specificity + scoreData.tone) / 3) * 10) / 10
    : 0;

  const result: PlaygroundResult = {
    strategyId: strategy.id,
    strategyName: strategy.name,
    systemPrompt,
    response,
    score: {
      ...scoreData,
      overall,
      inputTokens: scorerInputTokens,
      outputTokens: scorerOutputTokens,
    },
    inputTokens: suggestionMsg.usage.input_tokens,
    outputTokens: suggestionMsg.usage.output_tokens,
  };

  return Response.json(result);
}