<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!isset($body['email'], $body['password'])) {
    jsonError('Email and password are required.');
}

$email    = trim((string)$body['email']);
$password = (string)$body['password'];

if ($email === '' || $password === '') {
    jsonError('Email and password must not be empty.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email address.');
}

try {
    $db = getDB();

    $stmt = $db->prepare(
        "SELECT id, email, password_hash, role, is_active, is_deleted
         FROM users
         WHERE email = ?
         LIMIT 1"
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Invalid email or password.', 401);
    }

    if ((int)$user['is_deleted'] === 1) {
        jsonError('This account has been removed.', 403);
    }

    if ((int)$user['is_active'] !== 1) {
        jsonError('Your account is suspended. Please contact support.', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        jsonError('Invalid email or password.', 401);
    }

    // Regenerate session ID to prevent session fixation
    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['role']    = $user['role'];
    $_SESSION['email']   = $user['email'];

    // Update last login timestamp
    $upd = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $upd->execute([$user['id']]);

    $response = [
        'success' => true,
        'data' => [
            'id'    => (int)$user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ],
    ];

    // If the user is a club, include verification_status
    if ($user['role'] === 'club') {
        $cStmt = $db->prepare(
            "SELECT verification_status FROM club_profiles WHERE user_id = ? LIMIT 1"
        );
        $cStmt->execute([$user['id']]);
        $club = $cStmt->fetch();
        if ($club) {
            $response['data']['verification_status'] = $club['verification_status'];
        }
    }

    jsonSuccess($response);

} catch (PDOException $e) {
    error_log('Login DB error: ' . $e->getMessage());
    jsonError('A server error occurred. Please try again later.', 500);
}
