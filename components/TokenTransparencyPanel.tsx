'use client';

import { useState } from 'react';
import { calculateCost, formatCost, formatTokenCount, type TokenUsage } from '@/lib/tokens';

export interface LastRequestUsage extends TokenUsage {
  systemPrompt: string;
  model: string;
}

export interface SessionUsage extends TokenUsage {
  requestCount: number;
}

interface TokenTransparencyPanelProps {
  lastRequest: LastRequestUsage | null;
  session: SessionUsage;
}

/**
 * Collapsible panel that shows exactly what the AI suggestion feature
 * sent/received: token counts, estimated cost, and the raw system
 * prompt. Designed to sit at the bottom of AISuggestions.tsx's
 * slide-in panel.
 */
export default function TokenTransparencyPanel({ lastRequest, session }: TokenTransparencyPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const lastCost = lastRequest ? calculateCost(lastRequest) : null;
  const sessionCost = calculateCost(session);

  return (
    <div className="border-t border-gray-200 bg-gray-50 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-gray-600 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">Token usage</span>
          {lastRequest && (
            <span className="text-xs text-gray-400">
              last: {formatTokenCount(lastRequest.inputTokens + lastRequest.outputTokens)} tok ·{' '}
              {lastCost ? formatCost(lastCost.totalCost) : '$0'}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {lastRequest ? (
            <div className="grid grid-cols-2 gap-2">
              <UsageStat label="Input tokens" value={formatTokenCount(lastRequest.inputTokens)} />
              <UsageStat label="Output tokens" value={formatTokenCount(lastRequest.outputTokens)} />
              <UsageStat
                label="Input cost"
                value={lastCost ? formatCost(lastCost.inputCost) : '$0.00'}
              />
              <UsageStat
                label="Output cost"
                value={lastCost ? formatCost(lastCost.outputCost) : '$0.00'}
              />
              <UsageStat
                label="Total (last reply)"
                value={lastCost ? formatCost(lastCost.totalCost) : '$0.00'}
                emphasize
              />
              <UsageStat label="Model" value={lastRequest.model} />
            </div>
          ) : (
            <p className="text-gray-400 text-xs">
              Ask the AI for a suggestion to see token usage and cost for that request.
            </p>
          )}

          <div className="border-t border-gray-200 pt-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Session total ({session.requestCount} request{session.requestCount === 1 ? '' : 's'})</p>
            <div className="grid grid-cols-2 gap-2">
              <UsageStat label="Total tokens" value={formatTokenCount(session.inputTokens + session.outputTokens)} />
              <UsageStat label="Total cost" value={formatCost(sessionCost.totalCost)} emphasize />
            </div>
          </div>

          {lastRequest && (
            <div className="border-t border-gray-200 pt-2">
              <button
                type="button"
                onClick={() => setShowPrompt((prev) => !prev)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showPrompt ? 'Hide system prompt' : 'View system prompt sent to Claude'}
              </button>
              {showPrompt && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-900 p-2 text-[11px] leading-relaxed text-gray-100 whitespace-pre-wrap">
                  {lastRequest.systemPrompt}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UsageStat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded bg-white px-2 py-1.5 border border-gray-100">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={emphasize ? 'font-semibold text-gray-800' : 'text-gray-700'}>{value}</p>
    </div>
  );
}
