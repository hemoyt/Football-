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
$total   = (int)$db->query("SELECT COUNT(*) FROM club_profiles WHERE is_deleted=0")->fetchColumn();
$pages   = (int)ceil($total / $perPage);
$stmt    = $db->prepare("
    SELECT cp.id, cp.club_name, cp.country, cp.league_division,
           cp.contact_person_name, cp.verification_status, cp.verified_at,
           cp.rejection_reason, cp.created_at,
           u.id AS user_id, u.email, u.is_active
    FROM club_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.is_deleted = 0
    ORDER BY cp.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([$perPage, $offset]);
jsonSuccess(['clubs' => $stmt->fetchAll(), 'total' => $total, 'pages' => max(1,$pages), 'page' => $page]);
