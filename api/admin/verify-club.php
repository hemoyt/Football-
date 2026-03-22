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

$session = requireSession('admin');

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

$clubId = isset($body['club_id']) ? (int)$body['club_id'] : 0;
$action = isset($body['action']) ? trim((string)$body['action']) : '';
$reason = isset($body['reason']) ? trim((string)$body['reason']) : '';

if ($clubId <= 0) {
    jsonError('A valid club_id is required.');
}

$allowedActions = ['verify', 'reject', 'revoke'];
if (!in_array($action, $allowedActions, true)) {
    jsonError("action must be one of: verify, reject, revoke.");
}

if (($action === 'reject') && $reason === '') {
    jsonError('A reason is required when rejecting a club.');
}

try {
    $db = getDB();

    // Verify the club exists and is not deleted
    $clubStmt = $db->prepare(
        "SELECT cp.id, cp.user_id, cp.verification_status
         FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.id = ? AND u.is_deleted = 0
         LIMIT 1"
    );
    $clubStmt->execute([$clubId]);
    $club = $clubStmt->fetch();

    if (!$club) {
        jsonError('Club not found.', 404);
    }

    switch ($action) {
        case 'verify':
            $db->prepare(
                "UPDATE club_profiles
                 SET verification_status = 'verified',
                     verified_at = NOW(),
                     verified_by = ?,
                     rejection_reason = NULL
                 WHERE id = ?"
            )->execute([$session['user_id'], $clubId]);

            logAction($db, $session['user_id'], 'club_verified', 'club', $clubId);

            // Notify the club's user
            $db->prepare(
                "INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
                 VALUES (?, 'club_verified', 'Club Verified', 'Congratulations! Your club has been verified. You now have full access to GOG.', 0, NOW())"
            )->execute([$club['user_id']]);
            break;

        case 'reject':
            $db->prepare(
                "UPDATE club_profiles
                 SET verification_status = 'rejected',
                     verified_at = NOW(),
                     verified_by = ?,
                     rejection_reason = ?
                 WHERE id = ?"
            )->execute([$session['user_id'], $reason, $clubId]);

            logAction($db, $session['user_id'], 'club_rejected', 'club', $clubId, ['reason' => $reason]);

            // Notify the club's user
            $db->prepare(
                "INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
                 VALUES (?, 'club_rejected', 'Verification Rejected', ?, 0, NOW())"
            )->execute([
                $club['user_id'],
                'Your club verification was rejected. Reason: ' . $reason,
            ]);
            break;

        case 'revoke':
            $db->prepare(
                "UPDATE club_profiles
                 SET verification_status = 'rejected',
                     verified_by = ?,
                     rejection_reason = 'Verification revoked by administrator.'
                 WHERE id = ?"
            )->execute([$session['user_id'], $clubId]);

            logAction($db, $session['user_id'], 'club_revoked', 'club', $clubId);

            // Notify the club's user
            $db->prepare(
                "INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
                 VALUES (?, 'club_revoked', 'Verification Revoked', 'Your club verification has been revoked by an administrator.', 0, NOW())"
            )->execute([$club['user_id']]);
            break;
    }

    jsonSuccess(['success' => true]);

} catch (PDOException $e) {
    error_log('admin/verify-club DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
