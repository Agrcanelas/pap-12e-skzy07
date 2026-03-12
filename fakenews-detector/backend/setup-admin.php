<?php
// ============================================================
// FICHEIRO DE SETUP DO ADMIN — APAGAR APÓS USO!
// Acede a este ficheiro UMA VEZ para criar o admin
// URL: https://verifact.fwh.is/fakenews-detector/backend/setup-admin.php
// ============================================================

// Chave de segurança — só funciona com esta chave
$secret = $_GET['key'] ?? '';
if ($secret !== 'verifact_setup_2025') {
    die(json_encode(['error' => 'Chave inválida.']));
}

require_once __DIR__ . '/config/helpers.php';

$db = DB::get();

// Adicionar coluna role se não existir
try {
    $db->exec("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'");
} catch(Exception $e) { /* já existe */ }

try {
    $db->exec("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
} catch(Exception $e) { /* já existe */ }

try {
    $db->exec("ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL");
} catch(Exception $e) { /* já existe */ }

// Criar ou atualizar admin
$email = 'admin@gmail.com';
$name  = 'Administrador VeriFact';
$hash  = password_hash('Pro35@#2503', PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
$existing = $stmt->fetch();

if ($existing) {
    $db->prepare('UPDATE users SET name=?, password_hash=?, role=?, is_active=1 WHERE email=?')
       ->execute([$name, $hash, 'admin', $email]);
    echo json_encode(['success' => true, 'message' => 'Admin atualizado! ID: ' . $existing['id']]);
} else {
    $db->prepare('INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?,?,?,?,1)')
       ->execute([$name, $email, $hash, 'admin']);
    echo json_encode(['success' => true, 'message' => 'Admin criado! ID: ' . $db->lastInsertId()]);
}
