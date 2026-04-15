import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, Trash2, Plus, MapPin, DollarSign,
  TrendingUp, Users, MessageSquare, FileText, Upload, Download,
  ChevronDown, Phone, Mail, Building, Clock, AlertCircle
} from 'lucide-react';
import { dealsApi, documentsApi } from '../lib/api';
import {
  DEAL_TYPES, DEAL_STAGES, PROPERTY_TYPES,
  fmtFull$, fmtPct, timeAgo
} from '../lib/constants';
import DealTypeBadge from '../components/DealTypeBadge';
import StageBadge from '../components/StageBadge';
import PriorityBadge from '../components/PriorityBadge';

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: TrendingUp },
  { key: 'contacts',   label: 'Contacts',   icon: Users },
  { key: 'notes',      label: 'Notes',      icon: MessageSquare },
  { key: 'documents',  label: 'Documents',  icon: FileText },
];

function FinancialRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/70 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function EditableField({ label, value, type = 'text', options, onChange, prefix }) {
  return (
    <div>
      <label className="label">{label}</label>
      {options ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} className="input">
          <option value="">— select —</option>
          {options.map(o => (
            <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>
              {typeof o === 'object' ? o.label : o}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
          <input
            type={type}
            value={value || ''}
            onChange={e => onChange(type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value)}
            className={`input ${prefix ? 'pl-7' : ''}`}
          />
        </div>
      )}
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '', company: '' });
  const [addingContact, setAddingContact] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  const load = useCallback(() => {
    dealsApi.getOne(id).then(d => {
      setDeal(d);
      setEditData(d);
      setLoading(false);
    }).catch(() => navigate('/deals'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await dealsApi.update(id, editData);
      setDeal(prev => ({ ...prev, ...updated }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${deal.name}"? This cannot be undone.`)) return;
    await dealsApi.delete(id);
    navigate('/deals');
  };

  const handleStageChange = async (stage) => {
    const updated = await dealsApi.updateStage(id, stage);
    setDeal(prev => ({ ...prev, ...updated }));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = await dealsApi.addNote(id, { content: newNote });
    setDeal(prev => ({ ...prev, notes: [note, ...(prev.notes || [])] }));
    setNewNote('');
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId) => {
    await dealsApi.deleteNote(id, noteId);
    setDeal(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== noteId) }));
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    const contact = await dealsApi.addContact(id, newContact);
    setDeal(prev => ({ ...prev, contacts: [...(prev.contacts || []), contact] }));
    setNewContact({ name: '', role: '', email: '', phone: '', company: '' });
    setAddingContact(false);
  };

  const handleDeleteContact = async (contactId) => {
    await dealsApi.deleteContact(id, contactId);
    setDeal(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== contactId) }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await documentsApi.upload(id, file);
      setDeal(prev => ({ ...prev, documents: [doc, ...(prev.documents || [])] }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    await documentsApi.delete(id, docId);
    setDeal(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== docId) }));
  };

  const set = (field) => (val) => setEditData(prev => ({ ...prev, [field]: val }));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!deal) return null;

  const typeCfg = DEAL_TYPES[deal.type] || {};
  const stageCfg = DEAL_STAGES[deal.stage] || {};

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Top bar */}
      <div className={`flex-shrink-0 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-5`}>
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="mt-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editData.name || ''}
                onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 text-white w-full outline-none pb-1"
                autoFocus
              />
            ) : (
              <h1 className="text-2xl font-bold text-white truncate">{deal.name}</h1>
            )}
            {deal.property_address && (
              <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                <MapPin size={13} />
                <span>{deal.property_address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <DealTypeBadge type={deal.type} size="md" />
              <PriorityBadge priority={deal.priority} />
              {deal.property_type && (
                <span className="badge bg-slate-800 text-slate-400 border border-slate-700 text-xs px-2 py-0.5">{deal.property_type}</span>
              )}
            </div>
          </div>

          {/* Stage selector */}
          <div className="flex-shrink-0">
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${stageCfg.bg || 'bg-slate-800'} ${stageCfg.color || 'text-slate-300'} border-slate-700 hover:border-slate-600`}>
                <span className={`w-2 h-2 rounded-full ${stageCfg.dot}`} />
                {stageCfg.label}
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-10 overflow-hidden hidden group-hover:block">
                {Object.entries(DEAL_STAGES).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleStageChange(key)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-800 ${deal.stage === key ? 'bg-slate-800' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={cfg.color}>{cfg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  <Save size={15} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditData(deal); }} className="btn-secondary">
                  <X size={15} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary">
                  <Edit3 size={15} /> Edit
                </button>
                <button onClick={handleDelete} className="btn-danger">
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-px">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${tab === key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`}
            >
              <Icon size={14} />
              {label}
              {key === 'contacts' && deal.contacts?.length > 0 && (
                <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{deal.contacts.length}</span>
              )}
              {key === 'notes' && deal.notes?.length > 0 && (
                <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{deal.notes.length}</span>
              )}
              {key === 'documents' && deal.documents?.length > 0 && (
                <span className="bg-slate-800 text-slate-400 text-xs px-1.5 rounded-full">{deal.documents.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financials */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <DollarSign size={15} className="text-emerald-400" /> Financial Details
                </h3>
                {editing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Deal Value" value={editData.deal_value} type="number" prefix="$" onChange={set('deal_value')} />
                    <EditableField label="Loan Amount" value={editData.loan_amount} type="number" prefix="$" onChange={set('loan_amount')} />
                    <EditableField label="Equity Amount" value={editData.equity_amount} type="number" prefix="$" onChange={set('equity_amount')} />
                    <EditableField label="NOI" value={editData.noi} type="number" prefix="$" onChange={set('noi')} />
                    <EditableField label="Cap Rate (%)" value={editData.cap_rate} type="number" onChange={set('cap_rate')} />
                    <EditableField label="Target IRR (%)" value={editData.irr} type="number" onChange={set('irr')} />
                    <EditableField label="Expected Close Date" value={editData.close_date} type="date" onChange={set('close_date')} />
                  </div>
                ) : (
                  <div>
                    <FinancialRow label="Deal Value" value={fmtFull$(deal.deal_value)} highlight />
                    <FinancialRow label="Loan Amount" value={fmtFull$(deal.loan_amount)} />
                    <FinancialRow label="Equity Amount" value={fmtFull$(deal.equity_amount)} />
                    <FinancialRow label="Net Operating Income" value={fmtFull$(deal.noi)} />
                    <FinancialRow label="Cap Rate" value={fmtPct(deal.cap_rate)} />
                    <FinancialRow label="Target IRR" value={fmtPct(deal.irr)} />
                    {deal.deal_value && deal.noi && (
                      <FinancialRow label="Debt Coverage (est.)" value={
                        deal.loan_amount
                          ? `${((deal.noi) / (deal.loan_amount * 0.065)).toFixed(2)}x`
                          : '—'
                      } />
                    )}
                    {deal.close_date && (
                      <FinancialRow label="Expected Close" value={new Date(deal.close_date).toLocaleDateString()} />
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Description</h3>
                {editing ? (
                  <textarea
                    value={editData.description || ''}
                    onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="input resize-none"
                    placeholder="Deal notes and description…"
                  />
                ) : (
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {deal.description || <span className="text-slate-600 italic">No description</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Deal Info</h3>
                {editing ? (
                  <div className="space-y-3">
                    <EditableField label="Deal Type" value={editData.type} options={Object.entries(DEAL_TYPES).map(([k,v]) => ({ value: k, label: v.label }))} onChange={set('type')} />
                    <EditableField label="Priority" value={editData.priority} options={['high','medium','low']} onChange={set('priority')} />
                    <EditableField label="Property Type" value={editData.property_type} options={PROPERTY_TYPES} onChange={set('property_type')} />
                    <EditableField label="Property Address" value={editData.property_address} onChange={set('property_address')} />
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Type</span>
                      <DealTypeBadge type={deal.type} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Priority</span>
                      <PriorityBadge priority={deal.priority} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Stage</span>
                      <StageBadge stage={deal.stage} />
                    </div>
                    {deal.property_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Property Type</span>
                        <span className="text-slate-300">{deal.property_type}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Added</span>
                      <span className="text-slate-400 text-xs">{timeAgo(deal.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Updated</span>
                      <span className="text-slate-400 text-xs">{timeAgo(deal.updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              {!editing && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Activity</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { val: deal.contacts?.length || 0, label: 'Contacts' },
                      { val: deal.notes?.length || 0,    label: 'Notes' },
                      { val: deal.documents?.length || 0, label: 'Docs' },
                    ].map(({ val, label }) => (
                      <div key={label} className="bg-slate-800 rounded-lg py-2.5">
                        <p className="text-lg font-bold text-white">{val}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTACTS */}
        {tab === 'contacts' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Contacts</h3>
              <button onClick={() => setAddingContact(true)} className="btn-primary">
                <Plus size={15} /> Add Contact
              </button>
            </div>

            {addingContact && (
              <div className="card p-4 border-blue-800/40 space-y-3">
                <h4 className="text-sm font-medium text-slate-300">New Contact</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Name *</label><input className="input" value={newContact.name} onChange={e => setNewContact(p => ({...p, name: e.target.value}))} placeholder="Full name" /></div>
                  <div><label className="label">Role</label><input className="input" value={newContact.role} onChange={e => setNewContact(p => ({...p, role: e.target.value}))} placeholder="e.g. Seller Broker" /></div>
                  <div><label className="label">Email</label><input className="input" type="email" value={newContact.email} onChange={e => setNewContact(p => ({...p, email: e.target.value}))} placeholder="email@example.com" /></div>
                  <div><label className="label">Phone</label><input className="input" value={newContact.phone} onChange={e => setNewContact(p => ({...p, phone: e.target.value}))} placeholder="(555) 000-0000" /></div>
                  <div className="col-span-2"><label className="label">Company</label><input className="input" value={newContact.company} onChange={e => setNewContact(p => ({...p, company: e.target.value}))} placeholder="Company name" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddContact} className="btn-primary"><Save size={14} /> Save</button>
                  <button onClick={() => setAddingContact(false)} className="btn-secondary"><X size={14} /> Cancel</button>
                </div>
              </div>
            )}

            {deal.contacts?.length === 0 && !addingContact && (
              <div className="card p-8 text-center">
                <Users size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No contacts yet</p>
              </div>
            )}

            {deal.contacts?.map(contact => (
              <div key={contact.id} className="card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-900/40 border border-blue-800/40 flex items-center justify-center flex-shrink-0 text-blue-300 font-bold text-sm">
                  {contact.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{contact.name}</p>
                      {contact.role && <p className="text-xs text-blue-400">{contact.role}</p>}
                    </div>
                    <button onClick={() => handleDeleteContact(contact.id)} className="text-slate-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-300 transition-colors">
                        <Mail size={12} />{contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-300 transition-colors">
                        <Phone size={12} />{contact.phone}
                      </a>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Building size={12} />{contact.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {tab === 'notes' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Notes</h3>
              <button onClick={() => setAddingNote(true)} className="btn-primary">
                <Plus size={15} /> Add Note
              </button>
            </div>

            {addingNote && (
              <div className="card p-4 border-blue-800/40 space-y-3">
                <textarea
                  autoFocus
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={4}
                  placeholder="Write your note…"
                  className="input resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddNote} className="btn-primary"><Save size={14} /> Save</button>
                  <button onClick={() => { setAddingNote(false); setNewNote(''); }} className="btn-secondary"><X size={14} /> Cancel</button>
                </div>
              </div>
            )}

            {deal.notes?.length === 0 && !addingNote && (
              <div className="card p-8 text-center">
                <MessageSquare size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notes yet</p>
              </div>
            )}

            {deal.notes?.map(note => (
              <div key={note.id} className="card p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-slate-300 text-sm leading-relaxed flex-1">{note.content}</p>
                  <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all p-1 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-slate-600 text-xs">
                  <Clock size={11} /> {timeAgo(note.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'documents' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Documents</h3>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary">
                <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload File'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
                accept=".pdf,.docx,.jpg,.jpeg,.png,.txt" />
            </div>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-700/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const synth = { target: { files: [file] } };
                  handleFileUpload(synth);
                }
              }}
            >
              <Upload size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Drop files here or click to upload</p>
              <p className="text-slate-600 text-xs mt-1">PDF, DOCX, JPG, PNG up to 20MB</p>
            </div>

            {deal.documents?.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">No documents uploaded</p>
            )}

            {deal.documents?.map(doc => (
              <div key={doc.id} className="card p-4 flex items-center gap-4 group">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{doc.original_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB · ` : ''}
                    {timeAgo(doc.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={documentsApi.getDownloadUrl(id, doc.id)}
                    className="text-slate-500 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download size={15} />
                  </a>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-slate-800">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
