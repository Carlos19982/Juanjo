<?php
require_once 'db.php';

$users = [
    ['username' => 'admin', 'password' => 'admin123'],
    ['username' => 'Juanjo', 'password' => 'admin']
];

echo "<h1>Actualizando Contraseñas</h1>";

foreach ($users as $user) {
    $pass = $user['password'];
    $stmt = $pdo->prepare("UPDATE users SET password = ?, role = 'admin' WHERE username = ?");
    $stmt->execute([$pass, $user['username']]);
    
    if ($stmt->rowCount() > 0) {
        echo "<p>✅ Usuario <b>" . $user['username'] . "</b> actualizado con éxito.</p>";
    } else {
        // Si no existe, lo insertamos
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')");
        $stmt->execute([$user['username'], $hash]);
        echo "<p>✅ Usuario <b>" . $user['username'] . "</b> creado con éxito.</p>";
    }
}

echo "<p><b>Ya puedes borrar este archivo (fix_pass.php) y probar el login.</b></p>";
?>
