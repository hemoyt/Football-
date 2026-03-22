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

$session = requireSession('player');

if (!isset($_FILES['video']) || $_FILES['video']['error'] === UPLOAD_ERR_NO_FILE) {
    jsonError('No video file provided.');
}

$file = $_FILES['video'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form size limit.',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        UPLOAD_ERR_EXTENSION  => 'Upload blocked by server extension.',
    ];
    $errMsg = $uploadErrors[$file['error']] ?? ('Upload error. Code: ' . $file['error']);
    jsonError($errMsg, 400);
}

// Validate file size
if ($file['size'] > MAX_VIDEO_SIZE) {
    jsonError('Video exceeds maximum allowed size of 500MB.');
}

// Validate MIME type server-side
$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, ALLOWED_VIDEO_TYPES, true)) {
    jsonError('Invalid video type. Allowed: MP4, WebM, OGG, AVI, MOV.');
}

// Ensure upload directory exists
$uploadDir = UPLOAD_BASE . 'videos/';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
    jsonError('Server error: could not create upload directory.', 500);
}

// Build safe unique filename
$ext         = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$safeExt     = sanitizeFilename($ext);
$uniqueName  = bin2hex(random_bytes(16)) . '.' . $safeExt;
$destination = $uploadDir . $uniqueName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    jsonError('Failed to save uploaded video.', 500);
}

$videoUrl = UPLOAD_URL_BASE . 'videos/' . $uniqueName;

try {
    $db = getDB();

    // Get player profile id
    $profStmt = $db->prepare("SELECT id FROM player_profiles WHERE user_id = ? LIMIT 1");
    $profStmt->execute([$session['user_id']]);
    $profile = $profStmt->fetch();

    if (!$profile) {
        // Clean up uploaded file
        @unlink($destination);
        jsonError('Player profile not found.', 404);
    }

    $title = isset($_POST['title']) ? trim((string)$_POST['title']) : null;

    $insStmt = $db->prepare(
        "INSERT INTO player_videos (player_profile_id, url, type, title, created_at)
         VALUES (?, ?, 'upload', ?, NOW())"
    );
    $insStmt->execute([$profile['id'], $videoUrl, $title]);
    $videoId = (int)$db->lastInsertId();

    $sel = $db->prepare("SELECT * FROM player_videos WHERE id = ? LIMIT 1");
    $sel->execute([$videoId]);
    $video = $sel->fetch();

    jsonSuccess(['url' => $videoUrl, 'video' => $video], 201);

} catch (PDOException $e) {
    // Clean up on DB failure
    @unlink($destination);
    error_log('upload-video DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
