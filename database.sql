-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS jukebox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jukebox;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NULL, -- NULL para usuarios estándar
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Peticiones de Canciones
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    song_name VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) DEFAULT 'Desconocido',
    status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

