import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

const client = new Anthropic();

export interface SuggestionScore {
  relevance: number;
  specificity: number;
  tone: number;
  overall: number;
  reasons: {
    relevance: string;
    specificity: string;
    tone: string;
  };
  inputTokens: number;
  outputTokens: number;
}

const SCORER_SYSTEM = `You are a nutrition suggestion evaluator. Score AI-generated nutrition suggestions on three axes. Respond ONLY with valid JSON matching this exact shape, no other text:
{"relevance":0,"specificity":0,"tone":0,"reasons":{"relevance":"","specificity":"","tone":""}}

Scoring rubric:
- relevance (1-5): 5 = directly addresses macro gaps shown; 1 = ignores context entirely
- specificity (1-5): 5 = names specific foods with rough amounts; 1 = only vague categories
- tone (1-5): 5 = purely additive/encouraging; 1 = uses restriction/deficit/guilt language`;

export async function POST(req: Request) {
  const body = await req.json();
  const { suggestion, remainingCalories, remainingProtein, remainingCarbs, remainingFat, loggedFoods = [] } = body;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: SCORER_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        `Macro gaps: ${Math.round(remainingCalories)} kcal, ${Math.round(remainingProtein)}g protein, ${Math.round(remainingCarbs)}g carbs, ${Math.round(remainingFat)}g fat remaining.`,
        loggedFoods.length > 0 ? `Logged today: ${loggedFoods.join(', ')}.` : 'Nothing logged today.',
        '',
        'Suggestion to score:',
        suggestion,
      ].join('\n'),
    }],
  });

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Omit<SuggestionScore, 'overall' | 'inputTokens' | 'outputTokens'>;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return Response.json({ error: 'Failed to parse score', raw }, { status: 500 });
  }

  const overall = Math.round(((parsed.relevance + parsed.specificity + parsed.tone) / 3) * 10) / 10;

  return Response.json({
    ...parsed,
    overall,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  } satisfies SuggestionScore);
}