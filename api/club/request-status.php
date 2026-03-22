<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('club');
$db   = getDB();
if (empty($_GET['player_id'])) jsonError('player_id required.', 422);
$clubRow = $db->prepare("SELECT id FROM club_profiles WHERE user_id=? AND is_deleted=0");
$clubRow->execute([$sess['user_id']]);
$club = $clubRow->fetch();
if (!$club) jsonError('Club not found.', 404);
$stmt = $db->prepare("SELECT status FROM contact_requests WHERE club_id=? AND player_id=?");
$stmt->execute([$club['id'], (int)$_GET['player_id']]);
$req = $stmt->fetch();
jsonSuccess(['status' => $req ? $req['status'] : null]);
