const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/schema');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  }
});

// Upload document for a deal
router.post('/:dealId', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const db = getDb();
  const id = uuidv4();
  const { dealId } = req.params;

  db.prepare(`
    INSERT INTO documents (id, deal_id, filename, original_name, file_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, dealId, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype);

  res.status(201).json(db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
});

// Get documents for a deal
router.get('/:dealId', (req, res) => {
  const db = getDb();
  const docs = db.prepare('SELECT * FROM documents WHERE deal_id = ? ORDER BY created_at DESC').all(req.params.dealId);
  res.json(docs);
});

// Delete a document
router.delete('/:dealId/:docId', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND deal_id = ?').get(req.params.docId, req.params.dealId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.docId);
  res.json({ success: true });
});

// Download a document
router.get('/:dealId/:docId/download', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND deal_id = ?').get(req.params.docId, req.params.dealId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  res.download(filePath, doc.original_name);
});

module.exports = router;
