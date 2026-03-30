<?php
// fetch-photos.php - API to list images from Google Drive
require_once 'config.php';
require_once 'vendor/autoload.php';

header('Content-Type: application/json');

if (!isset($_SESSION['access_token'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$client = new Google\Client();
$client->setAccessToken($_SESSION['access_token']);

// Handle expired token
if ($client->isAccessTokenExpired()) {
    echo json_encode(['error' => 'Token expired']);
    exit;
}

$service = new Google\Service\Drive($client);

try {
    $folderId = $_GET['folderId'] ?? null;
    $query = "mimeType contains 'image/' and trashed = false";
    
    if ($folderId) {
        $query .= " and '{$folderId}' in parents";
    }

    // List images only
    $optParams = [
        'pageSize' => 100,
        'fields' => 'nextPageToken, files(id, name, thumbnailLink, mimeType, webViewLink)',
        'q' => $query
    ];
    $results = $service->files->listFiles($optParams);

    $photos = [];
    foreach ($results->getFiles() as $file) {
        $photos[] = [
            'id' => $file->id,
            'name' => $file->name,
            'thumbnail' => $file->thumbnailLink,
            'link' => $file->webViewLink
        ];
    }

    echo json_encode(['photos' => $photos]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
