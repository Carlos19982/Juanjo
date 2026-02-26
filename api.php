<?php
header('Content-Type: application/json');
require_once 'db.php';
session_set_cookie_params(315360000); // 10 years persistent session
session_start();

$method = $_SERVER['REQUEST_METHOD'];

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$isAdmin = ($_SESSION['role'] === 'admin');

try {
    switch ($method) {
        case 'GET':
            // Obtener peticiones
            if ($isAdmin) {
                // Si viene lastId, solo traer las nuevas
                $lastId = isset($_GET['lastId']) ? (int)$_GET['lastId'] : 0;
                if ($lastId > 0) {
                    $stmt = $pdo->prepare("SELECT r.*, u.username FROM requests r JOIN users u ON r.user_id = u.id WHERE r.id > ? ORDER BY r.id ASC");
                    $stmt->execute([$lastId]);
                } else {
                    $stmt = $pdo->query("SELECT r.*, u.username FROM requests r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC");
                }
            } else {
                $stmt = $pdo->prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC");
                $stmt->execute([$_SESSION['user_id']]);
            }
            $requests = $stmt->fetchAll();

            $cooldownRemaining = 0;
            if (!$isAdmin) {
                // Verificar cooldown restante para la IP
                $ip_address = $_SERVER['REMOTE_ADDR'];
                $stmtCooldown = $pdo->prepare("
                    SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_passed 
                    FROM requests 
                    WHERE ip_address = ? 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ");
                $stmtCooldown->execute([$ip_address]);
                $lastReq = $stmtCooldown->fetch();
                if ($lastReq && $lastReq['seconds_passed'] !== null && $lastReq['seconds_passed'] < 1800) {
                    $cooldownRemaining = (1800 - $lastReq['seconds_passed']) * 1000; // ms
                }
            }

            echo json_encode(['success' => true, 'data' => $requests, 'cooldownRemaining' => $cooldownRemaining]);
            break;

        case 'POST':
            // Crear petición
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || !isset($data['song'])) {
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                exit;
            }

            // Comprobar si hay una petición reciente desde esta IP (últimos 30 minutos)
            if (!$isAdmin) {
                $ip_address = $_SERVER['REMOTE_ADDR'];
                $stmtCheck = $pdo->prepare("
                    SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_passed 
                    FROM requests 
                    WHERE ip_address = ? 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ");
                $stmtCheck->execute([$ip_address]);
                $lastReq = $stmtCheck->fetch();

                if ($lastReq && $lastReq['seconds_passed'] !== null && $lastReq['seconds_passed'] < 1800) {
                    $cooldownRemaining = (1800 - $lastReq['seconds_passed']) * 1000;
                    echo json_encode(['success' => false, 'message' => 'Ya has solicitado una canción recientemente.', 'cooldownRemaining' => $cooldownRemaining]);
                    exit;
                }
            } else {
                $ip_address = null; // Admin ignora cooldown
            }

            $stmt = $pdo->prepare("INSERT INTO requests (user_id, song_name, artist_name, album_image, ip_address) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $data['song'], $data['artist'] ?? 'Desconocido', $data['image'] ?? null, $ip_address]);
            echo json_encode(['success' => true, 'message' => 'Petición enviada']);
            break;

        case 'PUT':
            // Actualizar estado (Solo Admin)
            if (!$isAdmin) exit(json_encode(['success' => false, 'message' => 'Solo administradores']));
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE requests SET status = ? WHERE id = ?");
            $stmt->execute([$data['status'], $data['id']]);
            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            // Eliminar petición (Solo Admin)
            if (!$isAdmin) exit(json_encode(['success' => false, 'message' => 'Solo administradores']));
            $id = $_GET['id'] ?? null;
            if (!$id) exit(json_encode(['success' => false, 'message' => 'ID requerido']));
            $stmt = $pdo->prepare("DELETE FROM requests WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
