<?php
// VeriFact — API Admin
require_once __DIR__ . '/../config/helpers.php';
setCORSHeaders();

$action = $_GET['action'] ?? '';

// Verificar se é admin
function requireAdmin() {
    $user = requireAuth();
    if (($user['role'] ?? '') !== 'admin') jsonError('Acesso negado.', 403);
    return $user;
}

// ── ESTATÍSTICAS GLOBAIS ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'stats') {
    requireAdmin();
    $db = DB::get();

    $stats = [];

    // Total utilizadores
    $stats['total_users']   = $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $stats['total_scans']   = $db->query('SELECT COUNT(*) FROM scans')->fetchColumn();
    $stats['total_reports'] = $db->query('SELECT COUNT(*) FROM reports')->fetchColumn();

    // Scans hoje
    $stats['scans_today'] = $db->query("SELECT COUNT(*) FROM scans WHERE DATE(created_at) = CURDATE()")->fetchColumn();

    // Utilizadores novos esta semana
    $stats['users_this_week'] = $db->query("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();

    // Veredictos
    $verdicts = $db->query("SELECT verdict, COUNT(*) as total FROM scans GROUP BY verdict")->fetchAll();
    $stats['verdicts'] = $verdicts;

    // Média de fiabilidade
    $stats['avg_reliability'] = round($db->query('SELECT AVG(reliability) FROM scans')->fetchColumn() ?? 0);

    // Scans por dia (últimos 7 dias)
    $stats['scans_per_day'] = $db->query("
        SELECT DATE(created_at) as day, COUNT(*) as total
        FROM scans WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at) ORDER BY day
    ")->fetchAll();

    jsonSuccess($stats);
}

// ── LISTAR UTILIZADORES ───────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'users') {
    requireAdmin();
    $db     = DB::get();
    $limit  = min((int)($_GET['limit'] ?? 20), 100);
    $offset = (int)($_GET['offset'] ?? 0);
    $search = '%' . ($_GET['search'] ?? '') . '%';

    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login, u.avatar,
               COUNT(DISTINCT s.id) as total_scans,
               COUNT(DISTINCT r.id) as total_reports
        FROM users u
        LEFT JOIN scans s ON s.user_id = u.id
        LEFT JOIN reports r ON r.user_id = u.id
        WHERE u.name LIKE ? OR u.email LIKE ?
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$search, $search, $limit, $offset]);
    $users = $stmt->fetchAll();

    $total = $db->prepare("SELECT COUNT(*) FROM users WHERE name LIKE ? OR email LIKE ?");
    $total->execute([$search, $search]);

    jsonSuccess(['users' => $users, 'total' => (int)$total->fetchColumn()]);
}

// ── LISTAR TODAS AS VERIFICAÇÕES ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'scans') {
    requireAdmin();
    $db     = DB::get();
    $limit  = min((int)($_GET['limit'] ?? 20), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    $stmt = $db->prepare("
        SELECT s.id, s.verdict, s.reliability, s.input_text, s.created_at,
               u.name as user_name, u.email as user_email
        FROM scans s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $scans = $stmt->fetchAll();

    $total = $db->query('SELECT COUNT(*) FROM scans')->fetchColumn();

    jsonSuccess(['scans' => $scans, 'total' => (int)$total]);
}

// ── ALTERAR ROLE DO UTILIZADOR ────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'setRole') {
    requireAdmin();
    $body   = getJsonBody();
    $userId = (int)($body['user_id'] ?? 0);
    $role   = $body['role'] ?? 'user';

    if (!in_array($role, ['user', 'admin'])) jsonError('Role inválido.');
    if (!$userId) jsonError('ID inválido.');

    DB::get()->prepare('UPDATE users SET role=? WHERE id=?')->execute([$role, $userId]);
    jsonSuccess(['message' => 'Role atualizado.']);
}

// ── ATIVAR / DESATIVAR UTILIZADOR ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'toggleUser') {
    requireAdmin();
    $body   = getJsonBody();
    $userId = (int)($body['user_id'] ?? 0);
    if (!$userId) jsonError('ID inválido.');

    $stmt = DB::get()->prepare('SELECT is_active FROM users WHERE id=?');
    $stmt->execute([$userId]);
    $current = $stmt->fetchColumn();
    $new = $current ? 0 : 1;

    DB::get()->prepare('UPDATE users SET is_active=? WHERE id=?')->execute([$new, $userId]);
    jsonSuccess(['is_active' => $new]);
}

// ── APAGAR UTILIZADOR ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'deleteUser') {
    requireAdmin();
    $userId = (int)($_GET['id'] ?? 0);
    if (!$userId) jsonError('ID inválido.');

    DB::get()->prepare('DELETE FROM users WHERE id=? AND role != "admin"')->execute([$userId]);
    jsonSuccess(['message' => 'Utilizador eliminado.']);
}

// ── APAGAR VERIFICAÇÃO ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'deleteScan') {
    requireAdmin();
    $scanId = (int)($_GET['id'] ?? 0);
    if (!$scanId) jsonError('ID inválido.');

    DB::get()->prepare('DELETE FROM scans WHERE id=?')->execute([$scanId]);
    jsonSuccess(['message' => 'Verificação eliminada.']);
}

jsonError('Ação inválida.', 404);
