<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed.', 405);
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('club');
$db   = getDB();
$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['player_id'])) jsonError('player_id required.', 422);
$clubRow = $db->prepare("SELECT id FROM club_profiles WHERE user_id=? AND is_deleted=0 AND verification_status='verified'");
$clubRow->execute([$sess['user_id']]);
$club = $clubRow->fetch();
if (!$club) jsonError('Club not verified.', 403);
$playerId = (int)$data['player_id'];
$message  = isset($data['message']) ? substr(trim($data['message']), 0, 500) : null;
// Check player exists
$playerRow = $db->prepare("SELECT id, user_id FROM player_profiles WHERE id=? AND is_deleted=0");
$playerRow->execute([$playerId]);
$player = $playerRow->fetch();
if (!$player) jsonError('Player not found.', 404);
try {
    $db->prepare("INSERT INTO contact_requests (club_id, player_id, message) VALUES (?,?,?)")->execute([$club['id'], $playerId, $message]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') jsonError('Contact request already sent to this player.', 409);
    jsonError('Failed to send request.', 500);
}
// Notify player
$clubName = $db->prepare("SELECT club_name FROM club_profiles WHERE id=?")->execute([$club['id']]);
$db->prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)")->execute([
    $player['user_id'], 'contact_request',
    'New Contact Request',
    'A verified club has sent you a contact request.'
]);
jsonSuccess(['message' => 'Contact request sent successfully.']);
