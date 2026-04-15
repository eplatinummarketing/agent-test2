import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, SlidersHorizontal, ArrowUpDown, Trash2 } from 'lucide-react';
import { dealsApi } from '../lib/api';
import { DEAL_TYPES, DEAL_STAGES, fmt$, fmtPct, timeAgo } from '../lib/constants';
import DealTypeBadge from '../components/DealTypeBadge';
import StageBadge from '../components/StageBadge';
import PriorityBadge from '../components/PriorityBadge';
import EmptyState from '../components/EmptyState';
import { Building2 } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'deal_value', label: 'Deal Value' },
  { value: 'name', label: 'Name' },
];

export default function DealList() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    dealsApi.getAll().then(d => { setDeals(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this deal?')) return;
    await dealsApi.delete(id);
    setDeals(prev => prev.filter(d => d.id !== id));
  };

  const filtered = deals
    .filter(d => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (d.name?.toLowerCase().includes(q) ||
          d.property_address?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deal_value') return (b.deal_value || 0) - (a.deal_value || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    });

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Deals</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} of {deals.length} deals</p>
        </div>
        <button onClick={() => navigate('/deals/new')} className="btn-primary">
          <PlusCircle size={16} /> New Deal
        </button>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search deals, addresses…"
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`btn-secondary ${showFilters ? 'bg-slate-700 text-white' : ''}`}
        >
          <SlidersHorizontal size={15} /> Filters
        </button>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-slate-500" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="input w-auto bg-slate-800"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-3 flex-wrap p-4 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex-1 min-w-[160px]">
            <label className="label">Deal Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input">
              <option value="all">All Types</option>
              {Object.entries(DEAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="label">Stage</label>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="input">
              <option value="all">All Stages</option>
              {Object.entries(DEAL_STAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No deals found"
          description={search || typeFilter !== 'all' || stageFilter !== 'all' ? "Try adjusting your filters" : "Add your first real estate deal to get started"}
          action={
            <button onClick={() => navigate('/deals/new')} className="btn-primary">
              <PlusCircle size={16} /> New Deal
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Deal</th>
                  <th className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Stage</th>
                  <th className="text-right px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Deal Value</th>
                  <th className="text-right px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Cap Rate</th>
                  <th className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(deal => (
                  <tr
                    key={deal.id}
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200 group-hover:text-white transition-colors">{deal.name}</p>
                        {deal.property_address && (
                          <p className="text-xs text-slate-500 truncate max-w-[260px]">{deal.property_address}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><DealTypeBadge type={deal.type} /></td>
                    <td className="px-4 py-3"><StageBadge stage={deal.stage} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">{fmt$(deal.deal_value)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{fmtPct(deal.cap_rate)}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={deal.priority} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(deal.updated_at || deal.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => handleDelete(e, deal.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
