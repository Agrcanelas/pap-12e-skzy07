<?php
// ============================================================
//  VeriFact — Configuração da Base de Dados
//  Ficheiro: backend/config/db.php
// ============================================================

// --- ALTERA ESTES VALORES para o teu ambiente ---
define('DB_HOST', 'sql110.infinityfree.com');
define('DB_PORT', '3306');
define('DB_NAME', 'f0_41355675_verifact');
define('DB_USER', 'if0_41355675');       
define('DB_PASS', 'Pro352503');           
define('DB_CHARSET', 'utf8mb4');

// Chave secreta para tokens JWT (muda para algo aleatório!)
define('JWT_SECRET', 'verifact_secret_2025_muda_isto_em_producao');
define('JWT_EXPIRE_HOURS', 24);

// CORS — domínios autorizados a chamar a API
define('ALLOWED_ORIGINS', ['http://localhost', 'http://127.0.0.1', 'http://localhost:8080', '*']);

// Classe de ligação PDO (singleton)
class DB {
    private static ?PDO $instance = null;

    public static function get(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
            );
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                die(json_encode(['success' => false, 'error' => 'Erro de ligação à base de dados: ' . $e->getMessage()]));
            }
        }
        return self::$instance;
    }
}
