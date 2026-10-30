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


-- 4. PEDIDOS 
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  estado ENUM('pendiente','confirmado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  estado_pago ENUM('pendiente','procesando','aprobado','rechazado','reembolsado') NOT NULL DEFAULT 'pendiente',
  pagado_en DATETIME NULL,
  total DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
  observaciones VARCHAR(500) NULL,
  pdf_archivo VARCHAR(100) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pedidos_usuario (id_usuario),
  INDEX idx_pedidos_estado (estado),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 5. PEDIDO_DETALLE

CREATE TABLE IF NOT EXISTS pedido_detalle (
  id_detalle INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  id_producto INT UNSIGNED NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) UNSIGNED NOT NULL,
  subtotal DECIMAL(12,2) UNSIGNED NOT NULL,
  INDEX idx_detalle_pedido (id_pedido),
  INDEX idx_detalle_producto (id_producto),
  CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PEDIDO_TRABAJOS (cola: pdf, correo, pago)

CREATE TABLE IF NOT EXISTS pedido_trabajos (
  id_trabajo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  cola VARCHAR(40) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  tipo ENUM('pdf','correo','pago') NOT NULL,
  estado ENUM('en_cola','procesando','reintentando','completado','fallido') NOT NULL DEFAULT 'en_cola',
  intentos INT UNSIGNED NOT NULL DEFAULT 0,
  error VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trabajos_pedido (id_pedido),
  INDEX idx_trabajos_job (cola, job_id),
  CONSTRAINT fk_trabajos_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PEDIDO_PAGOS (solo se permite pago en línea)
CREATE TABLE IF NOT EXISTS pedido_pagos (
  id_pago INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  metodo VARCHAR(20) NOT NULL DEFAULT 'en_linea',
  monto DECIMAL(12,2) UNSIGNED NOT NULL,
  estado ENUM('procesando','aprobado','rechazado','reembolsado') NOT NULL DEFAULT 'procesando',
  referencia VARCHAR(40) NULL,
  motivo VARCHAR(200) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pagos_pedido (id_pedido),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

