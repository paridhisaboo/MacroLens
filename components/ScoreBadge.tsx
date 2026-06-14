'use client';

import { useState } from 'react';
import type { SuggestionScore } from '@/lib/tokens';

interface ScoreBadgeProps {
  score: SuggestionScore;
}

function scoreColor(val: number): string {
  if (val >= 4.5) return 'text-teal-400';
  if (val >= 3.5) return 'text-teal-500';
  if (val >= 2.5) return 'text-yellow-400';
  return 'text-red-400';
}

function ScoreBar({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? 'bg-teal-500' : value >= 3 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-stone-700">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-stone-400 w-6 text-right">{value}</span>
    </div>
  );
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1.5 ml-1">
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition"
      >
        <span className={`font-semibold ${scoreColor(score.overall)}`}>★ {score.overall}</span>
        <span>quality score</span>
        <span className="text-stone-600">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl bg-stone-950 border border-stone-700 px-3 py-3 space-y-3 text-xs">
          <div className="space-y-2">
            {(['relevance', 'specificity', 'tone'] as const).map(axis => (
              <div key={axis} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 font-medium capitalize">{axis}</span>
                </div>
                <ScoreBar value={score[axis]} />
                <p className="text-stone-500 leading-relaxed">{score.reasons[axis]}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-700 pt-2 text-[10px] text-stone-600 font-mono">
            scorer: {score.inputTokens} in · {score.outputTokens} out · claude-haiku-4-5
          </div>
        </div>
      )}
    </div>
  );
}