import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const port = process.env.PORT || 3001;
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'market_user', password: process.env.DB_PASSWORD || 'market_password',
  database: process.env.DB_NAME || 'market_intelligence', charset: 'utf8mb4', waitForConnections: true, connectionLimit: 10
});

const ensureCompanyLogoColumn = async () => {
  const [columns] = await pool.query("SHOW COLUMNS FROM companies LIKE 'logo_url'");
  if (!columns.length) {
    await pool.query('ALTER TABLE companies ADD COLUMN logo_url VARCHAR(500) NULL AFTER name');
  }
  await pool.query(`UPDATE companies SET logo_url = CASE name
    WHEN 'Netflix' THEN 'https://logo.clearbit.com/netflix.com'
    WHEN 'Spotify' THEN 'https://logo.clearbit.com/spotify.com'
    WHEN 'Disney+' THEN 'https://logo.clearbit.com/disneyplus.com'
    ELSE logo_url END
    WHERE logo_url IS NULL AND name IN ('Netflix', 'Spotify', 'Disney+')`);
};
const ensureCompanyMetricsColumns = async () => {
  const columns = [
    ['employee_count', 'INT NULL AFTER founded_year'],
    ['annual_sales_usd', 'DECIMAL(16,2) NULL AFTER employee_count'],
    ['sales_year', 'SMALLINT NULL AFTER annual_sales_usd'],
    ['sales_scope', 'VARCHAR(50) NULL AFTER sales_year'],
    ['sales_unit', 'VARCHAR(20) NULL AFTER sales_scope']
  ];
  for (const [name, definition] of columns) {
    const [existing] = await pool.query(`SHOW COLUMNS FROM companies LIKE '${name}'`);
    if (!existing.length) await pool.query(`ALTER TABLE companies ADD COLUMN ${name} ${definition}`);
  }
};
const ensureCollectionsTables = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#326d5b', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS collection_companies (
    collection_id INT NOT NULL, company_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, company_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
};
app.use(cors());
app.use(express.json());
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [[companies], [markets], [opportunities], [shares]] = await Promise.all([
    pool.query('SELECT COUNT(*) AS total FROM companies'), pool.query('SELECT COUNT(*) AS total FROM markets'),
    pool.query("SELECT COUNT(*) AS total FROM opportunities WHERE status != 'Descartada'"),
    pool.query('SELECT ms.share_percentage, c.name FROM market_shares ms JOIN companies c ON c.id = ms.company_id ORDER BY ms.share_percentage DESC LIMIT 5')
  ]);
  res.json({ companies: companies[0].total, markets: markets[0].total, opportunities: opportunities[0].total, topShares: shares });
}));

app.get('/api/companies', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM companies ORDER BY name'); res.json(rows);
}));
app.get('/api/companies/:id', asyncRoute(async (req, res) => {
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });
  const [marketShares] = await pool.query(`
    SELECT ms.share_percentage, ms.estimated_revenue, ms.source_name, ms.confidence,
           m.id AS market_id, m.name AS market_name, m.geography, m.period_label, m.currency
    FROM market_shares ms JOIN markets m ON m.id = ms.market_id
    WHERE ms.company_id = ? ORDER BY ms.share_percentage DESC`, [req.params.id]);
  res.json({ ...company, marketShares });
}));
app.post('/api/companies', asyncRoute(async (req, res) => {
  const { name, logo_url, sector, country, founded_year, employee_count, annual_sales_usd, sales_year, sales_scope, sales_unit, description, business_model, value_proposition } = req.body;
  const [result] = await pool.query('INSERT INTO companies (name,logo_url,sector,country,founded_year,employee_count,annual_sales_usd,sales_year,sales_scope,sales_unit,description,business_model,value_proposition) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [name, logo_url || null, sector, country, founded_year || null, employee_count || null, annual_sales_usd || null, sales_year || null, sales_scope || null, sales_unit || null, description || null, business_model || null, value_proposition || null]);
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [result.insertId]); res.status(201).json(company);
}));
app.put('/api/companies/:id/metrics', asyncRoute(async (req, res) => {
  const { employee_count, annual_sales_usd, sales_year, sales_scope, sales_unit } = req.body;
  await pool.query('UPDATE companies SET employee_count = ?, annual_sales_usd = ?, sales_year = ?, sales_scope = ?, sales_unit = ? WHERE id = ?', [employee_count || null, annual_sales_usd || null, sales_year || null, sales_scope || null, sales_unit || null, req.params.id]);
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });
  res.json(company);
}));

