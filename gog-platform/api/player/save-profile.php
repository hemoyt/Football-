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

try {
    $db = getDB();

    // Fetch existing player_profile id for this user
    $profStmt = $db->prepare("SELECT id FROM player_profiles WHERE user_id = ? LIMIT 1");
    $profStmt->execute([$session['user_id']]);
    $profile = $profStmt->fetch();
    if (!$profile) {
        jsonError('Player profile not found.', 404);
    }
    $profileId = (int)$profile['id'];

    // -----------------------------------------------------------------------
    // Photo upload
    // -----------------------------------------------------------------------
    $photoUrl = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        $file = $_FILES['photo'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            jsonError('Photo upload error. Code: ' . $file['error']);
        }

        if ($file['size'] > MAX_PHOTO_SIZE) {
            jsonError('Photo exceeds maximum allowed size of 5MB.');
        }

        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, ALLOWED_PHOTO_TYPES, true)) {
            jsonError('Invalid photo type. Allowed: JPEG, PNG, WebP, GIF.');
        }

        $uploadDir = UPLOAD_BASE . 'photos/';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            jsonError('Server error: could not create upload directory.', 500);
        }

        $ext         = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeExt     = sanitizeFilename($ext);
        $uniqueName  = bin2hex(random_bytes(16)) . '.' . $safeExt;
        $destination = $uploadDir . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            jsonError('Failed to save photo.', 500);
        }

        $photoUrl = UPLOAD_URL_BASE . 'photos/' . $uniqueName;
    }

    // -----------------------------------------------------------------------
    // Text fields from $_POST
    // -----------------------------------------------------------------------
    $bio          = isset($_POST['bio'])           ? trim((string)$_POST['bio'])           : null;
    $instagramUrl = isset($_POST['instagram_url']) ? trim((string)$_POST['instagram_url']) : null;
    $youtubeUrl   = isset($_POST['youtube_url'])   ? trim((string)$_POST['youtube_url'])   : null;

    if ($instagramUrl !== null && $instagramUrl !== '' && !filter_var($instagramUrl, FILTER_VALIDATE_URL)) {
        jsonError('Invalid instagram_url.');
    }
    if ($youtubeUrl !== null && $youtubeUrl !== '' && !filter_var($youtubeUrl, FILTER_VALIDATE_URL)) {
        jsonError('Invalid youtube_url.');
    }

    $db->beginTransaction();

    // Build UPDATE for player_profiles
    $fields = ['bio = ?', 'instagram_url = ?', 'youtube_url = ?', 'updated_at = NOW()'];
    $params = [$bio, $instagramUrl, $youtubeUrl];

    if ($photoUrl !== null) {
        $fields[] = 'photo_url = ?';
        $params[]  = $photoUrl;
    }

    $params[] = $profileId;
    $sql = "UPDATE player_profiles SET " . implode(', ', $fields) . " WHERE id = ?";
    $db->prepare($sql)->execute($params);

    // -----------------------------------------------------------------------
    // Skills update
    // -----------------------------------------------------------------------
    $skillFields = ['speed', 'dribbling', 'shooting', 'passing', 'defending', 'heading'];
    $skillParams = [];
    $skillSet    = [];

    foreach ($skillFields as $sf) {
        if (isset($_POST[$sf])) {
            $val = (int)$_POST[$sf];
            if ($val < 0 || $val > 100) {
                $db->rollBack();
                jsonError("Skill '{$sf}' must be between 0 and 100.");
            }
            $skillSet[]  = "{$sf} = ?";
            $skillParams[] = $val;
        }
    }

    if (!empty($skillSet)) {
        $skillParams[] = $profileId;
        $skillSql = "UPDATE player_skills SET " . implode(', ', $skillSet) . ", updated_at = NOW() WHERE player_id = ?";
        $db->prepare($skillSql)->execute($skillParams);
    }

    // -----------------------------------------------------------------------
    // Career history — delete existing, re-insert from JSON array
    // -----------------------------------------------------------------------
    if (isset($_POST['career'])) {
        $careerData = json_decode($_POST['career'], true);

        if (!is_array($careerData)) {
            $db->rollBack();
            jsonError('career must be a valid JSON array.');
        }

        $delStmt = $db->prepare("DELETE FROM player_career_history WHERE player_id = ?");
        $delStmt->execute([$profileId]);

        $insStmt = $db->prepare(
            "INSERT INTO player_career_history
             (player_id, club_name, season, appearances, goals, assists, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($careerData as $idx => $entry) {
            if (!is_array($entry)) continue;

            $clubName    = isset($entry['club_name'])   ? trim((string)$entry['club_name'])  : '';
            $season      = isset($entry['season'])      ? trim((string)$entry['season'])     : null;
            $appearances = isset($entry['appearances']) ? (int)$entry['appearances']         : 0;
            $goals       = isset($entry['goals'])       ? (int)$entry['goals']               : 0;
            $assists     = isset($entry['assists'])     ? (int)$entry['assists']             : 0;
            $sortOrder   = (int)($entry['sort_order'] ?? $idx);

            if ($clubName === '') continue;

            $insStmt->execute([$profileId, $clubName, $season, $appearances, $goals, $assists, $sortOrder]);
        }
    }

    $db->commit();

    // Return updated profile
    $sel = $db->prepare(
        "SELECT pp.*, u.email
         FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE pp.id = ?
         LIMIT 1"
    );
    $sel->execute([$profileId]);
    $updatedProfile = $sel->fetch();
    unset($updatedProfile['password_hash']);

    jsonSuccess($updatedProfile);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('save-profile DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
