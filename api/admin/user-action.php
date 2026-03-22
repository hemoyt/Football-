<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Method not allowed.', 405);
require_once __DIR__ . '/../../api/config.php';
$sess = requireSession('admin');
$db   = getDB();
$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['user_id']) || empty($data['action'])) jsonError('user_id and action required.', 422);
$userId = (int)$data['user_id'];
switch ($data['action']) {
    case 'suspend':
        $db->prepare("UPDATE users SET is_active=0 WHERE id=?")->execute([$userId]);
        logAction($db, $sess['user_id'], 'user_suspended', 'user', $userId);
        break;
    case 'activate':
        $db->prepare("UPDATE users SET is_active=1 WHERE id=?")->execute([$userId]);
        logAction($db, $sess['user_id'], 'user_activated', 'user', $userId);
        break;
    case 'delete':
        $db->prepare("UPDATE users SET is_deleted=1, is_active=0 WHERE id=?")->execute([$userId]);
        $db->prepare("UPDATE player_profiles SET is_deleted=1 WHERE user_id=?")->execute([$userId]);
        $db->prepare("UPDATE club_profiles   SET is_deleted=1 WHERE user_id=?")->execute([$userId]);
        logAction($db, $sess['user_id'], 'user_deleted', 'user', $userId);
        break;
    default:
        jsonError('Invalid action.', 422);
}
jsonSuccess();
