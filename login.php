<?php
// login.php - Initiates Google Drive OAuth
require_once 'config.php';
require_once 'vendor/autoload.php';

$client = new Google\Client();
$client->setClientId(GOOGLE_CLIENT_ID);
$client->setClientSecret(GOOGLE_CLIENT_SECRET);
$client->setRedirectUri(GOOGLE_REDIRECT_URL);

foreach (GOOGLE_SCOPES as $scope) {
    $client->addScope($scope);
}

// Check if we already have an access token in the session
if (isset($_SESSION['access_token']) && $_SESSION['access_token']) {
    header('Location: photo-selection.html');
    exit;
}

$authUrl = $client->createAuthUrl();
header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
exit;
?>
