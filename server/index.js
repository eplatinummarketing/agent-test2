const express = require('express');
const cors = require('cors');
const path = require('path');

const dealsRouter = require('./routes/deals');
const documentsRouter = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed demo data on first run
const { getDb } = require('./db/schema');
const { v4: uuidv4 } = require('uuid');

function seedDemoData() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as n FROM deals').get();
  if (count.n > 0) return;

  const demos = [
    { id: uuidv4(), name: 'Sunset Towers Acquisition', type: 'acquisitions', stage: 'due_diligence', property_address: '1200 Sunset Blvd, Los Angeles, CA 90028', property_type: 'Multifamily', deal_value: 12500000, loan_amount: 9000000, equity_amount: 3500000, cap_rate: 5.2, noi: 650000, irr: null, priority: 'high', description: '48-unit apartment complex in prime West Hollywood location' },
    { id: uuidv4(), name: 'Harbor View Office Park', type: 'brokerage', stage: 'under_contract', property_address: '450 Harbor Dr, San Diego, CA 92101', property_type: 'Office', deal_value: 8200000, loan_amount: 5900000, equity_amount: 2300000, cap_rate: 6.1, noi: 500200, irr: null, priority: 'high', description: 'Class-A office park with harbor views, 90% occupancy' },
    { id: uuidv4(), name: 'Mesa Verde Shopping Center', type: 'brokerage', stage: 'closing', property_address: '3300 Mesa Verde Dr, Costa Mesa, CA 92626', property_type: 'Retail', deal_value: 5600000, loan_amount: 3900000, equity_amount: 1700000, cap_rate: 7.0, noi: 392000, irr: null, priority: 'medium', description: 'Anchored strip mall, long-term NNN leases' },
    { id: uuidv4(), name: 'Riverside Industrial Portfolio', type: 'acquisitions', stage: 'lead', property_address: '7800 Industrial Pkwy, Riverside, CA 92504', property_type: 'Industrial', deal_value: 22000000, loan_amount: 15400000, equity_amount: 6600000, cap_rate: 4.8, noi: 1056000, irr: null, priority: 'high', description: '3-building industrial portfolio, 100% occupied by credit tenants' },
    { id: uuidv4(), name: 'Downtown Lofts Bridge Loan', type: 'debt', stage: 'closing', property_address: '888 Main St, Dallas, TX 75201', property_type: 'Mixed-Use', deal_value: 3500000, loan_amount: 3500000, equity_amount: 0, cap_rate: null, noi: null, irr: null, priority: 'medium', description: '18-month bridge loan for mixed-use conversion project' },
    { id: uuidv4(), name: 'Pacific Heights Preferred Equity', type: 'equity', stage: 'due_diligence', property_address: '2200 Pacific Ave, San Francisco, CA 94115', property_type: 'Multifamily', deal_value: 2000000, loan_amount: 0, equity_amount: 2000000, cap_rate: null, noi: null, irr: 14.5, priority: 'medium', description: 'Preferred equity position, 14.5% preferred return' },
    { id: uuidv4(), name: 'Wilshire Corridor Title', type: 'title', stage: 'closing', property_address: '6100 Wilshire Blvd, Los Angeles, CA 90048', property_type: 'Office', deal_value: 9800000, loan_amount: 6860000, equity_amount: 2940000, cap_rate: 5.8, noi: 568400, irr: null, priority: 'low', description: 'Title order for mid-rise office acquisition' },
    { id: uuidv4(), name: 'Scottsdale Luxury Condos', type: 'acquisitions', stage: 'closed_won', property_address: '4500 Camelback Rd, Scottsdale, AZ 85251', property_type: 'Condo', deal_value: 4100000, loan_amount: 2870000, equity_amount: 1230000, cap_rate: 6.5, noi: 266500, irr: null, priority: 'low', description: '12-unit luxury condo acquisition, value-add opportunity' },
    { id: uuidv4(), name: 'Phoenix Self-Storage Debt', type: 'debt', stage: 'lead', property_address: '1500 Van Buren St, Phoenix, AZ 85007', property_type: 'Self-Storage', deal_value: 6000000, loan_amount: 6000000, equity_amount: 0, cap_rate: 5.5, noi: 330000, irr: null, priority: 'low', description: 'First mortgage on 400-unit self-storage facility' },
    { id: uuidv4(), name: 'Miami Beach Mixed-Use', type: 'brokerage', stage: 'dead', property_address: '700 Collins Ave, Miami Beach, FL 33139', property_type: 'Mixed-Use', deal_value: 7300000, loan_amount: 5110000, equity_amount: 2190000, cap_rate: 4.9, noi: 357700, irr: null, priority: 'low', description: 'Fell through due to title issues' },
  ];

  const stmt = db.prepare(`
    INSERT INTO deals (id, name, type, stage, property_address, property_type,
      deal_value, loan_amount, equity_amount, cap_rate, noi, irr, description, priority)
    VALUES (@id, @name, @type, @stage, @property_address, @property_type,
      @deal_value, @loan_amount, @equity_amount, @cap_rate, @noi, @irr, @description, @priority)
  `);

  const insertMany = db.transaction((items) => { for (const item of items) stmt.run(item); });
  insertMany(demos);

  // Add some sample contacts and notes
  const firstDeal = demos[0];
  const contactStmt = db.prepare('INSERT INTO contacts (id, deal_id, name, role, email, phone, company) VALUES (?, ?, ?, ?, ?, ?, ?)');
  contactStmt.run(uuidv4(), firstDeal.id, 'John Martinez', 'Seller Broker', 'jmartinez@example.com', '(213) 555-0101', 'CBRE');
  contactStmt.run(uuidv4(), firstDeal.id, 'Sarah Kim', 'Lender Contact', 'skim@firstrepublic.com', '(213) 555-0202', 'First Republic Bank');

  const noteStmt = db.prepare('INSERT INTO notes (id, deal_id, content) VALUES (?, ?, ?)');
  noteStmt.run(uuidv4(), firstDeal.id, 'Phase 1 environmental completed — clean. Moving to Phase 2 for soil testing.');
  noteStmt.run(uuidv4(), firstDeal.id, 'Seller agreed to $200K price reduction pending inspection findings.');

  console.log('Demo data seeded successfully.');
}

seedDemoData();

// Routes
app.use('/api/deals', dealsRouter);
app.use('/api/documents', documentsRouter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`RE-CRM API running on http://localhost:${PORT}`);
});
