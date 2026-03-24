<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed.', 405);
}

$session = requireSessionMulti(['player', 'club', 'admin']);

$targetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    $db = getDB();

    if ($targetId > 0) {
        // Specific player profile id
        $stmt = $db->prepare(
            "SELECT pch.*
             FROM player_career_history pch
             JOIN player_profiles pp ON pp.id = pch.player_id
             JOIN users u ON u.id = pp.user_id
             WHERE pch.player_id = ?
               AND u.is_deleted = 0
             ORDER BY pch.sort_order ASC, pch.id DESC"
        );
        $stmt->execute([$targetId]);
    } else {
        if ($session['role'] !== 'player') {
            jsonError('A player id is required.', 400);
        }

        $stmt = $db->prepare(
            "SELECT pch.*
             FROM player_career_history pch
             JOIN player_profiles pp ON pp.id = pch.player_id
             WHERE pp.user_id = ?
             ORDER BY pch.sort_order ASC, pch.id DESC"
        );
        $stmt->execute([$session['user_id']]);
    }

    $career = $stmt->fetchAll();

    jsonSuccess($career);

} catch (PDOException $e) {
    error_log('career DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
