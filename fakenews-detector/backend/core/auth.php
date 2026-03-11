<?php
// ============================================================
//  VeriFact — API de Autenticação
//  Ficheiro: backend/api/auth.php
//
//  POST /api/auth.php?action=register
//  POST /api/auth.php?action=login
//  POST /api/auth.php?action=logout
//  GET  /api/auth.php?action=me
// ============================================================

require_once __DIR__ . '/../config/helpers.php';
setCORSHeaders();

$action = $_GET['action'] ?? '';

// ---- REGISTER ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'register') {
    $body = getJsonBody();

    $name     = trim($body['name']     ?? '');
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';

    if (!$name || !$email || !$password)
        jsonError('Preenche todos os campos.');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        jsonError('Email inválido.');

    if (strlen($password) < 6)
        jsonError('A palavra-passe deve ter pelo menos 6 caracteres.');

    if (strlen($name) < 2 || strlen($name) > 120)
        jsonError('Nome inválido (2-120 caracteres).');

    $db = DB::get();

    // Check duplicate
    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) jsonError('Este email já está registado.', 409);

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $hash]);
    $userId = (int) $db->lastInsertId();

    // Create session
    $token = createJWT(['sub' => $userId, 'email' => $email, 'role' => 'user']);
    $expires = date('Y-m-d H:i:s', time() + JWT_EXPIRE_HOURS * 3600);
    $db->prepare('INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?)')
       ->execute([$userId, $token, $_SERVER['REMOTE_ADDR'] ?? null, $_SERVER['HTTP_USER_AGENT'] ?? null, $expires]);

    jsonSuccess([
        'token' => $token,
        'user'  => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user']
    ], 201);
}

// ---- LOGIN ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $body     = getJsonBody();
    $email    = trim($body['email']    ?? '');
    $password =      $body['password'] ?? '';

    if (!$email || !$password) jsonError('Preenche todos os campos.');

    $db = DB::get();
    $stmt = $db->prepare('SELECT id, name, email, password_hash, bio, avatar, role, is_active FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash']))
        jsonError('Email ou palavra-passe incorretos.', 401);

    if (!$user['is_active'])
        jsonError('Conta desativada. Contacta o suporte.', 403);

    // Update last_login
    $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

    // Invalidar sessões antigas deste utilizador
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()')->execute([$user['id']]);

    $token = createJWT(['sub' => $user['id'], 'email' => $user['email'], 'role' => $user['role']]);
    $expires = date('Y-m-d H:i:s', time() + JWT_EXPIRE_HOURS * 3600);
    $db->prepare('INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?)')
       ->execute([$user['id'], $token, $_SERVER['REMOTE_ADDR'] ?? null, $_SERVER['HTTP_USER_AGENT'] ?? null, $expires]);

    jsonSuccess([
        'token' => $token,
        'user'  => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'], 'bio' => $user['bio'] ?? '', 'avatar' => $user['avatar'] ?? null]
    ]);
}

// ---- LOGOUT ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($authHeader, 'Bearer ')) {
        $token = substr($authHeader, 7);
        $db = DB::get();
        $db->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    }
    jsonSuccess(['message' => 'Sessão terminada.']);
}

