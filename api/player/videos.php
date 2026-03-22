<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// -----------------------------------------------------------------------
// GET — list videos for a player
// -----------------------------------------------------------------------
if ($method === 'GET') {
    $session  = requireSessionMulti(['player', 'club', 'admin']);
    $targetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    try {
        $db = getDB();

        if ($targetId > 0) {
            $stmt = $db->prepare(
                "SELECT pv.*
                 FROM player_videos pv
                 JOIN player_profiles pp ON pp.id = pv.player_id
                 JOIN users u ON u.id = pp.user_id
                 WHERE pv.player_id = ?
                   AND u.is_deleted = 0
                 ORDER BY pv.created_at DESC"
            );
            $stmt->execute([$targetId]);
        } else {
            if ($session['role'] !== 'player') {
                jsonError('A player id is required.', 400);
            }
            $stmt = $db->prepare(
                "SELECT pv.*
                 FROM player_videos pv
                 JOIN player_profiles pp ON pp.id = pv.player_id
                 WHERE pp.user_id = ?
                 ORDER BY pv.created_at DESC"
            );
            $stmt->execute([$session['user_id']]);
        }

        jsonSuccess($stmt->fetchAll());

    } catch (PDOException $e) {
        error_log('videos GET DB error: ' . $e->getMessage());
        jsonError('A server error occurred.', 500);
    }

// -----------------------------------------------------------------------
// POST — add a new video entry (URL-based, not upload)
// -----------------------------------------------------------------------
} elseif ($method === 'POST') {
    $session = requireSession('player');

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        jsonError('Invalid JSON body.');
    }

    $url   = isset($body['video_url']) ? trim((string)$body['video_url']) : (isset($body['url']) ? trim((string)$body['url']) : '');
    $type  = isset($body['video_type']) ? trim((string)$body['video_type']) : (isset($body['type']) ? trim((string)$body['type']) : 'youtube');
    $title = isset($body['title']) ? trim((string)$body['title']) : null;

    if ($url === '') {
        jsonError('video_url is required.');
    }

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        jsonError('Invalid URL format.');
    }

    $allowedTypes = ['youtube', 'vimeo', 'upload'];
    if (!in_array($type, $allowedTypes, true)) {
        jsonError('video_type must be one of: youtube, vimeo, upload.');
    }

    try {
        $db = getDB();

        $profStmt = $db->prepare("SELECT id FROM player_profiles WHERE user_id = ? LIMIT 1");
        $profStmt->execute([$session['user_id']]);
        $profile = $profStmt->fetch();
        if (!$profile) {
            jsonError('Player profile not found.', 404);
        }

        $insStmt = $db->prepare(
            "INSERT INTO player_videos (player_id, video_url, video_type, title, created_at)
             VALUES (?, ?, ?, ?, NOW())"
        );
        $insStmt->execute([$profile['id'], $url, $type, $title]);
        $videoId = (int)$db->lastInsertId();

        $sel = $db->prepare("SELECT * FROM player_videos WHERE id = ? LIMIT 1");
        $sel->execute([$videoId]);

        jsonSuccess($sel->fetch(), 201);

    } catch (PDOException $e) {
        error_log('videos POST DB error: ' . $e->getMessage());
        jsonError('A server error occurred.', 500);
    }

} else {
    jsonError('Method not allowed.', 405);
}
