<?php
// ============================================================
//  VeriFact — Configuração da Base de Dados
//  Ficheiro: backend/config/db.php
// ============================================================

// --- ALTERA ESTES VALORES para o teu ambiente ---
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'verifact');
define('DB_USER', 'root');       // utilizador MySQL
define('DB_PASS', '');           // palavra-passe MySQL (vazio no XAMPP/WAMP por defeito)
define('DB_CHARSET', 'utf8mb4');

define('JWT_SECRET',      'verifact_secret_2025_muda_isto_em_producao');
define('JWT_EXPIRE_HOURS', 24);

class DB {
  private static $pdo = null;
  public static function get(): PDO {
    if (!self::$pdo) {
      $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
      self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]);
    }
    return self::$pdo;
  }
}
