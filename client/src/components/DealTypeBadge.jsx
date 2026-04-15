import React from 'react';
import { DEAL_TYPES } from '../lib/constants';

export default function DealTypeBadge({ type, size = 'sm' }) {
  const cfg = DEAL_TYPES[type] || { label: type, bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`badge ${cfg.bg} ${cfg.text} border ${cfg.border} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}
