-- Run this once in MySQL Workbench (connected as root): File > Open SQL Script, then the lightning-bolt Execute button.
-- Creates the PulseForge database and a dedicated local app user (credentials match backend/.env).
CREATE DATABASE IF NOT EXISTS pulseforge_gym CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pulseforge'@'localhost' IDENTIFIED BY 'PulseForge_Local_2026';
CREATE USER IF NOT EXISTS 'pulseforge'@'127.0.0.1' IDENTIFIED BY 'PulseForge_Local_2026';
GRANT ALL PRIVILEGES ON pulseforge_gym.* TO 'pulseforge'@'localhost';
GRANT ALL PRIVILEGES ON pulseforge_gym.* TO 'pulseforge'@'127.0.0.1';
-- Needed so Django's test runner can create test_pulseforge_gym
GRANT ALL PRIVILEGES ON test_pulseforge_gym.* TO 'pulseforge'@'localhost';
GRANT ALL PRIVILEGES ON test_pulseforge_gym.* TO 'pulseforge'@'127.0.0.1';
FLUSH PRIVILEGES;
