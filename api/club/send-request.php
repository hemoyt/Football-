<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

$session = requireSession('club');

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

$playerId = isset($body['player_id']) ? (int)$body['player_id'] : 0;
$message  = isset($body['message'])   ? trim((string)$body['message']) : '';

if ($playerId <= 0) {
    jsonError('A valid player_id is required.');
}

if ($message === '') {
    jsonError('A message is required.');
}

if (mb_strlen($message) > 500) {
    jsonError('Message must not exceed 500 characters.');
}

try {
    $db = getDB();

    // Get club profile and verify it is verified
    $clubStmt = $db->prepare(
        "SELECT id, verification_status FROM club_profiles WHERE user_id = ? LIMIT 1"
    );
    $clubStmt->execute([$session['user_id']]);
    $club = $clubStmt->fetch();

    if (!$club) {
        jsonError('Club profile not found.', 404);
    }

    if ($club['verification_status'] !== 'verified') {
        jsonError('Your club must be verified before sending contact requests.', 403);
    }

    // Verify the target player exists and is active
    $playerStmt = $db->prepare(
        "SELECT pp.id, pp.user_id FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE pp.id = ? AND u.is_deleted = 0 AND u.is_active = 1
         LIMIT 1"
    );
    $playerStmt->execute([$playerId]);
    $player = $playerStmt->fetch();

    if (!$player) {
        jsonError('Player not found or inactive.', 404);
    }

    // Check for existing request (before insert, to give a cleaner error)
    $dupStmt = $db->prepare(
        "SELECT id FROM contact_requests
         WHERE club_id = ? AND player_id = ?
         LIMIT 1"
    );
    $dupStmt->execute([$club['id'], $playerId]);
    if ($dupStmt->fetch()) {
        jsonError('Contact request already sent.', 409);
    }

    $db->beginTransaction();

    // Insert contact request
    $insStmt = $db->prepare(
        "INSERT INTO contact_requests (club_id, player_id, message, status, sent_at)
         VALUES (?, ?, ?, 'pending', NOW())"
    );
    $insStmt->execute([$club['id'], $playerId, $message]);
    $requestId = (int)$db->lastInsertId();

    // Notify the player
    $notifStmt = $db->prepare(
        "INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
         VALUES (?, 'contact_request', 'New Contact Request', 'A verified club has sent you a contact request.', 0, NOW())"
    );
    $notifStmt->execute([$player['user_id']]);

    $db->commit();

    jsonSuccess(['success' => true, 'request_id' => $requestId], 201);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('send-request DB error: ' . $e->getMessage());
    // Handle unique constraint violation as a race condition fallback
    if ($e->getCode() === '23000') {
        jsonError('Contact request already sent.', 409);
    }
    jsonError('A server error occurred.', 500);
}
