import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'market_user',
  password: process.env.DB_PASSWORD || 'market_password',
  database: process.env.DB_NAME || 'market_intelligence',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10
});

const ensureCompanyLogoColumn = async () => {
  const [columns] = await pool.query("SHOW COLUMNS FROM companies LIKE 'logo_url'");
  if (!columns.length) await pool.query('ALTER TABLE companies ADD COLUMN logo_url VARCHAR(500) NULL AFTER name');
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

const ensureCollectionsTables = () => Promise.all([
  pool.query(`CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#326d5b', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),
  pool.query(`CREATE TABLE IF NOT EXISTS collection_companies (
    collection_id INT NOT NULL, company_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, company_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
]);

export const prepareDatabase = () => Promise.all([
  ensureCompanyLogoColumn(),
  ensureCompanyMetricsColumns(),
  ensureCollectionsTables()
]);
