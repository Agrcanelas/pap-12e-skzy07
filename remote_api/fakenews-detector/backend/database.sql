-- ============================================================
--  VeriFact — Base de Dados MySQL
--  Ficheiro: database.sql
--  Corre este ficheiro no phpMyAdmin ou linha de comandos:
--    mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS verifact
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE verifact;

-- ------------------------------------------------------------
-- TABELA: utilizadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)    NOT NULL,
  email         VARCHAR(180)    NOT NULL UNIQUE,
  password_hash VARCHAR(255)    NOT NULL,
  avatar        VARCHAR(255)    DEFAULT NULL,
  role          ENUM('user','admin') DEFAULT 'user',
  created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login    DATETIME        DEFAULT NULL,
  is_active     TINYINT(1)      DEFAULT 1,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: sessões (tokens JWT armazenados server-side)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED    NOT NULL,
  token         VARCHAR(512)    NOT NULL UNIQUE,
  ip_address    VARCHAR(45)     DEFAULT NULL,
  user_agent    VARCHAR(255)    DEFAULT NULL,
  expires_at    DATETIME        NOT NULL,
  created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: verificações (scan history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED    DEFAULT NULL,          -- NULL = utilizador anónimo
  input_type    ENUM('text','url') NOT NULL,
  input_content TEXT            NOT NULL,              -- texto ou URL submetido
  verdict       ENUM('fake','suspicious','real') NOT NULL,
  reliability   TINYINT UNSIGNED NOT NULL DEFAULT 50,  -- 0-100
  confidence    TINYINT UNSIGNED NOT NULL DEFAULT 50,  -- 0-100 (confiança da IA)
  fake_score    TINYINT UNSIGNED NOT NULL DEFAULT 50,  -- pontuação interna 0-100
  summary       TEXT            DEFAULT NULL,
  indicators    JSON            DEFAULT NULL,          -- array de {name, value, type}
  sources       JSON            DEFAULT NULL,          -- array de {name, status, label}
  real_news     JSON            DEFAULT NULL,          -- sugestão de notícia real (se fake)
  ai_raw        JSON            DEFAULT NULL,          -- resposta bruta da HF API
  created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_verdict (verdict),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: relatórios PDF gerados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  scan_id       INT UNSIGNED    NOT NULL,
  user_id       INT UNSIGNED    DEFAULT NULL,
  filename      VARCHAR(255)    NOT NULL,
  file_size_kb  SMALLINT UNSIGNED DEFAULT 0,
  download_count INT UNSIGNED   DEFAULT 0,
  generated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_scan (scan_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABELA: notícias em destaque (painel admin + home)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trending_news (
  id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(500)    NOT NULL,
  source        VARCHAR(120)    DEFAULT NULL,
  snippet       TEXT            DEFAULT NULL,
  url           VARCHAR(1000)   DEFAULT NULL,
  verdict       ENUM('fake','suspicious','real') DEFAULT 'real',
  reliability   TINYINT UNSIGNED DEFAULT 50,
  category      VARCHAR(80)     DEFAULT NULL,
  is_active     TINYINT(1)      DEFAULT 1,
  published_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
  created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_published (published_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- DADOS INICIAIS — notícias de exemplo
-- ------------------------------------------------------------
INSERT INTO trending_news (title, source, snippet, verdict, reliability, category) VALUES
('Governo anuncia novo plano de combate à desinformação nas redes sociais',
 'Público', 'O executivo propõe novas medidas para regular plataformas digitais.', 'real', 91, 'Política'),

('Vitamina C em doses altas cura cancro, diz estudo viral',
 'Blog Saúde Total', 'Publicação viral afirma que tomar 10g de vitamina C elimina células cancerígenas.', 'fake', 8, 'Saúde'),

('Portugal entre os países com melhor qualidade de vida segundo novo ranking',
 'Jornal de Negócios', 'Relatório internacional coloca Portugal em 14.º lugar a nível mundial.', 'real', 85, 'Sociedade'),

('Cientistas descobrem que o 5G provoca alterações genéticas',
 'InfoAlternativa.net', 'Suposto estudo afirma que a radiação das redes 5G modifica o ADN humano.', 'fake', 4, 'Tecnologia'),

('Banco de Portugal alerta para novo esquema de phishing',
 'BdP', 'Autoridade monetária avisa cidadãos sobre mensagens falsas que imitam bancos.', 'real', 97, 'Economia'),

('Candidato terá dito algo que nunca disse — vídeo editado circula online',
 'ViralPT.com', 'Vídeo editado circula nas redes sociais atribuindo declarações falsas.', 'suspicious', 32, 'Política');

-- ------------------------------------------------------------
-- UTILIZADOR ADMIN padrão (alterar password depois!)
-- password: Admin@123  (hash bcrypt abaixo)
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Administrador', 'admin@verifact.app',
 '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMeSSmnpBt6BuoaqlOXnqKQzGS',
 'admin');
