<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

$method = $_SERVER['REQUEST_METHOD'];

// -----------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------
if ($method === 'GET') {
    $targetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($targetId > 0) {
        // Club or player can view a specific player's public profile
        $session = requireSessionMulti(['club', 'player', 'admin']);

        try {
            $db = getDB();

            $stmt = $db->prepare(
                "SELECT pp.*, u.email
                 FROM player_profiles pp
                 JOIN users u ON u.id = pp.user_id
                 WHERE pp.id = ?
                   AND u.is_deleted = 0
                 LIMIT 1"
            );
            $stmt->execute([$targetId]);
            $player = $stmt->fetch();

            if (!$player) {
                jsonError('Player not found.', 404);
            }

            // Log view if caller is a club
            if ($session['role'] === 'club') {
                // Fetch club_profile id
                $cStmt = $db->prepare("SELECT id FROM club_profiles WHERE user_id = ? LIMIT 1");
                $cStmt->execute([$session['user_id']]);
                $club = $cStmt->fetch();

                if ($club) {
                    $logStmt = $db->prepare(
                        "INSERT INTO profile_views_log (player_profile_id, club_profile_id, viewed_at)
                         VALUES (?, ?, NOW())"
                    );
                    $logStmt->execute([$targetId, $club['id']]);

                    $updStmt = $db->prepare(
                        "UPDATE player_profiles SET profile_views = profile_views + 1 WHERE id = ?"
                    );
                    $updStmt->execute([$targetId]);
                    $player['profile_views'] = (int)$player['profile_views'] + 1;
                }
            }

            unset($player['password_hash']);
            jsonSuccess($player);

        } catch (PDOException $e) {
            error_log('Player profile (GET id) DB error: ' . $e->getMessage());
            jsonError('A server error occurred.', 500);
        }

    } else {
        // Own profile — must be a player
        $session = requireSession('player');

        try {
            $db = getDB();

            $stmt = $db->prepare(
                "SELECT pp.*, u.email
                 FROM player_profiles pp
                 JOIN users u ON u.id = pp.user_id
                 WHERE pp.user_id = ?
                 LIMIT 1"
            );
            $stmt->execute([$session['user_id']]);
            $player = $stmt->fetch();

            if (!$player) {
                jsonError('Player profile not found.', 404);
            }

            unset($player['password_hash']);
            jsonSuccess($player);

        } catch (PDOException $e) {
            error_log('Player profile (GET self) DB error: ' . $e->getMessage());
            jsonError('A server error occurred.', 500);
        }
    }

// -----------------------------------------------------------------------
// PUT — update bio / social links
// -----------------------------------------------------------------------
} elseif ($method === 'PUT') {
    $session = requireSession('player');

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        jsonError('Invalid JSON body.');
    }

    $bio          = isset($body['bio'])           ? trim((string)$body['bio'])           : null;
    $instagramUrl = isset($body['instagram_url']) ? trim((string)$body['instagram_url']) : null;
    $youtubeUrl   = isset($body['youtube_url'])   ? trim((string)$body['youtube_url'])   : null;

    if ($instagramUrl !== null && $instagramUrl !== '' && !filter_var($instagramUrl, FILTER_VALIDATE_URL)) {
        jsonError('Invalid instagram_url.');
    }
    if ($youtubeUrl !== null && $youtubeUrl !== '' && !filter_var($youtubeUrl, FILTER_VALIDATE_URL)) {
        jsonError('Invalid youtube_url.');
    }

    try {
        $db = getDB();

        $stmt = $db->prepare(
            "UPDATE player_profiles
             SET bio = ?, instagram_url = ?, youtube_url = ?, updated_at = NOW()
             WHERE user_id = ?"
        );
        $stmt->execute([$bio, $instagramUrl, $youtubeUrl, $session['user_id']]);

        // Return updated profile
        $sel = $db->prepare(
            "SELECT pp.*, u.email
             FROM player_profiles pp
             JOIN users u ON u.id = pp.user_id
             WHERE pp.user_id = ?
             LIMIT 1"
        );
        $sel->execute([$session['user_id']]);
        $player = $sel->fetch();
        unset($player['password_hash']);

        jsonSuccess($player);

    } catch (PDOException $e) {
        error_log('Player profile (PUT) DB error: ' . $e->getMessage());
        jsonError('A server error occurred.', 500);
    }

} else {
    jsonError('Method not allowed.', 405);
}
