const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');

const router = express.Router();

// GET all deals
router.get('/', (req, res) => {
  const db = getDb();
  const deals = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM contacts WHERE deal_id = d.id) as contact_count,
      (SELECT COUNT(*) FROM notes WHERE deal_id = d.id) as note_count,
      (SELECT COUNT(*) FROM documents WHERE deal_id = d.id) as document_count
    FROM deals d
    ORDER BY d.updated_at DESC
  `).all();
  res.json(deals);
});

// GET single deal with related data
router.get('/:id', (req, res) => {
  const db = getDb();
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });

  const contacts = db.prepare('SELECT * FROM contacts WHERE deal_id = ? ORDER BY created_at').all(req.params.id);
  const notes = db.prepare('SELECT * FROM notes WHERE deal_id = ? ORDER BY created_at DESC').all(req.params.id);
  const documents = db.prepare('SELECT * FROM documents WHERE deal_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.json({ ...deal, contacts, notes, documents });
});

// POST create deal
router.post('/', (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const {
    name, type, stage = 'lead', property_address, property_type,
    deal_value, loan_amount, equity_amount, cap_rate, noi, irr,
    close_date, description, priority = 'medium'
  } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  const stmt = db.prepare(`
    INSERT INTO deals (id, name, type, stage, property_address, property_type,
      deal_value, loan_amount, equity_amount, cap_rate, noi, irr,
      close_date, description, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, type, stage, property_address, property_type,
    deal_value, loan_amount, equity_amount, cap_rate, noi, irr,
    close_date, description, priority);

  res.status(201).json(db.prepare('SELECT * FROM deals WHERE id = ?').get(id));
});

// PUT update deal
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deal not found' });

  const fields = ['name','type','stage','property_address','property_type',
    'deal_value','loan_amount','equity_amount','cap_rate','noi','irr',
    'close_date','description','priority'];

  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  updates['updated_at'] = new Date().toISOString();

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];

  db.prepare(`UPDATE deals SET ${setClauses} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id));
});

// PATCH update stage only (for kanban drag-drop)
router.patch('/:id/stage', (req, res) => {
  const db = getDb();
  const { stage } = req.body;
  if (!stage) return res.status(400).json({ error: 'stage is required' });

  const result = db.prepare(
    `UPDATE deals SET stage = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(stage, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id));
});

// DELETE deal
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Deal not found' });
  res.json({ success: true });
});

// --- CONTACTS ---
router.post('/:id/contacts', (req, res) => {
  const db = getDb();
  const { name, role, email, phone, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO contacts (id, deal_id, name, role, email, phone, company)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, req.params.id, name, role, email, phone, company);
  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
});

router.delete('/:dealId/contacts/:contactId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM contacts WHERE id = ? AND deal_id = ?').run(req.params.contactId, req.params.dealId);
  res.json({ success: true });
});

// --- NOTES ---
router.post('/:id/notes', (req, res) => {
  const db = getDb();
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const id = uuidv4();
  db.prepare('INSERT INTO notes (id, deal_id, content) VALUES (?, ?, ?)').run(id, req.params.id, content);
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
});

router.delete('/:dealId/notes/:noteId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ? AND deal_id = ?').run(req.params.noteId, req.params.dealId);
  res.json({ success: true });
});

// GET analytics
router.get('/meta/analytics', (req, res) => {
  const db = getDb();

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count, SUM(deal_value) as total_value
    FROM deals GROUP BY type
  `).all();

  const byStage = db.prepare(`
    SELECT stage, COUNT(*) as count, SUM(deal_value) as total_value
    FROM deals GROUP BY stage
  `).all();

  const totals = db.prepare(`
    SELECT COUNT(*) as total_deals, SUM(deal_value) as pipeline_value,
      AVG(cap_rate) as avg_cap_rate
    FROM deals WHERE stage NOT IN ('closed_won','dead')
  `).get();

  const recentDeals = db.prepare(`
    SELECT id, name, type, stage, deal_value, created_at
    FROM deals ORDER BY created_at DESC LIMIT 5
  `).all();

  const monthlyActivity = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(deal_value) as value
    FROM deals
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC LIMIT 12
  `).all();

  res.json({ byType, byStage, totals, recentDeals, monthlyActivity });
});

module.exports = router;
