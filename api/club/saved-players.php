<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('club');
$db   = getDB();
$club = $db->prepare("SELECT id FROM club_profiles WHERE user_id=? AND is_deleted=0");
$club->execute([$sess['user_id']]);
$clubRow = $club->fetch();
if (!$clubRow) jsonError('Club not found.', 404);
$stmt = $db->prepare("
    SELECT pp.id, pp.full_name, pp.date_of_birth, pp.position_primary,
           pp.nationality, pp.photo_url, pp.height_cm, pp.preferred_foot,
           sp.saved_at
    FROM saved_players sp
    JOIN player_profiles pp ON pp.id = sp.player_id
    JOIN users u ON u.id = pp.user_id
    WHERE sp.club_id = ? AND pp.is_deleted = 0 AND u.is_active = 1
    ORDER BY sp.saved_at DESC
");
$stmt->execute([$clubRow['id']]);
jsonSuccess($stmt->fetchAll());
