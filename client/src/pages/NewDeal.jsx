import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { dealsApi } from '../lib/api';
import { DEAL_TYPES, DEAL_STAGES, PROPERTY_TYPES } from '../lib/constants';

const TYPE_FIELDS = {
  title:        ['deal_value'],
  brokerage:    ['deal_value', 'cap_rate', 'noi', 'loan_amount'],
  acquisitions: ['deal_value', 'loan_amount', 'equity_amount', 'cap_rate', 'noi'],
  debt:         ['deal_value', 'loan_amount'],
  equity:       ['deal_value', 'equity_amount', 'irr'],
};

function Field({ label, children, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export default function NewDeal() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'acquisitions', stage: 'lead', priority: 'medium',
    property_address: '', property_type: '', description: '',
    deal_value: '', loan_amount: '', equity_amount: '',
    cap_rate: '', noi: '', irr: '', close_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    const val = e.target?.value ?? e;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Deal name is required';
    if (!form.type) errs.type = 'Deal type is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = { ...form };
      ['deal_value','loan_amount','equity_amount','cap_rate','noi','irr'].forEach(f => {
        payload[f] = form[f] !== '' ? parseFloat(form[f]) : null;
      });
      const deal = await dealsApi.create(payload);
      navigate(`/deals/${deal.id}`);
    } finally {
      setSaving(false);
    }
  };

  const relevantFinancials = TYPE_FIELDS[form.type] || [];
  const typeCfg = DEAL_TYPES[form.type] || {};

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Deal</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add a new real estate deal to your pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deal type picker */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Deal Type</h2>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(DEAL_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: key }))}
                className={`py-3 px-2 rounded-xl border-2 text-center transition-all text-sm font-semibold
                  ${form.type === key
                    ? `${cfg.bg} ${cfg.text} ${cfg.border.replace('border-', 'border-2 border-')}`
                    : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                  }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Basic Information</h2>

          <Field label="Deal Name" required>
            <input
              value={form.name}
              onChange={set('name')}
              className={`input ${errors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              placeholder="e.g. Sunset Towers Acquisition"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stage">
              <select value={form.stage} onChange={set('stage')} className="input">
                {Object.entries(DEAL_STAGES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={set('priority')} className="input">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Property Type">
              <select value={form.property_type} onChange={set('property_type')} className="input">
                <option value="">— select —</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Expected Close Date">
              <input type="date" value={form.close_date} onChange={set('close_date')} className="input" />
            </Field>
          </div>

          <Field label="Property Address">
            <input value={form.property_address} onChange={set('property_address')} className="input" placeholder="123 Main St, City, State ZIP" />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} rows={3} className="input resize-none" placeholder="Deal overview, notes, strategy…" />
          </Field>
        </div>

        {/* Financials */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Financial Details
            <span className={`ml-2 text-xs font-normal ${typeCfg.text}`}>
              ({typeCfg.label || form.type} deal)
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {relevantFinancials.includes('deal_value') && (
              <Field label="Deal Value / Purchase Price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input type="number" min="0" step="1000" value={form.deal_value} onChange={set('deal_value')} className="input pl-7" placeholder="0" />
                </div>
              </Field>
            )}
            {relevantFinancials.includes('loan_amount') && (
              <Field label="Loan Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input type="number" min="0" step="1000" value={form.loan_amount} onChange={set('loan_amount')} className="input pl-7" placeholder="0" />
                </div>
              </Field>
            )}
            {relevantFinancials.includes('equity_amount') && (
              <Field label="Equity Amount">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input type="number" min="0" step="1000" value={form.equity_amount} onChange={set('equity_amount')} className="input pl-7" placeholder="0" />
                </div>
              </Field>
            )}
            {relevantFinancials.includes('noi') && (
              <Field label="NOI (Annual)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input type="number" min="0" step="1000" value={form.noi} onChange={set('noi')} className="input pl-7" placeholder="0" />
                </div>
              </Field>
            )}
            {relevantFinancials.includes('cap_rate') && (
              <Field label="Cap Rate (%)">
                <input type="number" min="0" step="0.01" max="100" value={form.cap_rate} onChange={set('cap_rate')} className="input" placeholder="0.00" />
              </Field>
            )}
            {relevantFinancials.includes('irr') && (
              <Field label="Target IRR (%)">
                <input type="number" min="0" step="0.01" max="100" value={form.irr} onChange={set('irr')} className="input" placeholder="0.00" />
              </Field>
            )}
          </div>

          {/* LTV preview */}
          {form.deal_value && form.loan_amount && parseFloat(form.deal_value) > 0 && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg flex items-center gap-4 text-sm">
              <span className="text-slate-500">LTV:</span>
              <span className="font-bold text-blue-400">
                {((parseFloat(form.loan_amount) / parseFloat(form.deal_value)) * 100).toFixed(1)}%
              </span>
              {form.noi && form.deal_value && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-500">Implied Cap Rate:</span>
                  <span className="font-bold text-emerald-400">
                    {((parseFloat(form.noi) / parseFloat(form.deal_value)) * 100).toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pb-6">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
            <Save size={16} /> {saving ? 'Saving…' : 'Create Deal'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-6 py-2.5">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
