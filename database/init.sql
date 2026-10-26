ALTER DATABASE market_intelligence CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  logo_url VARCHAR(500) NULL,
  sector VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  founded_year SMALLINT NULL,
  employee_count INT NULL,
  annual_sales_usd DECIMAL(16,2) NULL,
  sales_year SMALLINT NULL,
  sales_scope VARCHAR(50) NULL,
  sales_unit VARCHAR(20) NULL,
  description TEXT NULL,
  business_model VARCHAR(100) NULL,
  value_proposition TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS markets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  geography VARCHAR(100) NOT NULL,
  market_size DECIMAL(16,2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  growth_rate DECIMAL(6,2) NULL,
  period_label VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS market_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  market_id INT NOT NULL,
  share_percentage DECIMAL(5,2) NOT NULL,
  estimated_revenue DECIMAL(16,2) NULL,
  source_name VARCHAR(200) NULL,
  confidence ENUM('Baja', 'Media', 'Alta') NOT NULL DEFAULT 'Media',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE,
  UNIQUE KEY unique_company_market (company_id, market_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  market_id INT NULL,
  problem TEXT NOT NULL,
  target_segment VARCHAR(160) NOT NULL,
  status ENUM('Detectada', 'En investigación', 'Validada', 'Descartada') NOT NULL DEFAULT 'Detectada',
  attractiveness TINYINT NOT NULL DEFAULT 5,
  evidence TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#326d5b',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_companies (
  collection_id INT NOT NULL,
  company_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id, company_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO companies (name, logo_url, sector, country, founded_year, description, business_model, value_proposition) VALUES
('Netflix', 'https://logo.clearbit.com/netflix.com', 'Entretenimiento', 'Estados Unidos', 1997, 'Plataforma global de entretenimiento por streaming.', 'Suscripción B2C', 'Catálogo bajo demanda y recomendaciones personalizadas.'),
('Spotify', 'https://logo.clearbit.com/spotify.com', 'Audio digital', 'Suecia', 2006, 'Servicio de música y pódcasts en streaming.', 'Freemium y suscripción', 'Acceso instantáneo a música personalizada.'),
('Disney+', 'https://logo.clearbit.com/disneyplus.com', 'Entretenimiento', 'Estados Unidos', 2019, 'Servicio de streaming de contenido de Disney.', 'Suscripción B2C', 'Marcas y franquicias exclusivas.');

INSERT INTO markets (name, industry, geography, market_size, currency, growth_rate, period_label) VALUES
('Streaming de vídeo', 'Entretenimiento digital', 'Global', 108400000000, 'USD', 8.40, '2024'),
('Audio en streaming', 'Audio digital', 'Global', 43200000000, 'USD', 10.20, '2024');

INSERT INTO market_shares (company_id, market_id, share_percentage, estimated_revenue, source_name, confidence) VALUES
(1, 1, 21.00, 33600000000, 'Estimación interna', 'Media'),
(3, 1, 12.00, 19200000000, 'Estimación interna', 'Media'),
(2, 2, 31.00, 13400000000, 'Estimación interna', 'Media');

INSERT INTO opportunities (title, market_id, problem, target_segment, status, attractiveness, evidence) VALUES
('Streaming educativo para equipos técnicos', 1, 'La formación técnica en vídeo suele estar fragmentada y no se adapta al nivel del equipo.', 'Pequeñas y medianas empresas tecnológicas', 'En investigación', 8, 'Crecimiento de la formación continua y demanda de upskilling.'),
('Descubrimiento de pódcasts locales', 2, 'Es difícil encontrar contenido de audio relevante por contexto geográfico.', 'Oyentes urbanos de 18 a 35 años', 'Detectada', 6, 'Entrevistas iniciales pendientes.');
