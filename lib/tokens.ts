/**
 * Token usage and cost calculation utilities for MacroLens' AI suggestions.
 *
 * Pricing reflects Anthropic's published rates for claude-haiku-4-5
 * (the model used in /api/suggest). Update HAIKU_PRICING if you change
 * models or if pricing changes.
 *
 * Source: https://www.anthropic.com/claude/haiku ($1.00 / $5.00 per MTok)
 */

export const HAIKU_PRICING = {
  inputPerMillion: 1.0, // USD per 1M input tokens
  outputPerMillion: 5.0, // USD per 1M output tokens
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

/**
 * Calculate the USD cost of a request given its token usage.
 */
export function calculateCost(usage: TokenUsage): CostBreakdown {
  const inputCost = (usage.inputTokens / 1_000_000) * HAIKU_PRICING.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * HAIKU_PRICING.outputPerMillion;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Format a USD cost for display. Costs in this app are typically
 * fractions of a cent, so we show extra precision rather than
 * rounding everything down to "$0.00".
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.000001) return '<$0.000001';
  return `$${cost.toFixed(6)}`;
}

/**
 * Format a raw token count with thousands separators.
 */
export function formatTokenCount(count: number): string {
  return count.toLocaleString('en-US');
}

/**
 * Lightweight, dependency-free token estimate for client-side display
 * BEFORE a request is sent (e.g. in the prompt playground). This is a
 * heuristic (~4 chars per token for English text), not exact -
 * the real count comes back from the API's `usage` field after the call.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Marker tokens used to embed a final JSON usage payload at the end of
 * a plain-text streaming response from /api/suggest. The client looks
 * for these markers to separate the visible AI message from the
 * trailing usage metadata.
 */
export const USAGE_MARKER_START = '__USAGE__';
export const USAGE_MARKER_END = '__END_USAGE__';

export interface StreamedUsagePayload extends TokenUsage {
  systemPrompt: string;
  model: string;
}

/**
 * Serialize a usage payload for appending to the end of a text stream.
 */
export function encodeUsageMarker(payload: StreamedUsagePayload): string {
  return `${USAGE_MARKER_START}${JSON.stringify(payload)}${USAGE_MARKER_END}`;
}