app.get('/api/collections', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT c.*, COUNT(cc.company_id) AS company_count
    FROM collections c LEFT JOIN collection_companies cc ON cc.collection_id = c.id
    GROUP BY c.id ORDER BY c.name`);
  res.json(rows);
}));
app.post('/api/collections', asyncRoute(async (req, res) => {
  const { name, description, color } = req.body;
  const [result] = await pool.query('INSERT INTO collections (name, description, color) VALUES (?, ?, ?)', [name, description || null, color || '#326d5b']);
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [result.insertId]);
  res.status(201).json(collection);
}));
app.put('/api/collections/:id', asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  const description = req.body.description?.trim() || null;
  const color = /^#[0-9a-fA-F]{6}$/.test(req.body.color) ? req.body.color : '#326d5b';
  if (!name) return res.status(400).json({ error: 'El nombre de la colección es obligatorio.' });
  const [result] = await pool.query('UPDATE collections SET name = ?, description = ?, color = ? WHERE id = ?', [name, description, color, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Colección no encontrada.' });
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [req.params.id]);
  res.json(collection);
}));
app.get('/api/collections/:id', asyncRoute(async (req, res) => {
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [req.params.id]);
  if (!collection) return res.status(404).json({ error: 'Colección no encontrada.' });
  const [companies] = await pool.query(`SELECT c.* FROM companies c
    JOIN collection_companies cc ON cc.company_id = c.id WHERE cc.collection_id = ? ORDER BY c.name`, [req.params.id]);
  res.json({ ...collection, companies });
}));
app.post('/api/collections/:id/companies', asyncRoute(async (req, res) => {
  await pool.query('INSERT IGNORE INTO collection_companies (collection_id, company_id) VALUES (?, ?)', [req.params.id, req.body.company_id]);
  res.status(204).end();
}));
app.delete('/api/collections/:id/companies/:companyId', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM collection_companies WHERE collection_id = ? AND company_id = ?', [req.params.id, req.params.companyId]);
  res.status(204).end();
}));

app.get('/api/markets', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT m.*, COUNT(ms.id) AS participant_count FROM markets m LEFT JOIN market_shares ms ON m.id = ms.market_id GROUP BY m.id ORDER BY m.name`); res.json(rows);
}));
app.post('/api/markets', asyncRoute(async (req, res) => {
  const { name, industry, geography, market_size, currency, growth_rate, period_label } = req.body;
  const [result] = await pool.query('INSERT INTO markets (name,industry,geography,market_size,currency,growth_rate,period_label) VALUES (?,?,?,?,?,?,?)', [name, industry, geography, market_size || null, currency || 'USD', growth_rate || null, period_label]);
  const [[market]] = await pool.query('SELECT * FROM markets WHERE id = ?', [result.insertId]); res.status(201).json(market);
}));

app.get('/api/opportunities', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT o.*, m.name AS market_name FROM opportunities o LEFT JOIN markets m ON m.id = o.market_id ORDER BY o.attractiveness DESC'); res.json(rows);
}));
app.post('/api/opportunities', asyncRoute(async (req, res) => {
  const { title, market_id, problem, target_segment, status, attractiveness, evidence } = req.body;
  const [result] = await pool.query('INSERT INTO opportunities (title,market_id,problem,target_segment,status,attractiveness,evidence) VALUES (?,?,?,?,?,?,?)', [title, market_id || null, problem, target_segment, status || 'Detectada', attractiveness || 5, evidence || null]);
  const [[opportunity]] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [result.insertId]); res.status(201).json(opportunity);
}));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'No se pudo procesar la solicitud.' }); });
Promise.all([ensureCompanyLogoColumn(), ensureCompanyMetricsColumns(), ensureCollectionsTables()])
  .then(() => app.listen(port, () => console.log(`API disponible en http://localhost:${port}`)))
  .catch(error => { console.error('No se pudo preparar la base de datos:', error); process.exit(1); });
