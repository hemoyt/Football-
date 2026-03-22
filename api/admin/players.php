<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
requireSession('admin');
$db      = getDB();
$page    = max(1, (int)($_GET['page']    ?? 1));
$perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
$offset  = ($page - 1) * $perPage;
$total   = (int)$db->query("SELECT COUNT(*) FROM player_profiles pp JOIN users u ON u.id=pp.user_id WHERE pp.is_deleted=0")->fetchColumn();
$pages   = (int)ceil($total / $perPage);
$stmt    = $db->prepare("
    SELECT pp.id AS player_id, pp.full_name, pp.position_primary, pp.nationality, pp.created_at,
           u.id AS user_id, u.email, u.is_active, u.is_deleted
    FROM player_profiles pp
    JOIN users u ON u.id = pp.user_id
    WHERE pp.is_deleted = 0
    ORDER BY pp.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([$perPage, $offset]);
jsonSuccess(['players' => $stmt->fetchAll(), 'total' => $total, 'pages' => max(1,$pages), 'page' => $page]);
