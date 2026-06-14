/**
 * Token usage, cost calculation, and prompt strategy definitions
 * for MacroLens' AI suggestion layer.
 *
 * Pricing reflects Anthropic's published rates for claude-haiku-4-5.
 * Source: https://www.anthropic.com/claude/haiku ($1.00 / $5.00 per MTok)
 */

export const HAIKU_PRICING = {
  inputPerMillion: 1.0,
  outputPerMillion: 5.0,
} as const;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function calculateCost(usage: TokenUsage): CostBreakdown {
  const inputCost = (usage.inputTokens / 1_000_000) * HAIKU_PRICING.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * HAIKU_PRICING.outputPerMillion;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.000001) return '<$0.000001';
  return `$${cost.toFixed(6)}`;
}

export function formatTokenCount(count: number): string {
  return count.toLocaleString('en-US');
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const USAGE_MARKER_START = '__USAGE__';
export const USAGE_MARKER_END = '__END_USAGE__';

export interface StreamedUsagePayload extends TokenUsage {
  systemPrompt: string;
  model: string;
}

export function encodeUsageMarker(payload: StreamedUsagePayload): string {
  return `${USAGE_MARKER_START}${JSON.stringify(payload)}${USAGE_MARKER_END}`;
}

// ---------------------------------------------------------------------------
// Prompt strategies for the playground
// ---------------------------------------------------------------------------

export interface PromptStrategy {
  id: string;
  name: string;
  description: string;
  /** Build the system prompt given the current macro context */
  buildPrompt: (ctx: PromptContext) => string;
}

export interface PromptContext {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  loggedFoods: string[];
}

export const PROMPT_STRATEGIES: PromptStrategy[] = [
  {
    id: 'concise',
    name: 'Concise',
    description: 'Minimal prompt — lowest token cost, fast responses',
    buildPrompt: ({ remainingCalories, remainingProtein, loggedFoods }) =>
      [
        'You are a nutrition assistant. Suggest 2-3 foods to help the user hit their daily targets. Be brief and specific.',
        `Remaining: ~${Math.round(remainingCalories)} kcal, ${Math.round(remainingProtein)}g protein.`,
        loggedFoods.length > 0 ? `Logged: ${loggedFoods.join(', ')}.` : 'Nothing logged yet.',
      ].join('\n'),
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Full macro context — richer suggestions, more tokens',
    buildPrompt: ({ remainingCalories, remainingProtein, remainingCarbs, remainingFat, loggedFoods }) =>
      [
        'You are a supportive nutrition assistant inside MacroLens, a macro-tracking app.',
        'Your job is to suggest foods or meals that help the user reach their daily nutrition targets.',
        'Frame suggestions around ADDING nourishing foods to meet daily minimums for protein, fiber, and key nutrients — never around restriction, deficits, or "earning" food through exercise.',
        'Keep responses concise (2-4 short suggestions), practical, and encouraging.',
        'Format with short paragraphs or simple bullet points; avoid heavy markdown headers.',
        '',
        `Remaining today: ~${Math.round(remainingCalories)} kcal, ${Math.round(remainingProtein)}g protein, ${Math.round(remainingCarbs)}g carbs, ${Math.round(remainingFat)}g fat.`,
        loggedFoods.length > 0
          ? `Already logged today: ${loggedFoods.join(', ')}.`
          : 'Nothing logged yet today.',
      ].join('\n'),
  },
  {
    id: 'mealplan',
    name: 'Meal Plan',
    description: 'Structures remaining meals as a plan — most tokens, most structured',
    buildPrompt: ({ remainingCalories, remainingProtein, remainingCarbs, remainingFat, loggedFoods }) =>
      [
        'You are a meal planning assistant. Given what the user has already eaten today, suggest a structured plan for their remaining meals.',
        'Focus on nourishing additions that help them hit their targets. Never use restriction language.',
        'Format your response as: one snack suggestion and one dinner suggestion, each with a rough calorie and protein estimate.',
        '',
        `Remaining today: ~${Math.round(remainingCalories)} kcal, ${Math.round(remainingProtein)}g protein, ${Math.round(remainingCarbs)}g carbs, ${Math.round(remainingFat)}g fat.`,
        loggedFoods.length > 0
          ? `Already eaten: ${loggedFoods.join(', ')}.`
          : 'Nothing eaten yet today — suggest a full day outline.',
        '',
        'Keep each suggestion to 2-3 sentences. Be specific with food names and amounts.',
      ].join('\n'),
  },
];

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