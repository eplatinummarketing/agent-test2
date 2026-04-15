import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Building2, DollarSign, BarChart2,
  ArrowUpRight, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { dealsApi } from '../lib/api';
import {
  DEAL_TYPES, DEAL_STAGES, TYPE_CHART_COLORS, STAGE_CHART_COLORS,
  fmt$, fmtPct, timeAgo
} from '../lib/constants';
import DealTypeBadge from '../components/DealTypeBadge';
import StageBadge from '../components/StageBadge';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue:   'text-blue-400 bg-blue-900/20',
    green:  'text-green-400 bg-green-900/20',
    orange: 'text-orange-400 bg-orange-900/20',
    purple: 'text-purple-400 bg-purple-900/20',
  };
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      {label && <p className="text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('value')
            ? fmt$(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dealsApi.getAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!analytics) return (
    <div className="p-6 text-slate-400">Failed to load analytics.</div>
  );

  const { byType, byStage, totals, recentDeals, monthlyActivity } = analytics;

  const typeData = byType.map(d => ({
    name: DEAL_TYPES[d.type]?.label || d.type,
    type: d.type,
    count: d.count,
    value: d.total_value || 0,
  }));

  const stageData = byStage
    .filter(d => d.stage !== 'dead')
    .map(d => ({
      name: DEAL_STAGES[d.stage]?.label || d.stage,
      stage: d.stage,
      count: d.count,
      value: d.total_value || 0,
    }));

  const monthData = [...(monthlyActivity || [])].reverse().map(m => ({
    month: m.month,
    Deals: m.count,
    Value: m.value || 0,
  }));

  const activeDeals = byStage.filter(d => !['closed_won','dead'].includes(d.stage)).reduce((s,d) => s + d.count, 0);
  const closedDeals = (byStage.find(d => d.stage === 'closed_won') || {}).count || 0;

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Portfolio overview across all deal types</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Building2} label="Active Deals" color="blue"
          value={activeDeals}
          sub={`${closedDeals} closed won`}
        />
        <StatCard
          icon={DollarSign} label="Pipeline Value" color="green"
          value={fmt$(totals?.pipeline_value)}
          sub="Excl. closed & dead"
        />
        <StatCard
          icon={BarChart2} label="Avg Cap Rate" color="orange"
          value={fmtPct(totals?.avg_cap_rate)}
          sub="Active deals"
        />
        <StatCard
          icon={TrendingUp} label="Total Deals" color="purple"
          value={(byType.reduce((s,d) => s + d.count, 0)) || 0}
          sub="All time"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deal Value by Type */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Pipeline Value by Deal Type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt$(v)} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                {typeData.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_CHART_COLORS[entry.type] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stage distribution */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Deals by Stage</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie
                  data={stageData} dataKey="count" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={3}
                >
                  {stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_CHART_COLORS[entry.stage] || '#6b7280'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {stageData.map(d => (
                <div key={d.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STAGE_CHART_COLORS[d.stage] }} />
                    <span className="text-slate-400 text-xs">{d.name}</span>
                  </div>
                  <span className="text-white text-xs font-semibold">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly activity chart */}
      {monthData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Monthly Deal Activity</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155' }} />
              <Area type="monotone" dataKey="Deals" stroke="#3b82f6" fill="url(#colorDeals)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent deals */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Recent Deals</h2>
          <button onClick={() => navigate('/deals')} className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors">
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {recentDeals.map(deal => (
            <button
              key={deal.id}
              onClick={() => navigate(`/deals/${deal.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{deal.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{timeAgo(deal.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <DealTypeBadge type={deal.type} />
                <StageBadge stage={deal.stage} />
                <span className="text-slate-400 text-xs font-medium w-16 text-right">{fmt$(deal.deal_value)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
