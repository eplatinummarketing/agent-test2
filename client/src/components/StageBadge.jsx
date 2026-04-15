import React from 'react';
import { DEAL_STAGES } from '../lib/constants';

export default function StageBadge({ stage }) {
  const cfg = DEAL_STAGES[stage] || { label: stage, color: 'text-slate-400', dot: 'bg-slate-500' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      <span className={cfg.color}>{cfg.label}</span>
    </span>
  );
}
