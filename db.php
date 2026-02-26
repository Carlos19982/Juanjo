<?php
$host = 'localhost';
$db   = 'jukebox';
$user = 'root';
$pass = ''; 
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
    // Verificar si PDO existe antes de usarlo
    if (!class_exists('PDO')) {
        throw new Exception("La extensión PDO no está instalada/activada en este PHP.");
    }

    // Conectar básico
    $pdo = new PDO($dsn, $user, $pass);
    
    // Configurar opciones una a una
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

} catch (\Throwable $e) {
     http_response_code(200);
     echo json_encode(['success' => false, 'message' => 'Error Conexión: ' . $e->getMessage()]);
     exit;
}
?>
