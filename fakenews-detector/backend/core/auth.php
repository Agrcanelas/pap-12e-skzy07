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
    $stmt = $db->prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?');
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
        'user'  => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']]
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

    jsonSuccess(['message' => 'Perfil atualizado.']);
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

jsonError('Ação inválida.', 404);
