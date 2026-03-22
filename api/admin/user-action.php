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

$userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;
$action = isset($body['action'])  ? trim((string)$body['action']) : '';

if ($userId <= 0) {
    jsonError('A valid user_id is required.');
}

$allowedActions = ['suspend', 'activate', 'delete'];
if (!in_array($action, $allowedActions, true)) {
    jsonError("action must be one of: suspend, activate, delete.");
}

// Prevent admin from acting on themselves
if ($userId === (int)$session['user_id']) {
    jsonError('You cannot perform this action on your own account.', 403);
}

try {
    $db = getDB();

    // Verify user exists
    $userStmt = $db->prepare("SELECT id, role, is_deleted FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();

    if (!$user || (int)$user['is_deleted'] === 1) {
        jsonError('User not found.', 404);
    }

    // Prevent deleting other admins
    if ($user['role'] === 'admin' && $action === 'delete') {
        jsonError('Admin accounts cannot be deleted through this endpoint.', 403);
    }

    $db->beginTransaction();

    switch ($action) {
        case 'suspend':
            $db->prepare("UPDATE users SET is_active = 0 WHERE id = ?")
               ->execute([$userId]);
            logAction($db, $session['user_id'], 'user_suspended', 'user', $userId);
            break;

        case 'activate':
            $db->prepare("UPDATE users SET is_active = 1 WHERE id = ?")
               ->execute([$userId]);
            logAction($db, $session['user_id'], 'user_activated', 'user', $userId);
            break;

        case 'delete':
            // Soft delete: mark user and associated profiles
            $db->prepare("UPDATE users SET is_deleted = 1, is_active = 0 WHERE id = ?")
               ->execute([$userId]);

            if ($user['role'] === 'player') {
                $db->prepare("UPDATE player_profiles SET is_deleted = 1 WHERE user_id = ?")
                   ->execute([$userId]);
            } elseif ($user['role'] === 'club') {
                $db->prepare("UPDATE club_profiles SET is_deleted = 1 WHERE user_id = ?")
                   ->execute([$userId]);
            }

            logAction($db, $session['user_id'], 'user_deleted', 'user', $userId);
            break;
    }

    $db->commit();

    jsonSuccess(['success' => true]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('admin/user-action DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
