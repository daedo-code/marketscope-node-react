import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../http.js';

export const marketDataRouter = Router();

marketDataRouter.get('/dashboard', asyncRoute(async (_req, res) => {
  const [[companies], [markets], [opportunities], [shares]] = await Promise.all([
    pool.query('SELECT COUNT(*) AS total FROM companies'),
    pool.query('SELECT COUNT(*) AS total FROM markets'),
    pool.query("SELECT COUNT(*) AS total FROM opportunities WHERE status != 'Descartada'"),
    pool.query('SELECT ms.share_percentage, c.name FROM market_shares ms JOIN companies c ON c.id = ms.company_id ORDER BY ms.share_percentage DESC LIMIT 5')
  ]);
  res.json({ companies: companies[0].total, markets: markets[0].total, opportunities: opportunities[0].total, topShares: shares });
}));

marketDataRouter.get('/markets', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT m.*, COUNT(ms.id) AS participant_count FROM markets m
    LEFT JOIN market_shares ms ON m.id = ms.market_id GROUP BY m.id ORDER BY m.name`);
  res.json(rows);
}));

marketDataRouter.post('/markets', asyncRoute(async (req, res) => {
  const { name, industry, geography, market_size, currency, growth_rate, period_label } = req.body;
  const [result] = await pool.query('INSERT INTO markets (name,industry,geography,market_size,currency,growth_rate,period_label) VALUES (?,?,?,?,?,?,?)', [name, industry, geography, market_size || null, currency || 'USD', growth_rate || null, period_label]);
  const [[market]] = await pool.query('SELECT * FROM markets WHERE id = ?', [result.insertId]);
  res.status(201).json(market);
}));

marketDataRouter.get('/opportunities', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT o.*, m.name AS market_name FROM opportunities o LEFT JOIN markets m ON m.id = o.market_id ORDER BY o.attractiveness DESC');
  res.json(rows);
}));

marketDataRouter.post('/opportunities', asyncRoute(async (req, res) => {
  const { title, market_id, problem, target_segment, status, attractiveness, evidence } = req.body;
  const [result] = await pool.query('INSERT INTO opportunities (title,market_id,problem,target_segment,status,attractiveness,evidence) VALUES (?,?,?,?,?,?,?)', [title, market_id || null, problem, target_segment, status || 'Detectada', attractiveness || 5, evidence || null]);
  const [[opportunity]] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [result.insertId]);
  res.status(201).json(opportunity);
}));
