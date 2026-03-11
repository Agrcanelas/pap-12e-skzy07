<?php
// ============================================================
//  VeriFact — Helpers (JWT, CORS, respostas)
//  Ficheiro: backend/config/helpers.php
// ============================================================

require_once __DIR__ . '/db.php';

// --- CORS ---
function setCORSHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    if (in_array('*', ALLOWED_ORIGINS) || in_array($origin, ALLOWED_ORIGINS)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

// --- JSON responses ---
function jsonSuccess(mixed $data = null, int $code = 200): never {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit();
}

function jsonError(string $message, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit();
}

// --- Input ---
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// --- JWT simples (sem biblioteca externa) ---
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

function createJWT(array $payload): string {
    $header  = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRE_HOURS * 3600;
    $body    = base64UrlEncode(json_encode($payload));
    $sig     = base64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function verifyJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(base64UrlDecode($body), true);
    if (!$payload || $payload['exp'] < time()) return null;
    return $payload;
}

function getAuthUser(): ?array {
    // XAMPP/Apache às vezes não passa HTTP_AUTHORIZATION — usar múltiplos fallbacks
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
               ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
               ?? '';

    // Fallback via getallheaders() (funciona na maioria dos casos com Apache)
    if (!$authHeader) {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    // Último fallback: token via query string ?_token=... ou POST body
    if (!$authHeader) {
        $t = $_GET['_token'] ?? $_POST['_token'] ?? '';
        if ($t) $authHeader = 'Bearer ' . $t;
    }

    if (!str_starts_with($authHeader, 'Bearer ')) return null;
    $token = substr($authHeader, 7);
    $payload = verifyJWT($token);
    if (!$payload) return null;

    // Buscar utilizador diretamente pelo ID do JWT (sem depender da tabela sessions)
    $userId = $payload['sub'] ?? null;
    if (!$userId) return null;

    $db = DB::get();
    $stmt = $db->prepare('SELECT id as user_id, name, email, role FROM users WHERE id = ? AND is_active = 1');
    $stmt->execute([$userId]);
    return $stmt->fetch() ?: null;
}

function requireAuth(): array {
    $user = getAuthUser();
    if (!$user) jsonError('Não autenticado. Faz login primeiro.', 401);
    return $user;
}
