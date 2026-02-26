<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Diagnóstico Jukebox</title>
    <style>body{font-family:sans-serif;padding:2rem;line-height:1.5}.ok{color:green;font-weight:bold}.err{color:red;font-weight:bold}.box{background:#f0f0f0;padding:1rem;margin:1rem 0;border-radius:8px}</style>
</head>
<body>
    <h1>Diagnóstico de Conexión</h1>
    
    <div class="box">
        <h2>1. Versión de PHP</h2>
        <p><?php echo phpversion(); ?></p>
    </div>

    <div class="box">
        <h2>2. Extensiones</h2>
        <?php
        $drivers = pdo_drivers();
        if (in_array("mysql", $drivers)) {
            echo "<p class='ok'>✅ PDO MySQL instalado.</p>";
        } else {
            echo "<p class='err'>❌ PDO MySQL NO instalado.</p>";
        }
        ?>
    </div>

    <div class="box">
        <h2>3. Prueba de Conexión</h2>
        <?php
        $host = 'localhost';
        $user = 'root';
        $pass = ''; 
        
        try {
            $pdo = new PDO("mysql:host=$host", $user, $pass);
            echo "<p class='ok'>✅ Conexión a MySQL exitosa.</p>";
            
            // Verificar Base de Datos
            echo "<h3>Bases de Datos existentes:</h3><ul>";
            $dbs = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
            $found = false;
            foreach ($dbs as $db) {
                echo "<li>$db</li>";
                if ($db === 'jukebox') $found = true;
            }
            echo "</ul>";

            if ($found) {
                echo "<p class='ok'>✅ Base de datos 'jukebox' ENCONTRADA.</p>";
            } else {
                echo "<p class='err'>❌ Base de datos 'jukebox' NO ENCONTRADA.</p>";
                echo "<p>Por favor, importa el archivo database.sql en phpMyAdmin.</p>";
            }

        } catch (PDOException $e) {
            echo "<p class='err'>❌ Error al conectar: " . $e->getMessage() . "</p>";
        }
        ?>
    </div>
</body>
</html>
