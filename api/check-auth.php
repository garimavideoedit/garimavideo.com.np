<?php
// check-auth.php - Check if user is logged in via PHP session
require_once '../config.php';

header('Content-Type: application/json');

if (isset($_SESSION['access_token'])) {
    echo json_encode(['authenticated' => true]);
} else {
    echo json_encode(['authenticated' => false]);
}
?>
