<?php
// logout.php - Clear session
session_start();
session_destroy();
header('Location: photo-selection.html');
exit;
?>
