<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Debug Log
file_put_contents('debug_log.txt', date('[Y-m-d H:i:s] ') . "Iniciando login.php\n", FILE_APPEND);

header('Content-Type: application/json');

try {
    require_once 'db.php';
    file_put_contents('debug_log.txt', date('[Y-m-d H:i:s] ') . "DB incluida\n", FILE_APPEND);
} catch (Throwable $e) {
    file_put_contents('debug_log.txt', date('[Y-m-d H:i:s] ') . "Error DB require: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => 'Error Require DB: ' . $e->getMessage()]);
    exit;
}
session_set_cookie_params(315360000); // 10 years persistent session
session_start();

$data = json_decode(file_get_contents('php://input'), true);
file_put_contents('debug_log.txt', date('[Y-m-d H:i:s] ') . "Datos recibidos: " . print_r($data, true) . "\n", FILE_APPEND);

if (!$data || !isset($data['username'])) {
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

$username = trim($data['username']);
$password = isset($data['password']) ? $data['password'] : null;

try {
    // Buscar usuario
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user) {
        // Usuario existe
        if ($user['role'] === 'admin') {
            if ($password && $password === $user['password']) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['role'] = 'admin';
                $_SESSION['username'] = $user['username'];
                echo json_encode(['success' => true, 'role' => 'admin']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta para administrador']);
            }
        } else {
            // Usuario estándar
            // Si el nombre ya está registrado y se intenta hacer login desde el formulario principal,
            // lo bloqueamos para que nadie más entre con el mismo nombre. (El dueño legítimo iniciaría sesión vía localStorage -> api.php)
            echo json_encode(['success' => false, 'message' => 'Este nombre ya está en uso. Por favor, elige otro.']);
        }
    } else {
        // Usuario no existe, si no es admin, lo creamos (Login estándar)
        if ($password !== null) {
            echo json_encode(['success' => false, 'message' => 'El administrador debe ser creado directamente en la base de datos']);
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (username, role) VALUES (?, 'user')");
            $stmt->execute([$username]);
            $userId = $pdo->lastInsertId();
            
            $_SESSION['user_id'] = $userId;
            $_SESSION['role'] = 'user';
            $_SESSION['username'] = $username;
            echo json_encode(['success' => true, 'role' => 'user']);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
