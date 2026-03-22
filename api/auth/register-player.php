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

if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

// Required fields
$required = ['full_name', 'email', 'password', 'date_of_birth', 'nationality', 'country_residence', 'position_primary', 'preferred_foot'];
foreach ($required as $field) {
    if (!isset($body[$field]) || trim((string)$body[$field]) === '') {
        jsonError("Field '{$field}' is required.");
    }
}

$fullName         = trim((string)$body['full_name']);
$email            = trim((string)$body['email']);
$password         = (string)$body['password'];
$dateOfBirth      = trim((string)$body['date_of_birth']);
$nationality      = trim((string)$body['nationality']);
$countryResidence = trim((string)$body['country_residence']);
$positionPrimary  = trim((string)$body['position_primary']);
$preferredFoot    = trim((string)$body['preferred_foot']);

// Optional fields
$positionSecondary = isset($body['position_secondary']) ? trim((string)$body['position_secondary']) : null;
$heightCm          = isset($body['height_cm'])          ? (int)$body['height_cm']                   : null;
$weightKg          = isset($body['weight_kg'])          ? (float)$body['weight_kg']                 : null;
$bio               = isset($body['bio'])                ? trim((string)$body['bio'])                : null;
$instagramUrl      = isset($body['instagram_url'])      ? trim((string)$body['instagram_url'])      : null;
$youtubeUrl        = isset($body['youtube_url'])        ? trim((string)$body['youtube_url'])        : null;

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email address.');
}

// Validate password length
if (strlen($password) < 8) {
    jsonError('Password must be at least 8 characters long.');
}

// Validate date of birth
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateOfBirth)) {
    jsonError('date_of_birth must be in YYYY-MM-DD format.');
}
$dobTimestamp = strtotime($dateOfBirth);
if ($dobTimestamp === false || $dobTimestamp > time()) {
    jsonError('Invalid date_of_birth.');
}

// Validate preferred_foot
$allowedFeet = ['left', 'right', 'both'];
if (!in_array(strtolower($preferredFoot), $allowedFeet, true)) {
    jsonError('preferred_foot must be one of: left, right, both.');
}
$preferredFoot = strtolower($preferredFoot);

// Validate optional URLs
if ($instagramUrl !== null && $instagramUrl !== '' && !filter_var($instagramUrl, FILTER_VALIDATE_URL)) {
    jsonError('Invalid instagram_url.');
}
if ($youtubeUrl !== null && $youtubeUrl !== '' && !filter_var($youtubeUrl, FILTER_VALIDATE_URL)) {
    jsonError('Invalid youtube_url.');
}

try {
    $db = getDB();

    // Check email uniqueness
    $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        jsonError('An account with this email address already exists.', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $db->beginTransaction();

    // Insert into users
    $userStmt = $db->prepare(
        "INSERT INTO users (email, password_hash, role, is_active, is_deleted, created_at)
         VALUES (?, ?, 'player', 1, 0, NOW())"
    );
    $userStmt->execute([$email, $passwordHash]);
    $userId = (int)$db->lastInsertId();

    // Insert into player_profiles
    $profileStmt = $db->prepare(
        "INSERT INTO player_profiles
         (user_id, full_name, date_of_birth, nationality, country_residence, position_primary,
          position_secondary, preferred_foot, height_cm, weight_kg, bio, instagram_url,
          youtube_url, photo_url, profile_views, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NOW())"
    );
    $profileStmt->execute([
        $userId, $fullName, $dateOfBirth, $nationality, $countryResidence,
        $positionPrimary, $positionSecondary, $preferredFoot,
        $heightCm, $weightKg, $bio, $instagramUrl, $youtubeUrl
    ]);
    $profileId = (int)$db->lastInsertId();

    // Insert default player_skills record
    $skillsStmt = $db->prepare(
        "INSERT INTO player_skills (player_id, speed, dribbling, shooting, passing, defending, heading)
         VALUES (?, 50, 50, 50, 50, 50, 50)"
    );
    $skillsStmt->execute([$profileId]);

    $db->commit();

    // Set session
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['role']    = 'player';
    $_SESSION['email']   = $email;

    jsonSuccess([
        'success' => true,
        'data' => [
            'id'               => $profileId,
            'user_id'          => $userId,
            'email'            => $email,
            'role'             => 'player',
            'full_name'        => $fullName,
            'date_of_birth'    => $dateOfBirth,
            'nationality'      => $nationality,
            'country_residence' => $countryResidence,
            'position_primary' => $positionPrimary,
            'preferred_foot'   => $preferredFoot,
            'height_cm'        => $heightCm,
            'weight_kg'        => $weightKg,
            'bio'              => $bio,
            'instagram_url'    => $instagramUrl,
            'youtube_url'      => $youtubeUrl,
        ],
    ], 201);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Register player DB error: ' . $e->getMessage());
    // Check for duplicate email (race condition)
    if ($e->getCode() === '23000') {
        jsonError('An account with this email address already exists.', 409);
    }
    jsonError('A server error occurred. Please try again later.', 500);
}
