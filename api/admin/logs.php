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
$perPage = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
$offset  = ($page - 1) * $perPage;
$total   = (int)$db->query("SELECT COUNT(*) FROM system_logs")->fetchColumn();
$pages   = (int)ceil($total / $perPage);
$stmt    = $db->prepare("
    SELECT sl.id, sl.action, sl.target_type, sl.target_id, sl.meta, sl.created_at,
           u.email AS actor_email
    FROM system_logs sl
    LEFT JOIN users u ON u.id = sl.actor_id
    ORDER BY sl.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([$perPage, $offset]);
jsonSuccess(['logs' => $stmt->fetchAll(), 'total' => $total, 'pages' => max(1,$pages), 'page' => $page]);
