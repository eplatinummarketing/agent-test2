import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PlusCircle, GripVertical, ExternalLink, DollarSign } from 'lucide-react';
import { dealsApi } from '../lib/api';
import { DEAL_STAGES, DEAL_TYPES, fmt$, timeAgo } from '../lib/constants';
import DealTypeBadge from '../components/DealTypeBadge';
import PriorityBadge from '../components/PriorityBadge';

const STAGE_KEYS = ['lead', 'due_diligence', 'under_contract', 'closing', 'closed_won', 'dead'];

function DealCard({ deal, index, onClick }) {
  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card-hover p-3.5 cursor-pointer select-none transition-all
            ${snapshot.isDragging ? 'shadow-2xl shadow-black/50 ring-1 ring-blue-500/40 rotate-1 scale-105' : ''}
          `}
          onClick={() => onClick(deal.id)}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 leading-snug line-clamp-2">{deal.name}</p>
            </div>
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 text-slate-700 hover:text-slate-500 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </div>
          </div>

          {deal.property_address && (
            <p className="text-xs text-slate-500 mb-2 truncate">{deal.property_address}</p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <DealTypeBadge type={deal.type} />
            <PriorityBadge priority={deal.priority} />
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <DollarSign size={11} />
              {fmt$(deal.deal_value)}
            </div>
            <span className="text-slate-600 text-xs">{timeAgo(deal.updated_at || deal.created_at)}</span>
          </div>

          {(deal.note_count > 0 || deal.contact_count > 0) && (
            <div className="flex items-center gap-3 mt-1.5 text-slate-600 text-xs">
              {deal.contact_count > 0 && <span>{deal.contact_count} contact{deal.contact_count > 1 ? 's' : ''}</span>}
              {deal.note_count > 0 && <span>{deal.note_count} note{deal.note_count > 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function Column({ stageKey, deals, onCardClick }) {
  const cfg = DEAL_STAGES[stageKey];
  const totalValue = deals.reduce((s, d) => s + (d.deal_value || 0), 0);

  return (
    <div className="flex flex-col min-w-[250px] max-w-[280px] w-[268px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
          <span className="bg-slate-800 text-slate-400 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-slate-500 text-xs font-medium">{fmt$(totalValue)}</span>
        )}
      </div>

      {/* Droppable zone */}
      <Droppable droppableId={stageKey}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[120px] space-y-2 px-1 py-1 rounded-xl transition-colors duration-150
              ${snapshot.isDraggingOver ? 'bg-blue-950/30 ring-1 ring-blue-800/40' : ''}
            `}
          >
            {deals.map((deal, idx) => (
              <DealCard key={deal.id} deal={deal} index={idx} onClick={onCardClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const navigate = useNavigate();

  const load = useCallback(() => {
    dealsApi.getAll().then(d => { setDeals(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDragEnd = useCallback(async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId;
    setDeals(prev => prev.map(d => d.id === draggableId ? { ...d, stage: newStage } : d));
    try {
      await dealsApi.updateStage(draggableId, newStage);
    } catch {
      load(); // revert on error
    }
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const filtered = typeFilter === 'all' ? deals : deals.filter(d => d.type === typeFilter);
  const grouped = {};
  STAGE_KEYS.forEach(k => { grouped[k] = filtered.filter(d => d.stage === k); });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-slate-500 text-xs mt-0.5">Drag cards to update stage</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
            >
              All
            </button>
            {Object.entries(DEAL_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${typeFilter === key ? `${cfg.bg} ${cfg.text}` : 'text-slate-400 hover:text-slate-300'}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/deals/new')} className="btn-primary">
            <PlusCircle size={16} /> New Deal
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 px-6 py-4 h-full items-start min-w-max">
            {STAGE_KEYS.map(stage => (
              <Column
                key={stage}
                stageKey={stage}
                deals={grouped[stage] || []}
                onCardClick={(id) => navigate(`/deals/${id}`)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
