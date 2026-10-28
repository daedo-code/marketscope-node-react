import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../http.js';

export const companiesRouter = Router();

const duplicateCompanyMessage = name => `La empresa "${name}" ya existe y no fue agregada.`;

const findCompanyWithName = async (name, excludedId = null) => {
  const [[company]] = await pool.query(
    'SELECT id FROM companies WHERE TRIM(name) = ? AND (? IS NULL OR id <> ?) LIMIT 1',
    [name.trim(), excludedId, excludedId]
  );
  return company;
};

companiesRouter.get('/', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM companies ORDER BY name');
  res.json(rows);
}));

companiesRouter.get('/:id', asyncRoute(async (req, res) => {
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });
  const [marketShares] = await pool.query(`
    SELECT ms.share_percentage, ms.estimated_revenue, ms.source_name, ms.confidence,
           m.id AS market_id, m.name AS market_name, m.geography, m.period_label, m.currency
    FROM market_shares ms JOIN markets m ON m.id = ms.market_id
    WHERE ms.company_id = ? ORDER BY ms.share_percentage DESC`, [req.params.id]);
  res.json({ ...company, marketShares });
}));

companiesRouter.post('/', asyncRoute(async (req, res) => {
  const { name, logo_url, sector, country, founded_year, employee_count, annual_sales_usd, sales_year, sales_scope, sales_unit, description, business_model, value_proposition } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
  if (await findCompanyWithName(normalizedName)) return res.status(409).json({ error: duplicateCompanyMessage(normalizedName) });

  let result;
  try {
    [result] = await pool.query('INSERT INTO companies (name,logo_url,sector,country,founded_year,employee_count,annual_sales_usd,sales_year,sales_scope,sales_unit,description,business_model,value_proposition) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [normalizedName, logo_url || null, sector, country, founded_year || null, employee_count || null, annual_sales_usd || null, sales_year || null, sales_scope || null, sales_unit || null, description || null, business_model || null, value_proposition || null]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: duplicateCompanyMessage(normalizedName) });
    throw error;
  }
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
  res.status(201).json(company);
}));

companiesRouter.put('/:id', asyncRoute(async (req, res) => {
  const { name, logo_url, sector, country, founded_year, employee_count, annual_sales_usd, sales_year, sales_scope, sales_unit, description, business_model, value_proposition } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return res.status(400).json({ error: 'El nombre de la empresa es obligatorio.' });
  if (await findCompanyWithName(normalizedName, req.params.id)) return res.status(409).json({ error: duplicateCompanyMessage(normalizedName) });

  let result;
  try {
    [result] = await pool.query(`UPDATE companies SET name = ?, logo_url = ?, sector = ?, country = ?, founded_year = ?, employee_count = ?, annual_sales_usd = ?, sales_year = ?, sales_scope = ?, sales_unit = ?, description = ?, business_model = ?, value_proposition = ? WHERE id = ?`, [normalizedName, logo_url || null, sector, country, founded_year || null, employee_count || null, annual_sales_usd || null, sales_year || null, sales_scope || null, sales_unit || null, description || null, business_model || null, value_proposition || null, req.params.id]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: duplicateCompanyMessage(normalizedName) });
    throw error;
  }
  if (!result.affectedRows) return res.status(404).json({ error: 'Empresa no encontrada.' });
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  res.json(company);
}));

companiesRouter.put('/:id/metrics', asyncRoute(async (req, res) => {
  const { employee_count, annual_sales_usd, sales_year, sales_scope, sales_unit } = req.body;
  await pool.query('UPDATE companies SET employee_count = ?, annual_sales_usd = ?, sales_year = ?, sales_scope = ?, sales_unit = ? WHERE id = ?', [employee_count || null, annual_sales_usd || null, sales_year || null, sales_scope || null, sales_unit || null, req.params.id]);
  const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
  if (!company) return res.status(404).json({ error: 'Empresa no encontrada.' });
  res.json(company);
}));
