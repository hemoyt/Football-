<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
require_once __DIR__ . '/../../api/config.php';

$sess = requireSession('club');
$db   = getDB();

// Verify club is verified
$clubStmt = $db->prepare("SELECT verification_status FROM club_profiles WHERE user_id = ?");
$clubStmt->execute([$sess['user_id']]);
$club = $clubStmt->fetch();
if (!$club || $club['verification_status'] !== 'verified') {
    jsonError('Club not verified. Only verified clubs can search players.', 403);
}

$page    = max(1, (int)($_GET['page']    ?? 1));
$perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
$offset  = ($page - 1) * $perPage;

$where  = ["u.is_active = 1", "u.is_deleted = 0"];
$params = [];

if (!empty($_GET['position'])) {
    $where[]  = "pp.position_primary = ?";
    $params[] = $_GET['position'];
}
if (!empty($_GET['nationality'])) {
    $where[]  = "pp.nationality LIKE ?";
    $params[] = '%' . $_GET['nationality'] . '%';
}
if (!empty($_GET['foot'])) {
    $where[]  = "pp.preferred_foot = ?";
    $params[] = $_GET['foot'];
}
if (!empty($_GET['age_min'])) {
    $maxDob   = date('Y-m-d', strtotime('-' . (int)$_GET['age_min'] . ' years'));
    $where[]  = "pp.date_of_birth <= ?";
    $params[] = $maxDob;
}
if (!empty($_GET['age_max'])) {
    $minDob   = date('Y-m-d', strtotime('-' . ((int)$_GET['age_max'] + 1) . ' years + 1 day'));
    $where[]  = "pp.date_of_birth >= ?";
    $params[] = $minDob;
}
if (!empty($_GET['height_min'])) {
    $where[]  = "pp.height_cm >= ?";
    $params[] = (int)$_GET['height_min'];
}

$whereClause = implode(' AND ', $where);

// Count total
$countStmt = $db->prepare("
    SELECT COUNT(*) FROM player_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE $whereClause
");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();
$pages = (int)ceil($total / $perPage);

// Fetch players
$stmt = $db->prepare("
    SELECT pp.id, pp.full_name, pp.date_of_birth, pp.position_primary,
           pp.position_secondary, pp.nationality, pp.photo_url,
           pp.height_cm, pp.preferred_foot, pp.country_residence
    FROM player_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE $whereClause
    ORDER BY pp.updated_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute(array_merge($params, [$perPage, $offset]));
$players = $stmt->fetchAll();

jsonSuccess(['players' => $players, 'total' => $total, 'pages' => max(1,$pages), 'page' => $page]);
