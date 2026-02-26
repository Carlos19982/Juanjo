<?php
header('Content-Type: application/json');
require_once 'spotify_helper.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$query = $_GET['q'] ?? '';
if (empty($query)) {
    echo json_encode(['success' => true, 'data' => []]);
    exit;
}

$spotify = new SpotifyHelper();
$results = $spotify->searchTracks($query);

$formatted = array_map(function($track) {
    return [
        'id' => $track['id'],
        'name' => $track['name'],
        'artist' => $track['artists'][0]['name'],
        'album' => $track['album']['name'],
        'image' => $track['album']['images'][2]['url'] ?? $track['album']['images'][0]['url'] ?? '',
    ];
}, $results);

echo json_encode(['success' => true, 'data' => $formatted]);
?>
