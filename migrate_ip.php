<?php
require_once 'db.php';
try {
    $pdo->exec("ALTER TABLE requests ADD COLUMN ip_address VARCHAR(45) NULL");
    echo "Migration Success\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
