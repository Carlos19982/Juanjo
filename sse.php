<?php
require_once 'db.php';
session_set_cookie_params(315360000); // 10 years persistent session
session_start();

// Verificar que el usuario es admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo "data: " . json_encode(['error' => 'No autorizado']) . "\n\n";
    exit;
}

// Cerrar sesión de escritura inmediatamente para no bloquear otras request
session_write_close();

// Cabeceras SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

// Limpiar cualquier buffer
if (ob_get_level()) ob_end_clean();

// Obtener el último ID conocido por el cliente
$lastId = isset($_GET['lastId']) ? (int)$_GET['lastId'] : 0;

// Indicar al cliente cuánto tardar en reconectar (ms)
// Con 2500ms el cliente reconecta frecuentemente sin bloquear workers
echo "retry: 2500\n\n";

try {
    // Consultar una sola vez si hay peticiones nuevas
    $stmt = $pdo->prepare(
        "SELECT r.*, u.username
         FROM requests r
         JOIN users u ON r.user_id = u.id
         WHERE r.id > ?
         ORDER BY r.id ASC"
    );
    $stmt->execute([$lastId]);
    $newRequests = $stmt->fetchAll();

    if (!empty($newRequests)) {
        foreach ($newRequests as $req) {
            $eventData = json_encode([
                'id'          => $req['id'],
                'song_name'   => $req['song_name'],
                'artist_name' => $req['artist_name'],
                'album_image' => $req['album_image'],
                'username'    => $req['username'],
                'status'      => $req['status'],
                'created_at'  => $req['created_at'],
            ]);
            echo "event: new_request\n";
            echo "data: {$eventData}\n\n";
        }
    } else {
        // Sin nuevas peticiones: enviar heartbeat para mantener la conexión activa
        echo ": heartbeat\n\n";
    }

} catch (Exception $e) {
    echo "event: error\n";
    echo "data: " . json_encode(['message' => 'Error de BD']) . "\n\n";
}

// Terminar la conexión. EventSource reconectará automáticamente
// según el valor 'retry' indicado arriba.
flush();
exit;
?>