// ---- ME (utilizador atual) ----
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'me') {
    $user = requireAuth();
    jsonSuccess([
        'id'    => $user['user_id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ]);
}


// ---- UPDATE PROFILE ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'update') {
    $user = requireAuth();
    $body = getJsonBody();
    $name   = trim($body['name']   ?? '');
    $bio    = trim($body['bio']    ?? '');
    $avatar = $body['avatar'] ?? null;

    if (!$name) jsonError('O nome não pode estar vazio.');
    if (strlen($name) > 120) jsonError('Nome demasiado longo.');

    $db = DB::get();
    $db->prepare('UPDATE users SET name=?, bio=?, avatar=?, updated_at=NOW() WHERE id=?')
       ->execute([$name, $bio, $avatar, $user['user_id']]);

    jsonSuccess(['message' => 'Perfil atualizado.', 'user' => ['id' => $user['user_id'], 'name' => $name, 'bio' => $bio, 'avatar' => $avatar]]);
}

// ---- CHANGE PASSWORD ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'changePassword') {
    $user = requireAuth();
    $body = getJsonBody();
    $currentPw = $body['current_password'] ?? '';
    $newPw     = $body['new_password']     ?? '';

    if (!$currentPw || !$newPw) jsonError('Preenche todos os campos.');
    if (strlen($newPw) < 6) jsonError('A nova palavra-passe deve ter pelo menos 6 caracteres.');

    $db = DB::get();
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id=?');
    $stmt->execute([$user['user_id']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($currentPw, $row['password_hash']))
        jsonError('Palavra-passe atual incorreta.', 403);

    $hash = password_hash($newPw, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([$hash, $user['user_id']]);

    jsonSuccess(['message' => 'Palavra-passe alterada.']);
}

// ---- DELETE ACCOUNT ----
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete') {
    $user = requireAuth();
    $db = DB::get();
    $db->prepare('DELETE FROM sessions WHERE user_id=?')->execute([$user['user_id']]);
    $db->prepare('DELETE FROM scans WHERE user_id=?')->execute([$user['user_id']]);
    $db->prepare('DELETE FROM users WHERE id=?')->execute([$user['user_id']]);
    jsonSuccess(['message' => 'Conta eliminada.']);
}

// ============================================================
// ---- GOOGLE LOGIN ----
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'googleLogin') {
    $body      = getJsonBody();
    $idToken   = $body['id_token'] ?? '';
    if (!$idToken) jsonError('Token Google inválido.');

    // Verificar token Google
    $googleUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
    $ctx = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
    $resp = @file_get_contents($googleUrl, false, $ctx);
    if (!$resp) jsonError('Erro ao verificar token Google.');

    $payload = json_decode($resp, true);
    if (!$payload || isset($payload['error']) || empty($payload['email'])) {
        jsonError('Token Google inválido ou expirado.');
    }

    // Verificar Client ID
    define('GOOGLE_CLIENT_ID', '913609694524-0slri1aoutqpkk0n7303kkio4hb6igt4.apps.googleusercontent.com');
    if ($payload['aud'] !== GOOGLE_CLIENT_ID) jsonError('Client ID não autorizado.');

    $email  = $payload['email'];
    $name   = $payload['name']    ?? explode('@', $email)[0];
    $avatar = $payload['picture'] ?? null;

    $db = DB::get();

    // Verificar se utilizador já existe
    $stmt = $db->prepare('SELECT id, name, email, bio, avatar, role FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Criar novo utilizador via Google
        $db->prepare('INSERT INTO users (name, email, password_hash, avatar, bio, is_active) VALUES (?,?,?,?,?,1)')
           ->execute([$name, $email, password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT), $avatar, '']);
        $userId = (int)$db->lastInsertId();
        $user = ['id' => $userId, 'name' => $name, 'email' => $email, 'bio' => '', 'avatar' => $avatar, 'role' => 'user'];
    } else {
        // Atualizar avatar se veio do Google e não tem avatar
        if (!$user['avatar'] && $avatar) {
            $db->prepare('UPDATE users SET avatar=? WHERE id=?')->execute([$avatar, $user['id']]);
            $user['avatar'] = $avatar;
        }
    }

    $token   = createJWT(['sub' => $user['id'], 'email' => $user['email'], 'role' => $user['role'] ?? 'user']);
    $expires = date('Y-m-d H:i:s', time() + JWT_EXPIRE_HOURS * 3600);
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()')->execute([$user['id']]);
    $db->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)')->execute([$user['id'], $token, $expires]);

    jsonSuccess([
        'token' => $token,
        'user'  => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'bio' => $user['bio'] ?? '', 'avatar' => $user['avatar'] ?? null, 'role' => $user['role'] ?? 'user']
    ]);
}

