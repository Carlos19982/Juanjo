<?php
require_once 'db.php';

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM requests LIKE 'album_image'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $pdo->exec("ALTER TABLE requests ADD COLUMN album_image VARCHAR(512) DEFAULT NULL");
        echo "Columna 'album_image' añadida con éxito.";
    } else {
        echo "La columna 'album_image' ya existe.";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
