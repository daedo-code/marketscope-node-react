import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { pool, prepareDatabase } from './db.js';
import { errorHandler, asyncRoute } from './http.js';
import { companiesRouter } from './routes/companies.js';
import { collectionsRouter } from './routes/collections.js';
import { marketDataRouter } from './routes/market-data.js';

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));
app.use('/api/companies', companiesRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api', marketDataRouter);
app.use(errorHandler);

prepareDatabase()
  .then(() => app.listen(port, () => console.log(`API disponible en http://localhost:${port}`)))
  .catch(error => { console.error('No se pudo preparar la base de datos:', error); process.exit(1); });
