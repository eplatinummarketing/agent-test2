export const DEAL_TYPES = {
  title:        { label: 'Title',        color: 'blue',   bg: 'bg-blue-900/40',   text: 'text-blue-300',   border: 'border-blue-700/50' },
  brokerage:    { label: 'Brokerage',    color: 'green',  bg: 'bg-green-900/40',  text: 'text-green-300',  border: 'border-green-700/50' },
  acquisitions: { label: 'Acquisitions', color: 'orange', bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-700/50' },
  debt:         { label: 'Debt',         color: 'purple', bg: 'bg-purple-900/40', text: 'text-purple-300', border: 'border-purple-700/50' },
  equity:       { label: 'Equity',       color: 'pink',   bg: 'bg-pink-900/40',   text: 'text-pink-300',   border: 'border-pink-700/50' },
};

export const DEAL_STAGES = {
  lead:           { label: 'Lead',             order: 0, color: 'text-slate-400',  bg: 'bg-slate-800', dot: 'bg-slate-500' },
  due_diligence:  { label: 'Due Diligence',    order: 1, color: 'text-yellow-300', bg: 'bg-yellow-900/30', dot: 'bg-yellow-400' },
  under_contract: { label: 'Under Contract',   order: 2, color: 'text-blue-300',   bg: 'bg-blue-900/30', dot: 'bg-blue-400' },
  closing:        { label: 'Closing',          order: 3, color: 'text-violet-300', bg: 'bg-violet-900/30', dot: 'bg-violet-400' },
  closed_won:     { label: 'Closed Won',       order: 4, color: 'text-green-300',  bg: 'bg-green-900/30', dot: 'bg-green-400' },
  dead:           { label: 'Dead',             order: 5, color: 'text-red-400',    bg: 'bg-red-900/20', dot: 'bg-red-500' },
};

export const PROPERTY_TYPES = [
  'Multifamily', 'Office', 'Retail', 'Industrial', 'Mixed-Use',
  'Self-Storage', 'Hotel', 'Land', 'Condo', 'Single-Family', 'Other'
];

export const PRIORITIES = {
  high:   { label: 'High',   bg: 'bg-red-900/40',    text: 'text-red-300',    border: 'border-red-700/50' },
  medium: { label: 'Medium', bg: 'bg-yellow-900/40', text: 'text-yellow-300', border: 'border-yellow-700/50' },
  low:    { label: 'Low',    bg: 'bg-slate-800',     text: 'text-slate-400',  border: 'border-slate-700' },
};

export const TYPE_CHART_COLORS = {
  title:        '#60a5fa',
  brokerage:    '#4ade80',
  acquisitions: '#fb923c',
  debt:         '#c084fc',
  equity:       '#f472b6',
};

export const STAGE_CHART_COLORS = {
  lead:           '#64748b',
  due_diligence:  '#fbbf24',
  under_contract: '#60a5fa',
  closing:        '#a78bfa',
  closed_won:     '#4ade80',
  dead:           '#f87171',
};

export function fmt$(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function fmtFull$(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export function fmtPct(n) {
  if (n == null) return '—';
  return `${Number(n).toFixed(2)}%`;
}

export function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
