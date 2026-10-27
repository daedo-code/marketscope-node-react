import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../http.js';

export const collectionsRouter = Router();

collectionsRouter.get('/', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT c.*, COUNT(cc.company_id) AS company_count
    FROM collections c LEFT JOIN collection_companies cc ON cc.collection_id = c.id
    GROUP BY c.id ORDER BY c.name`);
  res.json(rows);
}));

collectionsRouter.post('/', asyncRoute(async (req, res) => {
  const { name, description, color } = req.body;
  const [result] = await pool.query('INSERT INTO collections (name, description, color) VALUES (?, ?, ?)', [name, description || null, color || '#326d5b']);
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [result.insertId]);
  res.status(201).json(collection);
}));

collectionsRouter.put('/:id', asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  const description = req.body.description?.trim() || null;
  const color = /^#[0-9a-fA-F]{6}$/.test(req.body.color) ? req.body.color : '#326d5b';
  if (!name) return res.status(400).json({ error: 'El nombre de la colección es obligatorio.' });
  const [result] = await pool.query('UPDATE collections SET name = ?, description = ?, color = ? WHERE id = ?', [name, description, color, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Colección no encontrada.' });
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [req.params.id]);
  res.json(collection);
}));

collectionsRouter.get('/:id', asyncRoute(async (req, res) => {
  const [[collection]] = await pool.query('SELECT * FROM collections WHERE id = ?', [req.params.id]);
  if (!collection) return res.status(404).json({ error: 'Colección no encontrada.' });
  const [companies] = await pool.query(`SELECT c.* FROM companies c
    JOIN collection_companies cc ON cc.company_id = c.id WHERE cc.collection_id = ? ORDER BY c.name`, [req.params.id]);
  res.json({ ...collection, companies });
}));

collectionsRouter.post('/:id/companies', asyncRoute(async (req, res) => {
  await pool.query('INSERT IGNORE INTO collection_companies (collection_id, company_id) VALUES (?, ?)', [req.params.id, req.body.company_id]);
  res.status(204).end();
}));

collectionsRouter.delete('/:id/companies/:companyId', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM collection_companies WHERE collection_id = ? AND company_id = ?', [req.params.id, req.params.companyId]);
  res.status(204).end();
}));
