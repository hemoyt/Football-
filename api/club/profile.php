<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
require_once __DIR__ . '/../../api/config.php';

$sess = requireSession('club');
$db   = getDB();

$stmt = $db->prepare("
    SELECT cp.*, u.email
    FROM club_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.user_id = ?
");
$stmt->execute([$sess['user_id']]);
$club = $stmt->fetch();
if (!$club) jsonError('Club profile not found.', 404);
unset($club['doc_url']); // don't expose doc path publicly
jsonSuccess($club);
