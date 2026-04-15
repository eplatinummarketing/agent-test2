import React from 'react';
import { PRIORITIES } from '../lib/constants';

export default function PriorityBadge({ priority }) {
  const cfg = PRIORITIES[priority] || PRIORITIES.medium;
  return (
    <span className={`badge ${cfg.bg} ${cfg.text} border ${cfg.border} text-xs px-2 py-0.5`}>
      {cfg.label}
    </span>
  );
}
