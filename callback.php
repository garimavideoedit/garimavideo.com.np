<?php
// callback.php - Handles Google OAuth Response
require_once 'config.php';
require_once 'vendor/autoload.php';

$client = new Google\Client();
$client->setClientId(GOOGLE_CLIENT_ID);
$client->setClientSecret(GOOGLE_CLIENT_SECRET);
$client->setRedirectUri(GOOGLE_REDIRECT_URL);

if (!isset($_GET['code'])) {
    header('Location: login.php');
    exit;
}

$token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
$client->setAccessToken($token);

// Store the token in the session
$_SESSION['access_token'] = $token;

// Redirect back to the photo selection page
header('Location: photo-selection.html');
exit;
?>
