-- ==============================================================================
-- Tablas/columnas que agrega la API Node.js (ejecutar DESPUÉS de bd_giganet.sql). Es re-ejecutable.
--   1) refresh_tokens          -> sesiones (refresh de JWT y logout)
--   2) ordenes_compra.pdf_archivo -> nombre del PDF de la orden de compra
--   3) orden_compra_trabajos   -> estado de los trabajos en cola (PDF y correo)
-- No modifica ningún dato existente.
-- ==============================================================================
USE `giganet_db`;

-- 1. REFRESH_TOKENS
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id_refresh` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `jti` CHAR(36) NOT NULL,
    `id_usuario` INT UNSIGNED NOT NULL,
    `expira_en` DATETIME NOT NULL,
    `revocado` TINYINT(1) NOT NULL DEFAULT 0,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_refresh_jti` (`jti`),
    INDEX `idx_refresh_usuario` (`id_usuario`),
    CONSTRAINT `fk_refresh_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ORDENES_COMPRA.pdf_archivo (solo se agrega si todavía no existe)
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordenes_compra' AND COLUMN_NAME = 'pdf_archivo');
SET @sql := IF(@existe = 0,
               'ALTER TABLE `ordenes_compra` ADD COLUMN `pdf_archivo` VARCHAR(100) NULL COMMENT ''Nombre del PDF de la orden de compra generado por la cola'' AFTER `fecha_vencimiento`',
               'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. ORDEN_COMPRA_TRABAJOS
CREATE TABLE IF NOT EXISTS `orden_compra_trabajos` (
    `id_trabajo` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_orden_compra` INT UNSIGNED NOT NULL,
    `cola` VARCHAR(40) NOT NULL,
    `job_id` VARCHAR(64) NOT NULL,
    `tipo` ENUM('pdf', 'correo') NOT NULL,
    `estado` ENUM('en_cola', 'procesando', 'reintentando', 'completado', 'fallido') NOT NULL DEFAULT 'en_cola',
    `intentos` INT UNSIGNED NOT NULL DEFAULT 0,
    `error` VARCHAR(500) NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_trabajo` (`cola`, `job_id`),
    INDEX `idx_trabajos_orden_compra` (`id_orden_compra`),
    CONSTRAINT `fk_trabajos_ordenes_compra` FOREIGN KEY (`id_orden_compra`) REFERENCES `ordenes_compra` (`id_orden_compra`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
