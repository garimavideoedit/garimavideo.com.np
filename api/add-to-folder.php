<?php
// add-to-folder.php - API to create a shortcut in the target folder
require_once '../config.php';
require_once '../vendor/autoload.php';

header('Content-Type: application/json');

if (!isset($_SESSION['access_token'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

// Get fileId from POST request
$data = json_decode(file_get_contents('php://input'), true);
$fileId = $data['fileId'] ?? null;

if (!$fileId) {
    echo json_encode(['error' => 'Missing file ID']);
    exit;
}

$client = new Google\Client();
$client->setAccessToken($_SESSION['access_token']);

if ($client->isAccessTokenExpired()) {
    echo json_encode(['error' => 'Token expired']);
    exit;
}

$service = new Google\Service\Drive($client);

try {
    // Create a shortcut to the photo in the target folder
    $shortcutMetadata = new Google\Service\Drive\DriveFile([
        'name' => 'Shortcut to Photo',
        'mimeType' => 'application/vnd.google-apps.shortcut',
        'shortcutDetails' => [
            'targetId' => $fileId
        ],
        'parents' => [TARGET_FOLDER_ID]
    ]);

    $file = $service->files->create($shortcutMetadata, [
        'fields' => 'id'
    ]);

    echo json_encode(['success' => true, 'shortcutId' => $file->id]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
