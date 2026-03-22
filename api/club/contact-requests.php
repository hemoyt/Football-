<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('club');
$db   = getDB();
$clubRow = $db->prepare("SELECT id FROM club_profiles WHERE user_id=? AND is_deleted=0");
$clubRow->execute([$sess['user_id']]);
$club = $clubRow->fetch();
if (!$club) jsonError('Club not found.', 404);
$stmt = $db->prepare("
    SELECT cr.id, cr.status, cr.message, cr.sent_at, cr.responded_at,
           pp.full_name AS player_name, pp.position_primary, pp.photo_url, pp.id AS player_id
    FROM contact_requests cr
    JOIN player_profiles pp ON pp.id = cr.player_id
    WHERE cr.club_id = ?
    ORDER BY cr.sent_at DESC
");
$stmt->execute([$club['id']]);
jsonSuccess($stmt->fetchAll());
