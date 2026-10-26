import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'market_user',
  password: process.env.DB_PASSWORD || 'market_password',
  database: process.env.DB_NAME || 'market_intelligence',
  charset: 'utf8mb4'
});

const textColumns = {
  companies: ['name', 'sector', 'country', 'description', 'business_model', 'value_proposition'],
  markets: ['name', 'industry', 'geography', 'period_label'],
  market_shares: ['source_name'],
  opportunities: ['title', 'problem', 'target_segment', 'evidence']
};

try {
  await pool.query('ALTER DATABASE market_intelligence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  let repaired = 0;
  for (const [table, columns] of Object.entries(textColumns)) {
    await pool.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    for (const column of columns) {
      const [result] = await pool.query(`
        UPDATE \`${table}\`
        SET \`${column}\` = CONVERT(BINARY CONVERT(\`${column}\` USING latin1) USING utf8mb4)
        WHERE \`${column}\` REGEXP '[ÃÂ]'`);
      repaired += result.affectedRows;
    }
  }
  console.log(`Codificación UTF-8 configurada. Textos reparados: ${repaired}.`);
} catch (error) {
  console.error('No se pudo reparar la codificación:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
