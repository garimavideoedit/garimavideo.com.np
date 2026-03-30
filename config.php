<?php
// config.php - Google API Configuration

session_start();

// Google OAuth Credentials
// You must get these from Google Cloud Console: https://console.developers.google.com/
define('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID_HERE');
define('GOOGLE_CLIENT_SECRET', 'YOUR_CLIENT_SECRET_HERE');
define('GOOGLE_REDIRECT_URL', 'http://localhost:8000/callback.php');

// Target Folder ID where shortcuts/copies will be added
define('TARGET_FOLDER_ID', 'YOUR_TARGET_FOLDER_ID_HERE');

// Scopes required for Drive access
define('GOOGLE_SCOPES', [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
]);
?>
