<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { jsonError('Method not allowed.', 405); }
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('club');
$db   = getDB();
$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['player_id'])) jsonError('player_id required.', 422);
$club = $db->prepare("SELECT id FROM club_profiles WHERE user_id=? AND is_deleted=0 AND verification_status='verified'");
$club->execute([$sess['user_id']]);
$clubRow = $club->fetch();
if (!$clubRow) jsonError('Club not verified.', 403);
try {
    $db->prepare("INSERT IGNORE INTO saved_players (club_id, player_id) VALUES (?,?)")->execute([$clubRow['id'], (int)$data['player_id']]);
} catch (PDOException $e) { jsonError('Failed to save player.', 500); }
jsonSuccess();
