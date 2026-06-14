'use client';

import { useState } from 'react';
import { PROMPT_STRATEGIES, calculateCost, formatCost, formatTokenCount, type PromptContext } from '@/lib/tokens';
import type { PlaygroundResult } from '@/app/api/playground/route';

interface Props {
  context: PromptContext;
  isOpen: boolean;
  onClose: () => void;
}

function ScoreBar({ value }: { value: number }) {
  const pct = ((value ?? 0) / 5) * 100;
  const color = value >= 4 ? 'bg-teal-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-stone-700">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-stone-400 w-4">{value ?? 0}</span>
    </div>
  );
}

export default function PromptPlayground({ context, isOpen, onClose }: Props) {
  const [results, setResults] = useState<Record<string, PlaygroundResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const runStrategy = async (strategyId: string) => {
    setLoading(prev => ({ ...prev, [strategyId]: true }));
    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId, context }),
      });
      const data = await res.json();
      console.log('Playground result:', data);
      setResults(prev => ({ ...prev, [strategyId]: data }));
    } catch (e) {
      console.error('Playground error:', e);
    } finally {
      setLoading(prev => ({ ...prev, [strategyId]: false }));
    }
  };

  const runAll = () => {
    PROMPT_STRATEGIES.forEach(s => runStrategy(s.id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-stone-900 w-full sm:max-w-2xl sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700 shrink-0">
          <div>
            <h2 className="text-white font-semibold">Prompt Playground</h2>
            <p className="text-stone-400 text-xs font-mono mt-0.5">Compare prompt strategies · token cost · quality score</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Context summary */}
          <div className="bg-stone-800 rounded-xl px-4 py-3 text-xs font-mono text-stone-400 space-y-0.5">
            <p className="text-stone-300 font-medium text-[11px] uppercase tracking-wide mb-1">Current context</p>
            <p>~{Math.round(context.remainingCalories ?? 0)} kcal · {Math.round(context.remainingProtein ?? 0)}g protein · {Math.round(context.remainingCarbs ?? 0)}g carbs · {Math.round(context.remainingFat ?? 0)}g fat remaining</p>
            <p>{context.loggedFoods?.length > 0 ? `Logged: ${context.loggedFoods.join(', ')}` : 'Nothing logged yet'}</p>
          </div>

          {/* Run all button */}
          <button
            onClick={runAll}
            disabled={Object.values(loading).some(Boolean)}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-sm font-medium transition"
          >
            {Object.values(loading).some(Boolean) ? 'Running all strategies…' : 'Run all 3 strategies'}
          </button>

          {/* Strategy cards */}
          <div className="space-y-3">
            {PROMPT_STRATEGIES.map(strategy => {
              const result = results[strategy.id];
              const isLoading = loading[strategy.id];
              const inputTokens = result?.inputTokens ?? 0;
              const outputTokens = result?.outputTokens ?? 0;
              const cost = result ? calculateCost({ inputTokens, outputTokens }) : null;

              return (
                <div key={strategy.id} className="bg-stone-800 rounded-xl overflow-hidden border border-stone-700">
                  {/* Strategy header */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{strategy.name}</p>
                      <p className="text-stone-500 text-xs mt-0.5">{strategy.description}</p>
                    </div>
                    <button
                      onClick={() => runStrategy(strategy.id)}
                      disabled={isLoading}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-stone-300 text-xs font-medium transition"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-stone-500 border-t-teal-400 rounded-full animate-spin" />
                          Running…
                        </span>
                      ) : result ? 'Re-run' : 'Run'}
                    </button>
                  </div>

                  {/* Results */}
                  {result && (
                    <div className="border-t border-stone-700 px-4 py-3 space-y-3">
                      {/* Token + cost stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-stone-900 rounded-lg px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-stone-500">Input tok</p>
                          <p className="text-stone-200 text-sm font-mono">{formatTokenCount(inputTokens)}</p>
                        </div>
                        <div className="bg-stone-900 rounded-lg px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-stone-500">Output tok</p>
                          <p className="text-stone-200 text-sm font-mono">{formatTokenCount(outputTokens)}</p>
                        </div>
                        <div className="bg-stone-900 rounded-lg px-2 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-stone-500">Cost</p>
                          <p className="text-teal-400 text-sm font-mono">{cost ? formatCost(cost.totalCost) : '—'}</p>
                        </div>
                      </div>

                      {/* Score bars */}
                      {result.score && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] uppercase tracking-wide text-stone-500">Quality score</p>
                            <span className="text-teal-400 text-xs font-semibold">★ {result.score.overall ?? '—'}</span>
                          </div>
                          <div className="space-y-1">
                            {(['relevance', 'specificity', 'tone'] as const).map(axis => (
                              <div key={axis} className="flex items-center gap-2">
                                <span className="text-[10px] text-stone-500 w-16 capitalize">{axis}</span>
                                <ScoreBar value={result.score[axis] ?? 0} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable response */}
                      <div>
                        <button
                          onClick={() => setExpandedResponse(expandedResponse === strategy.id ? null : strategy.id)}
                          className="text-[11px] text-teal-400 hover:text-teal-300"
                        >
                          {expandedResponse === strategy.id ? 'Hide response ▾' : 'View response ▸'}
                        </button>
                        {expandedResponse === strategy.id && (
                          <p className="mt-2 text-stone-300 text-xs leading-relaxed whitespace-pre-wrap bg-stone-900 rounded-lg p-3">
                            {result.response}
                          </p>
                        )}
                      </div>

                      {/* Expandable system prompt */}
                      <div>
                        <button
                          onClick={() => setExpandedPrompt(expandedPrompt === strategy.id ? null : strategy.id)}
                          className="text-[11px] text-stone-500 hover:text-stone-400"
                        >
                          {expandedPrompt === strategy.id ? 'Hide system prompt ▾' : 'View system prompt ▸'}
                        </button>
                        {expandedPrompt === strategy.id && (
                          <pre className="mt-2 text-[10px] text-stone-400 leading-relaxed whitespace-pre-wrap bg-stone-950 rounded-lg p-3 font-mono max-h-32 overflow-auto">
                            {result.systemPrompt}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison table — shown once all 3 have results */}
          {Object.keys(results).length === 3 && (
            <div className="bg-stone-800 rounded-xl overflow-hidden border border-stone-700">
              <p className="px-4 py-3 text-xs font-medium text-stone-300 border-b border-stone-700">Side-by-side comparison</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="px-4 py-2 text-left text-stone-500 font-normal">Strategy</th>
                      <th className="px-3 py-2 text-right text-stone-500 font-normal">Tokens</th>
                      <th className="px-3 py-2 text-right text-stone-500 font-normal">Cost</th>
                      <th className="px-3 py-2 text-right text-stone-500 font-normal">★ Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROMPT_STRATEGIES.map(s => {
                      const r = results[s.id];
                      if (!r) return null;
                      const inp = r.inputTokens ?? 0;
                      const out = r.outputTokens ?? 0;
                      const c = calculateCost({ inputTokens: inp, outputTokens: out });
                      const allCosts = Object.values(results).map(x => calculateCost({ inputTokens: x.inputTokens ?? 0, outputTokens: x.outputTokens ?? 0 }).totalCost);
                      const allScores = Object.values(results).map(x => x.score?.overall ?? 0);
                      const lowestCost = Math.min(...allCosts);
                      const bestScore = Math.max(...allScores);
                      return (
                        <tr key={s.id} className="border-b border-stone-700/50 last:border-0">
                          <td className="px-4 py-2.5 text-stone-300 font-medium">{s.name}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-stone-400">{formatTokenCount(inp + out)}</td>
                          <td className={`px-3 py-2.5 text-right font-mono ${c.totalCost === lowestCost ? 'text-teal-400 font-semibold' : 'text-stone-400'}`}>
                            {formatCost(c.totalCost)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono ${(r.score?.overall ?? 0) === bestScore ? 'text-teal-400 font-semibold' : 'text-stone-400'}`}>
                            {r.score?.overall ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}