// ============================================================
// ---- FORGOT PASSWORD ----
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'forgotPassword') {
    $body  = getJsonBody();
    $email = trim($body['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Email inválido.');

    $db   = DB::get();
    $stmt = $db->prepare('SELECT id, name FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Responder sempre com sucesso (segurança - não revelar se email existe)
    if (!$user) jsonSuccess(['message' => 'Se o email existir, receberás um link de recuperação.', 'reset_token' => null, 'name' => null]);

    // Gerar token único
    $resetToken  = bin2hex(random_bytes(32));
    $expiresAt   = date('Y-m-d H:i:s', time() + 3600); // 1 hora

    // Criar tabela se não existir (auto-migration)
    $db->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Guardar token na BD
    try {
        $db->prepare('DELETE FROM password_resets WHERE email = ?')->execute([$email]);
        $db->prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?,?,?)')->execute([$email, $resetToken, $expiresAt]);
    } catch (Exception $e) {
        jsonError('Erro ao guardar token: ' . $e->getMessage());
    }

    // EmailJS envia o email pelo frontend - devolver token e nome
    jsonSuccess(['message' => 'Token gerado.', 'reset_token' => $resetToken, 'name' => $user['name']]);
}

// ============================================================
// ---- RESET PASSWORD ----
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'resetPassword') {
    $body     = getJsonBody();
    $token    = trim($body['token']    ?? '');
    $password = trim($body['password'] ?? '');

    if (!$token || !$password) jsonError('Dados inválidos.');
    if (strlen($password) < 6) jsonError('A palavra-passe deve ter pelo menos 6 caracteres.');

    $db   = DB::get();
    $stmt = $db->prepare('SELECT email, expires_at FROM password_resets WHERE token = ?');
    $stmt->execute([$token]);
    $reset = $stmt->fetch();

    if (!$reset)                              jsonError('Token inválido.');
    if (strtotime($reset['expires_at']) < time()) jsonError('O link de recuperação já expirou. Pede um novo.');

    // Atualizar password
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->prepare('UPDATE users SET password_hash=? WHERE email=?')->execute([$hash, $reset['email']]);
    $db->prepare('DELETE FROM password_resets WHERE email=?')->execute([$reset['email']]);

    jsonSuccess(['message' => 'Palavra-passe alterada com sucesso.']);
}

// ============================================================
// ---- HELPER: Enviar email de recuperação ----
// ============================================================
function sendResetEmail(string $to, string $name, string $resetUrl): bool {
    // Configuração SMTP Gmail
    define('SMTP_HOST',     'smtp.gmail.com');
    define('SMTP_PORT',     587);
    define('SMTP_USER',     'SEU_EMAIL@gmail.com');   // ← substitui pelo teu Gmail
    define('SMTP_PASS',     'SEU_APP_PASSWORD');       // ← App Password do Gmail
    define('SMTP_FROM_NAME','VeriFact');

    $subject = 'Recuperação de Palavra-passe — VeriFact';
    $html = '
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#16161f;border-radius:16px;overflow:hidden;border:1px solid #2a2a3a;">
    <div style="background:#0a0a0f;padding:32px 40px;border-bottom:2px solid #00f5a0;">
      <span style="font-size:28px;font-weight:900;letter-spacing:3px;color:#00f5a0;">VERI</span><span style="font-size:28px;font-weight:900;letter-spacing:3px;color:#fff;">FACT</span>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#f0f0ff;font-size:22px;margin:0 0 12px;">Olá, '.htmlspecialchars($name).'!</h2>
      <p style="color:#a0a0c0;font-size:15px;line-height:1.6;margin:0 0 24px;">Recebemos um pedido para recuperar a palavra-passe da tua conta VeriFact. Clica no botão abaixo para definir uma nova palavra-passe.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="'.htmlspecialchars($resetUrl).'" style="background:#00f5a0;color:#000;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block;">Recuperar Palavra-passe</a>
      </div>
      <p style="color:#606080;font-size:13px;line-height:1.6;">Este link é válido durante <strong style="color:#a0a0c0;">1 hora</strong>. Se não pediste esta recuperação, ignora este email.</p>
      <hr style="border:none;border-top:1px solid #2a2a3a;margin:24px 0;">
      <p style="color:#404060;font-size:12px;">Ou copia este link para o browser:<br><span style="color:#00d4ff;word-break:break-all;">'.htmlspecialchars($resetUrl).'</span></p>
    </div>
    <div style="background:#0a0a0f;padding:20px 40px;text-align:center;">
      <p style="color:#404060;font-size:12px;margin:0;">© 2025 VeriFact · Projeto PAP · Este email foi gerado automaticamente.</p>
    </div>
  </div>
</body>
</html>';

    // Usar mail() nativo como fallback (funciona no InfinityFree)
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . SMTP_FROM_NAME . " <" . SMTP_USER . ">\r\n";
    $headers .= "Reply-To: " . SMTP_USER . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    return mail($to, $subject, $html, $headers);
}

// Ação não reconhecida
jsonError('Ação inválida.', 404);
