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
if (empty($data['club_id']) || empty($data['action'])) jsonError('club_id and action required.', 422);
$clubId = (int)$data['club_id'];
$action = $data['action'];
$club = $db->prepare("SELECT id FROM club_profiles WHERE id=? AND is_deleted=0");
$club->execute([$clubId]);
if (!$club->fetch()) jsonError('Club not found.', 404);
switch ($action) {
    case 'verify':
        $db->prepare("UPDATE club_profiles SET verification_status='verified', verified_at=NOW(), verified_by=?, rejection_reason=NULL WHERE id=?")
           ->execute([$sess['user_id'], $clubId]);
        logAction($db, $sess['user_id'], 'club_verified', 'club', $clubId);
        // Notify club user
        $clubUser = $db->prepare("SELECT user_id FROM club_profiles WHERE id=?");
        $clubUser->execute([$clubId]);
        if ($cu = $clubUser->fetch()) {
            $db->prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)")->execute([
                $cu['user_id'], 'club_verified', 'Club Verified', 'Congratulations! Your club has been verified. You now have full access to GOG.'
            ]);
        }
        break;
    case 'reject':
        $reason = isset($data['reason']) ? substr(trim($data['reason']), 0, 500) : '';
        $db->prepare("UPDATE club_profiles SET verification_status='rejected', rejection_reason=?, verified_at=NOW(), verified_by=? WHERE id=?")
           ->execute([$reason, $sess['user_id'], $clubId]);
        logAction($db, $sess['user_id'], 'club_rejected', 'club', $clubId, ['reason' => $reason]);
        break;
    case 'revoke':
        $db->prepare("UPDATE club_profiles SET verification_status='rejected', rejection_reason='Verification revoked by administrator.' WHERE id=?")
           ->execute([$clubId]);
        logAction($db, $sess['user_id'], 'club_revoked', 'club', $clubId);
        break;
    default:
        jsonError('Invalid action.', 422);
}
jsonSuccess();
