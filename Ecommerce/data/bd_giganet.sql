-- ==============================================================================
-- SISTEMA DE VENTAS E INVENTARIO GIGANET, S.A.
-- Esquema de Base de Datos Relacional Optimizado (MySQL 8.0+)
--
-- Nota para pruebas: todos los usuarios de ejemplo tienen la contraseña
-- "Manager1" (hash bcrypt real). Cambiarla en cualquier entorno productivo.
-- Importante: este script hace TRUNCATE de todas las tablas; al volver a
-- ejecutarlo se pierden los datos creados después de la carga inicial.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `giganet_db` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `giganet_db`;


-- -------------------------------------------------------------------------------------------
--                                       TABLAS
-- -------------------------------------------------------------------------------------------
-- 1. ROLES
CREATE TABLE IF NOT EXISTS `roles` (
    `id_rol` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre_rol` VARCHAR(50) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id_usuario` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_rol` INT UNSIGNED NOT NULL,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `estado` ENUM('activo', 'inactivo', 'bloqueado') DEFAULT 'activo',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS `clientes` (
    `id_cliente` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `codigo_cliente` VARCHAR(20) NOT NULL UNIQUE,
    `codigo_proveedor_cliente` VARCHAR(50) NULL COMMENT 'Código asignado a clientes/resellers con privilegio de reserva',
    `nombre_razon_social` VARCHAR(150) NOT NULL,
    `nit` VARCHAR(20) DEFAULT 'CF',
    `email` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` TEXT NULL,
    `es_proveedor_autorizado` TINYINT(1) DEFAULT 0 COMMENT '1: Puede realizar reservas, 0: Cliente normal',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_clientes_codigo_prov` (`codigo_proveedor_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PROVEEDORES
CREATE TABLE IF NOT EXISTS `proveedores` (
    `id_proveedor` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nit_empresa` VARCHAR(20) NULL,
    `nombre_empresa` VARCHAR(150) NOT NULL,
    `contacto_nombre` VARCHAR(100) NULL,
    `email` VARCHAR(150) NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` TEXT NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CATEGORIAS
CREATE TABLE IF NOT EXISTS `categorias` (
    `id_categoria` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nombre_categoria` VARCHAR(100) NOT NULL UNIQUE,
    `descripcion` VARCHAR(255) NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PRODUCTOS
CREATE TABLE IF NOT EXISTS `productos` (
    `id_producto` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_categoria` INT UNSIGNED NOT NULL,
    `codigo` VARCHAR(50) NOT NULL UNIQUE,
    `nombre` VARCHAR(150) NOT NULL,
    `marca` VARCHAR(50) NULL,
    `descripcion` TEXT NULL,
    `imagen` VARCHAR(255) NULL,
    `stock_minimo` INT UNSIGNED DEFAULT 5,
    `stock_maximo` INT UNSIGNED DEFAULT 100,
    `precio_compra` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    `precio_venta` DECIMAL(12,2) UNSIGNED NULL COMMENT 'NULL cuando el estado_stock es sin_stock',
    `estado_stock` ENUM('fisico', 'virtual', 'reservado', 'sin_stock') NOT NULL DEFAULT 'sin_stock',
    `id_usuario_registro` INT UNSIGNED NOT NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_productos_categorias` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_productos_usuarios` FOREIGN KEY (`id_usuario_registro`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_productos_estado_stock` (`estado_stock`),
    INDEX `idx_productos_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PRODUCTO_INVENTARIO
CREATE TABLE IF NOT EXISTS `producto_inventario` (
    `id_inventario` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_producto` INT UNSIGNED NOT NULL UNIQUE,
    `cant_fisico` INT UNSIGNED DEFAULT 0 COMMENT 'Mercancía disponible físicamente en bodega',
    `cant_virtual` INT UNSIGNED DEFAULT 0 COMMENT 'Mercancía comprada en tránsito',
    `cant_reservado` INT UNSIGNED DEFAULT 0 COMMENT 'Mercancía apartada por clientes autorizados',
    `cant_total_disponible` INT GENERATED ALWAYS AS (cant_fisico + cant_virtual) STORED,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_inventario_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PRODUCTO_PROVEEDORES
CREATE TABLE IF NOT EXISTS `producto_proveedores` (
    `id_producto_proveedor` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_producto` INT UNSIGNED NOT NULL,
    `id_proveedor` INT UNSIGNED NOT NULL,
    `codigo_producto_proveedor` VARCHAR(50) NULL,
    `precio_proveedor` DECIMAL(12,2) UNSIGNED NOT NULL,
    `dias_entrega_estimados` INT UNSIGNED DEFAULT 1,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pp_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pp_proveedores` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uk_producto_proveedor` (`id_producto`, `id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. ORDENES_COMPRA
CREATE TABLE IF NOT EXISTS `ordenes_compra` (
    `id_orden_compra` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `no_orden_compra` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Formato: OC-YYYYMMDD-HHMMSS',
    `id_cliente` INT UNSIGNED NOT NULL,
    `id_usuario` INT UNSIGNED NOT NULL COMMENT 'Asesor de ventas',
    `subtotal` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    `iva` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    `estado` ENUM('borrador', 'enviada', 'aprobada', 'rechazada', 'convertida_a_venta') DEFAULT 'enviada',
    `fecha_emision` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `fecha_vencimiento` DATETIME NOT NULL,
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ordenes_compra_clientes` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ordenes_compra_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. DETALLE_ORDENES_COMPRA
CREATE TABLE IF NOT EXISTS `detalle_ordenes_compra` (
    `id_detalle_orden_compra` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_orden_compra` INT UNSIGNED NOT NULL,
    `id_producto` INT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL DEFAULT 1,
    `precio_unitario` DECIMAL(12,2) UNSIGNED NOT NULL,
    `subtotal` DECIMAL(12,2) UNSIGNED NOT NULL,
    CONSTRAINT `fk_doc_ordenes_compra` FOREIGN KEY (`id_orden_compra`) REFERENCES `ordenes_compra` (`id_orden_compra`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_doc_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. RESERVAS_INVENTARIO
CREATE TABLE IF NOT EXISTS `reservas_inventario` (
    `id_reserva` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_cliente` INT UNSIGNED NOT NULL,
    `id_producto` INT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `estado` ENUM('activa', 'completada', 'cancelada', 'expirada') DEFAULT 'activa',
    `fecha_reserva` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `fecha_expiracion` DATETIME NOT NULL,
    CONSTRAINT `fk_reservas_clientes` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_reservas_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. VENTAS
CREATE TABLE IF NOT EXISTS `ventas` (
    `id_venta` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `no_factura` VARCHAR(50) NULL UNIQUE,
    `id_orden_compra` INT UNSIGNED NULL COMMENT 'Opcional, si proviene de una orden de compra',
    `id_cliente` INT UNSIGNED NOT NULL,
    `id_usuario` INT UNSIGNED NOT NULL,
    `subtotal` DECIMAL(12,2) UNSIGNED NOT NULL,
    `iva` DECIMAL(12,2) UNSIGNED NOT NULL,
    `total` DECIMAL(12,2) UNSIGNED NOT NULL,
    `estado_venta` ENUM('pendiente', 'completada', 'anulada') DEFAULT 'completada',
    `id_envio_mongodb` VARCHAR(24) NULL COMMENT 'Referencia al documento de Envíos en MongoDB',
    `fecha_venta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ventas_ordenes_compra` FOREIGN KEY (`id_orden_compra`) REFERENCES `ordenes_compra` (`id_orden_compra`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_ventas_clientes` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ventas_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. DETALLE_VENTAS
CREATE TABLE IF NOT EXISTS `detalle_ventas` (
    `id_detalle_venta` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_venta` INT UNSIGNED NOT NULL,
    `id_producto` INT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `precio_unitario` DECIMAL(12,2) UNSIGNED NOT NULL,
    `subtotal` DECIMAL(12,2) UNSIGNED NOT NULL,
    CONSTRAINT `fk_dv_ventas` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dv_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. PAGOS
CREATE TABLE IF NOT EXISTS `pagos` (
    `id_pago` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `id_venta` INT UNSIGNED NOT NULL,
    `metodo_pago` ENUM('efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'deposito', 'cheque') NOT NULL,
    `monto` DECIMAL(12,2) UNSIGNED NOT NULL,
    `no_referencia` VARCHAR(100) NULL COMMENT 'No. Transacción, voucher o no. boleta depósito',
    `banco` VARCHAR(100) NULL,
    `estado_pago` ENUM('pendiente', 'verificado', 'rechazado') DEFAULT 'verificado',
    `fecha_pago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pagos_ventas` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------------------------------------
--                                  DATOS DE PRUEBA
-- -------------------------------------------------------------------------------------------
USE `giganet_db`;


SET FOREIGN_KEY_CHECKS = 0;


TRUNCATE TABLE `pagos`;
TRUNCATE TABLE `detalle_ventas`;
TRUNCATE TABLE `ventas`;
TRUNCATE TABLE `reservas_inventario`;
TRUNCATE TABLE `detalle_ordenes_compra`;
TRUNCATE TABLE `ordenes_compra`;
TRUNCATE TABLE `producto_proveedores`;
TRUNCATE TABLE `producto_inventario`;
TRUNCATE TABLE `productos`;
TRUNCATE TABLE `categorias`;
TRUNCATE TABLE `proveedores`;
TRUNCATE TABLE `clientes`;
TRUNCATE TABLE `usuarios`;
TRUNCATE TABLE `roles`;

SET FOREIGN_KEY_CHECKS = 1;


-- 1. roles
-- ------------------------------------------------------------------------------
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'Administrador General', 'Acceso total y configuración global del sistema'),
(2, 'Asesor de Ventas', 'Gestión de órdenes de compra, clientes y registro de ventas'),
(3, 'Encargado de Bodega', 'Control de existencias, recepción y despacho de mercancía'),
(4, 'Supervisora de Operaciones', 'Auditoría, reportes y control de calidad');


-- 2. usuarios (contraseña de todos: Manager1)
-- ------------------------------------------------------------------------------
INSERT INTO `usuarios` (`id_usuario`, `id_rol`, `nombres`, `apellidos`, `email`, `password`, `estado`) VALUES
(1, 1, 'Kevin', 'Quinteros', 'kquinteros@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(2, 2, 'Gloria Patricia', 'Alfonso Villagrán', 'galfonso@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(3, 2, 'Dailin Mireya', 'Gómez Méndez', 'dgomez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(4, 3, 'Jorge Luis', 'Pérez Cabrera', 'jperez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(5, 2, 'Maria Fernanda', 'López Estrada', 'mlopez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(6, 2, 'Roberto Manuel', 'Álvarez Cano', 'ralvarez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(7, 3, 'David Alejandro', 'Ruiz Marroquín', 'druiz@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(8, 2, 'Ana Patricia', 'Castillo Solís', 'acastillo@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(9, 2, 'Gustavo Adolfo', 'Ramírez Ríos', 'gramirez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(10, 4, 'Claudia Liliana', 'Najera Perez', 'cnajera@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(11, 2, 'Rodrigo José', 'Hernández Paz', 'rhernandez@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(12, 2, 'Claudia Maria', 'Fuentes Orellana', 'cfuentes@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(13, 3, 'Fernando José', 'Girón Morales', 'fgiron@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(14, 2, 'Jessica Paola', 'Maldonado Cruz', 'jmaldonado@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo'),
(15, 1, 'Isabel Maria', 'Santizo Sandoval', 'isantizo@giganet.com.gt', '$2y$12$E4zPqC4cquszwp.JeSNC1eJj.gB3fDpmLW8GztbHQGrgn0qUVUSg6', 'activo');


-- 3. clientes
-- ------------------------------------------------------------------------------
INSERT INTO `clientes` (`id_cliente`, `codigo_cliente`, `codigo_proveedor_cliente`, `nombre_razon_social`, `nit`, `email`, `telefono`, `direccion`, `es_proveedor_autorizado`) VALUES
(1, 'CLI-001', 'PROV-RES-901', 'Sistemas e Innovaciones de Guatemala, S.A.', '4589123-5', 'compras@sigsa.com.gt', '2334-5678', 'Av. La Reforma 12-01 Zona 10, Edificio Reforma Montúfar', 1),
(2, 'CLI-002', NULL, 'Telecomunicaciones del Norte', '7891234-1', 'mantenimiento@telcenor.com.gt', '7761-1234', '5ta Calle 3-12 Zona 1, Quetzaltenango', 0),
(3, 'CLI-003', 'PROV-RES-902', 'Redes y Ciberseguridad Integral', '1234567-8', 'info@redsecur.gt', '2410-9900', '18 Calle 5-45 Zona 10, Pradera Concejo', 1),
(4, 'CLI-004', NULL, 'Constructora e Inmobiliaria El Roble', '9876543-2', 'logistica@elroble.com.gt', '2200-4400', 'Bulevar Los Próceres 24-69 Zona 10', 0),
(5, 'CLI-005', 'PROV-RES-903', 'Soluciones Tecnológicas Integradas', '6543210-9', 'ventas@soltecin.com.gt', '2380-1122', 'Diagonal 6 10-50 Zona 10, Las Margaritas', 1),
(6, 'CLI-006', NULL, 'Corporación Textil Liztex, S.A.', '3322110-4', 'sistemas@liztex.com.gt', '6630-8800', 'Km 28.5 Carretera a Amatitlán, Guatemala', 0),
(7, 'CLI-007', NULL, 'Comercializadora San José', '8877665-1', 'compras@sanjose.com.gt', '7832-0011', 'Calle del Arco No. 15, Antigua Guatemala', 0),
(8, 'CLI-008', 'PROV-RES-904', 'NetData Comunicaciones S.A.', '5544332-9', 'soporte@netdata.com.gt', '2250-7788', '7a Avenida 14-44 Zona 9, Plaza Corporativa', 1),
(9, 'CLI-009', NULL, 'Hospital y Clínica San Francisco', '1122334-5', 'it@sanfrancisco.com.gt', '2323-9000', '6ta Avenida 3-22 Zona 11, Roosevelt', 0),
(10, 'CLI-010', 'PROV-RES-905', 'Cable Redes de Occidente', '9988776-3', 'operaciones@cableredes.gt', '7765-4321', '4ta Calle 8-19 Zona 3, Huehuetenango', 1),
(11, 'CLI-011', NULL, 'Colegio Mayor de Guatemala', '6677889-0', 'admin@colmayorgt.edu.gt', '2433-2211', 'Km 14.5 Carretera a El Salvador', 0),
(12, 'CLI-012', NULL, 'Hoteles y Restaurantes del Pacifico', '4433221-8', 'compras@hotelpacific.gt', '7881-5050', 'Puerto San José, Escuintla', 0),
(13, 'CLI-013', 'PROV-RES-906', 'Servicios Informáticos Avanzados', '2211443-7', 'contacto@sia.com.gt', '2366-1010', '12 Calle 2-04 Zona 9, Edificio El Dorado', 1),
(14, 'CLI-014', NULL, 'Distribuidora Farmacéutica Central', '7711223-4', 'sistemas@disfar.com.gt', '2420-5555', 'Calzada Aguilar Batres 34-10 Zona 11', 0),
(15, 'CLI-015', 'PROV-RES-907', 'Texnology ERP Solutions', '8899001-2', 'fmorales@texnology.com.gt', '2311-4040', 'Via 4 1-00 Zona 4, Tecpan Guatemala', 1);


-- 4. proveedores
-- ------------------------------------------------------------------------------
INSERT INTO `proveedores` (`id_proveedor`, `nit_empresa`, `nombre_empresa`, `contacto_nombre`, `email`, `telefono`, `direccion`) VALUES
(1, '889123-0', 'Hikvision Digital Technology Co.', 'Zhang Wei', 'sales.latam@hikvision.com', '+1-800-555-0199', 'City of Industry, California, USA'),
(2, '991234-1', 'Nextlink Solutions Global', 'Robert Miller', 'distribution@nextlink.com', '+1-305-444-1234', 'Miami, Florida, USA'),
(3, '771234-2', 'Ortronics Legrand Cabling Systems', 'Laura Vance', 'orders@ortronics.com', '+1-860-445-3800', 'New London, Connecticut, USA'),
(4, '661234-3', 'Ubiquiti Networks Inc.', 'Mark Spencer', 'latam@ui.com', '+1-408-942-3085', 'New York, NY, USA'),
(5, '551234-4', 'Cisco Systems Interamerica', 'Ana Maria Rossi', 'ventas@cisco.com', '+1-408-526-4000', 'San Jose, California, USA'),
(6, '441234-5', 'D-Link Latinoamerica S.A.', 'Esteban Gomez', 'contacto@dlink.com', '+507-200-1122', 'Ciudad de Panamá, Panamá'),
(7, '331234-6', 'Grandstream Networks Inc.', 'David Smith', 'sales@grandstream.com', '+1-617-566-9300', 'Boston, Massachusetts, USA'),
(8, '221234-7', 'TP-Link Corporation Limited', 'Chen Lu', 'ventas.gt@tp-link.com', '+502-2300-8800', 'Ciudad de Guatemala, Guatemala'),
(9, '111234-8', 'MikroTik SIA', 'Janis Berzins', 'sales@mikrotik.com', '+371-6-7317700', 'Riga, Letonia'),
(10, '990011-9', 'El Grupo Electrónico Tettsa', 'Manuel Sandoval', 'ventas@tettsa.com.gt', '2411-3000', 'Zona 1, Ciudad de Guatemala'),
(11, '880022-8', 'Zebra Technologies Corp.', 'Sarah Jenkins', 'orders@zebra.com', '+1-800-423-0442', 'Lincolnshire, Illinois, USA'),
(12, '770033-7', 'Panduit Network Infrastructure', 'Carlos Mendoza', 'latam@panduit.com', '+52-33-3777-6000', 'Guadalajara, Jalisco, México'),
(13, '660044-6', 'Dahua Technology Co., Ltd.', 'Li Na', 'sales.gt@dahuatech.com', '+502-2212-9900', 'Ciudad de Guatemala, Guatemala'),
(14, '550055-5', 'Fanvil Technology Co., Ltd.', 'Kevin Zhang', 'sales@fanvil.com', '+86-755-26402199', 'Shenzhen, China'),
(15, '440066-4', 'APC by Schneider Electric', 'Gaston Silva', 'soporte@apc.com', '+502-2328-7000', 'Ciudad de Guatemala, Guatemala');


-- 5. categorias
-- ------------------------------------------------------------------------------
INSERT INTO `categorias` (`id_categoria`, `nombre_categoria`, `descripcion`) VALUES
(1, 'CCTV y Videovigilancia', 'Cámaras IP, NVR, DVR, accesorios de instalación y monitoreo'),
(2, 'Redes y Conectividad', 'Switches, Routers, Access Points, cableado estructurado y racks'),
(3, 'Telefonía IP y Comunicaciones', 'Teléfonos IP, Conmutadores PBX, Gateways y Diademas'),
(4, 'Control de Acceso e Intrusión', 'Biométricos, cerraduras electromagnéticas, paneles de alarma'),
(5, 'Protección Eléctrica y UPS', 'Sistemas de respaldo UPS, PDU y supresores de picos');


-- 6. productos
-- ------------------------------------------------------------------------------
INSERT INTO `productos` (`id_producto`, `id_categoria`, `codigo`, `nombre`, `marca`, `descripcion`, `imagen`, `stock_minimo`, `stock_maximo`, `precio_compra`, `precio_venta`, `estado_stock`, `id_usuario_registro`) VALUES
(1, 1, 'HK-DS2CD2043G2', 'Cámara IP Bullet 4MP AcuSense', 'Hikvision', 'Lente fijo 2.8mm, Visión Nocturna 30m IR, IP67 PoE', 'hk_bullet_4mp.jpg', 10, 50, 420.00, 650.00, 'fisico', 1),
(2, 1, 'HK-DS7608NXI-K2', 'NVR 8 Canales PoE 4K AcuSense', 'Hikvision', 'Soporta 2 HDD hasta 10TB, compresión H.265+', 'hk_nvr_8ch.jpg', 5, 20, 1150.00, 1750.00, 'fisico', 1),
(3, 2, 'NL-SW24-POE', 'Switch Administrable 24 Puertos Gigabit PoE+', 'Nextlink', 'Power budget 370W, 4 SFP puertos, Rackeable 1U', 'nl_switch_24poe.jpg', 4, 15, 1850.00, 2600.00, 'virtual', 2),
(4, 2, 'ORT-CAT6-AZ', 'Bobina Cable de Red Cat6 UTP 305m Azul', 'Ortronics', '100% Cobre puro, chaqueta CMX, ideal para redes gigabit', 'ort_cat6_blue.jpg', 15, 100, 680.00, 950.00, 'fisico', 2),
(5, 3, 'GS-GRP2602P', 'Teléfono IP HD 2 Líneas PoE', 'Grandstream', 'Pantalla retroiluminada, conferencia de 5 participantes', 'gs_grp2602p.jpg', 20, 80, 290.00, 425.00, 'fisico', 1),
(6, 3, 'GS-UCM6302', 'Conmutador IP PBX Serie UCM6300', 'Grandstream', 'Hasta 1000 usuarios, 150 llamadas concurrentes, 2 FXO/FXS', 'gs_ucm6302.jpg', 2, 10, 3100.00, 4500.00, 'reservado', 2),
(7, 2, 'UB-U6-PRO', 'Access Point UniFi 6 Pro Dual Band', 'Ubiquiti', 'Wi-Fi 6 de alto rendimiento, tasa agregada de 5.3 Gbps', 'ub_u6_pro.jpg', 8, 40, 920.00, 1350.00, 'fisico', 1),
(8, 2, 'MK-RB3011UIAS', 'RouterBoard MikroTik 10 Puertos Gigabit', 'MikroTik', 'RouterOS L5, pantalla táctil LCD, puerto SFP', 'mk_rb3011.jpg', 5, 25, 1100.00, 1600.00, 'fisico', 2),
(9, 1, 'DH-IPC-HDW2431T', 'Cámara Domo IP 4MP Starlight', 'Dahua', 'Lente 2.8mm, IR 30m, compresión H.265', 'dh_domo_4mp.jpg', 12, 60, 380.00, 580.00, 'virtual', 1),
(10, 4, 'HK-DS-K1T341AMF', 'Terminal Biométrico de Reconocimiento Facial', 'Hikvision', 'Pantalla táctil 4.3 pulgadas, tarjeta Mifre, huella', 'hk_facial_k1t.jpg', 3, 15, 1400.00, 2100.00, 'fisico', 2),
(11, 5, 'APC-BR1500GI', 'UPS APC Back-UPS Pro 1500VA / 860W', 'APC', '10 tomas, pantalla LCD, regulación automática de voltaje (AVR)', 'apc_1500va.jpg', 5, 20, 1650.00, 2350.00, 'fisico', 1),
(12, 2, 'PND-PATCH-24', 'Patch Panel Cat6 de 24 Puertos Unshielded', 'Panduit', '1RU de altura, estándar Keystone T568A/B', 'pnd_patch24.jpg', 10, 30, 320.00, 490.00, 'fisico', 2),
(13, 3, 'FV-X303P', 'Teléfono IP Empresarial Fanvil 4 Líneas', 'Fanvil', 'Pantalla color 2.4 pulgadas, PoE, audio HD Harman', 'fv_x303p.jpg', 15, 50, 310.00, 460.00, 'fisico', 1),
(14, 1, 'HK-PTZ-2MP-25X', 'Cámara PTZ IP 2MP Zoom Óptico 25X', 'Hikvision', 'Infrarrojo 100m, Tracking Inteligente, IP66', 'hk_ptz_25x.jpg', 1, 5, 3800.00, NULL, 'sin_stock', 2),
(15, 2, 'ZB-ZT230-PRINT', 'Impresora Térmica de Etiquetas ZPL ZT230', 'Zebra', '203 DPI, interfaz Ethernet/USB, chasis metálico', 'zb_zt230.jpg', 0, 8, 4200.00, NULL, 'sin_stock', 1);


-- 7. producto_inventario
-- ------------------------------------------------------------------------------
INSERT INTO `producto_inventario` (`id_producto`, `cant_fisico`, `cant_virtual`, `cant_reservado`) VALUES
(1, 28, 0, 5),
(2, 12, 0, 2),
(3, 0, 15, 0),
(4, 45, 20, 10),
(5, 50, 0, 0),
(6, 4, 0, 4),
(7, 22, 10, 0),
(8, 14, 0, 3),
(9, 0, 25, 0),
(10, 8, 0, 1),
(11, 11, 0, 0),
(12, 18, 0, 0),
(13, 30, 0, 0),
(14, 0, 0, 0),
(15, 0, 0, 0);


-- 8. producto_proveedores
-- ------------------------------------------------------------------------------
INSERT INTO `producto_proveedores` (`id_producto`, `id_proveedor`, `codigo_producto_proveedor`, `precio_proveedor`, `dias_entrega_estimados`) VALUES
(1, 1, 'HK-2043-G2', 400.00, 3),
(2, 1, 'HK-7608-K2', 1100.00, 3),
(3, 2, 'NL-SW24-P', 1800.00, 7),
(4, 3, 'ORT-C6-BLU', 650.00, 2),
(5, 7, 'GS-GRP2602P', 275.00, 5),
(6, 7, 'GS-UCM6302', 3000.00, 5),
(7, 4, 'U6-PRO-US', 890.00, 4),
(8, 9, 'RB3011UiAS-RM', 1050.00, 10),
(9, 13, 'DH-IPC-HDW2431', 360.00, 3),
(10, 1, 'DS-K1T341AMF', 1350.00, 5),
(11, 15, 'BR1500GI', 1580.00, 2),
(12, 12, 'NK6T88BU', 300.00, 4),
(13, 14, 'X303P', 295.00, 12),
(14, 1, 'DS-2DE4225IW-DE', 3650.00, 15),
(15, 11, 'ZT23042-D0E000GS', 4050.00, 8);


-- 9. ordenes_compra
-- ------------------------------------------------------------------------------
INSERT INTO `ordenes_compra` (`id_orden_compra`, `no_orden_compra`, `id_cliente`, `id_usuario`, `subtotal`, `iva`, `total`, `estado`, `fecha_emision`, `fecha_vencimiento`) VALUES
(1, 'OC-20260810-091500', 1, 2, 3050.00, 366.00, 3416.00, 'convertida_a_venta', '2026-08-10 09:15:00', '2026-08-25 09:15:00'),
(2, 'OC-20260812-113022', 2, 3, 2600.00, 312.00, 2912.00, 'convertida_a_venta', '2026-08-12 11:30:22', '2026-08-27 11:30:22'),
(3, 'OC-20260815-142010', 3, 2, 4500.00, 540.00, 5040.00, 'convertida_a_venta', '2026-08-15 14:20:10', '2026-08-30 14:20:10'),
(4, 'OC-20260818-160545', 4, 5, 1900.00, 228.00, 2128.00, 'convertida_a_venta', '2026-08-18 16:05:45', '2026-09-02 16:05:45'),
(5, 'OC-20260820-101200', 5, 2, 13500.00, 1620.00, 15120.00, 'convertida_a_venta', '2026-08-20 10:12:00', '2026-09-04 10:12:00'),
(6, 'OC-20260822-084530', 6, 3, 6700.00, 804.00, 7504.00, 'convertida_a_venta', '2026-08-22 08:45:30', '2026-09-06 08:45:30'),
(7, 'OC-20260825-153012', 7, 6, 2125.00, 255.00, 2380.00, 'convertida_a_venta', '2026-08-25 15:30:12', '2026-09-09 15:30:12'),
(8, 'OC-20260828-110000', 8, 2, 5400.00, 648.00, 6048.00, 'convertida_a_venta', '2026-08-28 11:00:00', '2026-09-12 11:00:00'),
(9, 'OC-20260901-092211', 9, 8, 4700.00, 564.00, 5264.00, 'convertida_a_venta', '2026-09-01 09:22:11', '2026-09-16 09:22:11'),
(10, 'OC-20260902-141005', 10, 9, 3200.00, 384.00, 3584.00, 'enviada', '2026-09-02 14:10:05', '2026-09-17 14:10:05'),
(11, 'OC-20260904-164000', 11, 2, 8900.00, 1068.00, 9968.00, 'enviada', '2026-09-04 16:40:00', '2026-09-19 16:40:00'),
(12, 'OC-20260905-100512', 12, 11, 2850.00, 342.00, 3192.00, 'aprobada', '2026-09-05 10:05:12', '2026-09-20 10:05:12'),
(13, 'OC-20260907-115000', 13, 2, 1750.00, 210.00, 1960.00, 'convertida_a_venta', '2026-09-07 11:50:00', '2026-09-22 11:50:00'),
(14, 'OC-20260908-151530', 14, 12, 4200.00, 504.00, 4704.00, 'rechazada', '2026-09-08 15:15:30', '2026-09-23 15:15:30'),
(15, 'OC-20260910-083000', 15, 2, 2350.00, 282.00, 2632.00, 'enviada', '2026-09-10 08:30:00', '2026-09-25 08:30:00');


-- 10. detalle_ordenes_compra
-- ------------------------------------------------------------------------------
INSERT INTO `detalle_ordenes_compra` (`id_orden_compra`, `id_producto`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 2, 650.00, 1300.00),
(1, 2, 1, 1750.00, 1750.00),
(2, 3, 1, 2600.00, 2600.00),
(3, 6, 1, 4500.00, 4500.00),
(4, 4, 2, 950.00, 1900.00),
(5, 7, 10, 1350.00, 13500.00),
(6, 8, 2, 1600.00, 3200.00),
(6, 4, 3, 950.00, 2850.00),
(6, 5, 2, 325.00, 650.00),
(7, 5, 5, 425.00, 2125.00),
(8, 10, 2, 2100.00, 4200.00),
(8, 1, 2, 600.00, 1200.00),
(9, 11, 2, 2350.00, 4700.00),
(10, 8, 2, 1600.00, 3200.00),
(11, 7, 5, 1350.00, 6750.00),
(11, 12, 4, 490.00, 1960.00),
(11, 5, 1, 190.00, 190.00),
(12, 1, 3, 650.00, 1950.00),
(12, 12, 1, 900.00, 900.00),
(13, 2, 1, 1750.00, 1750.00),
(14, 10, 2, 2100.00, 4200.00),
(15, 11, 1, 2350.00, 2350.00);


-- 11. reservas_inventario
-- ------------------------------------------------------------------------------
INSERT INTO `reservas_inventario` (`id_reserva`, `id_cliente`, `id_producto`, `cantidad`, `estado`, `fecha_reserva`, `fecha_expiracion`) VALUES
(1, 1, 1, 5, 'activa', '2026-09-01 08:00:00', '2026-09-15 23:59:59'),
(2, 3, 6, 4, 'activa', '2026-09-02 10:30:00', '2026-09-16 23:59:59'),
(3, 5, 4, 10, 'activa', '2026-09-03 14:15:00', '2026-09-17 23:59:59'),
(4, 8, 8, 3, 'activa', '2026-09-05 09:00:00', '2026-09-19 23:59:59'),
(5, 10, 10, 1, 'activa', '2026-09-06 11:45:00', '2026-09-20 23:59:59'),
(6, 13, 2, 2, 'activa', '2026-09-07 16:20:00', '2026-09-21 23:59:59'),
(7, 15, 7, 5, 'activa', '2026-09-08 08:30:00', '2026-09-22 23:59:59'),
(8, 1, 5, 8, 'completada', '2026-08-10 10:00:00', '2026-08-24 23:59:59'),
(9, 3, 3, 2, 'completada', '2026-08-15 11:00:00', '2026-08-29 23:59:59'),
(10, 5, 11, 3, 'expirada', '2026-08-01 09:00:00', '2026-08-15 23:59:59'),
(11, 8, 1, 4, 'cancelada', '2026-08-05 14:00:00', '2026-08-19 23:59:59'),
(12, 10, 12, 6, 'completada', '2026-08-20 15:30:00', '2026-09-03 23:59:59'),
(13, 13, 13, 10, 'activa', '2026-09-09 10:00:00', '2026-09-23 23:59:59'),
(14, 15, 4, 15, 'activa', '2026-09-10 12:15:00', '2026-09-24 23:59:59'),
(15, 1, 8, 2, 'completada', '2026-08-25 09:10:00', '2026-09-08 23:59:59');


-- 12. ventas
-- ------------------------------------------------------------------------------
INSERT INTO `ventas` (`id_venta`, `no_factura`, `id_orden_compra`, `id_cliente`, `id_usuario`, `subtotal`, `iva`, `total`, `estado_venta`, `id_envio_mongodb`, `fecha_venta`) VALUES
(1, 'FEL-000101', 1, 1, 2, 3050.00, 366.00, 3416.00, 'completada', '665123456789abcdef012301', '2026-08-10 10:30:00'),
(2, 'FEL-000102', 2, 2, 3, 2600.00, 312.00, 2912.00, 'completada', '665123456789abcdef012302', '2026-08-12 14:00:00'),
(3, 'FEL-000103', 3, 3, 2, 4500.00, 540.00, 5040.00, 'completada', '665123456789abcdef012303', '2026-08-15 16:10:00'),
(4, 'FEL-000104', 4, 4, 5, 1900.00, 228.00, 2128.00, 'completada', '665123456789abcdef012304', '2026-08-18 17:00:00'),
(5, 'FEL-000105', 5, 5, 2, 13500.00, 1620.00, 15120.00, 'completada', '665123456789abcdef012305', '2026-08-20 11:45:00'),
(6, 'FEL-000106', 6, 6, 3, 6700.00, 804.00, 7504.00, 'completada', '665123456789abcdef012306', '2026-08-22 09:30:00'),
(7, 'FEL-000107', 7, 7, 6, 2125.00, 255.00, 2380.00, 'completada', '665123456789abcdef012307', '2026-08-25 16:15:00'),
(8, 'FEL-000108', 8, 8, 2, 5400.00, 648.00, 6048.00, 'completada', '665123456789abcdef012308', '2026-08-28 12:00:00'),
(9, 'FEL-000109', 9, 9, 8, 4700.00, 564.00, 5264.00, 'completada', '665123456789abcdef012309', '2026-09-01 10:00:00'),
(10, 'FEL-000110', NULL, 10, 9, 1250.00, 150.00, 1400.00, 'completada', '665123456789abcdef012310', '2026-09-03 11:20:00'),
(11, 'FEL-000111', NULL, 1, 2, 3800.00, 456.00, 4256.00, 'completada', '665123456789abcdef012311', '2026-09-05 14:30:00'),
(12, 'FEL-000112', NULL, 15, 2, 950.00, 114.00, 1064.00, 'completada', '665123456789abcdef012312', '2026-09-06 15:45:00'),
(13, 'FEL-000113', 13, 13, 2, 1750.00, 210.00, 1960.00, 'completada', '665123456789abcdef012313', '2026-09-07 12:30:00'),
(14, 'FEL-000114', NULL, 3, 3, 2600.00, 312.00, 2912.00, 'completada', '665123456789abcdef012314', '2026-09-09 09:15:00'),
(15, 'FEL-000115', NULL, 5, 2, 4250.00, 510.00, 4760.00, 'completada', '665123456789abcdef012315', '2026-09-10 11:00:00');


-- 13. detalle_ventas
-- ------------------------------------------------------------------------------
INSERT INTO `detalle_ventas` (`id_venta`, `id_producto`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 2, 650.00, 1300.00),
(1, 2, 1, 1750.00, 1750.00),
(2, 3, 1, 2600.00, 2600.00),
(3, 6, 1, 4500.00, 4500.00),
(4, 4, 2, 950.00, 1900.00),
(5, 7, 10, 1350.00, 13500.00),
(6, 8, 2, 1600.00, 3200.00),
(6, 4, 3, 950.00, 2850.00),
(6, 5, 2, 325.00, 650.00),
(7, 5, 5, 425.00, 2125.00),
(8, 10, 2, 2100.00, 4200.00),
(8, 1, 2, 600.00, 1200.00),
(9, 11, 2, 2350.00, 4700.00),
(10, 5, 2, 425.00, 850.00),
(10, 12, 1, 400.00, 400.00),
(11, 10, 1, 2100.00, 2100.00),
(11, 2, 1, 1700.00, 1700.00),
(12, 4, 1, 950.00, 950.00),
(13, 2, 1, 1750.00, 1750.00),
(14, 3, 1, 2600.00, 2600.00),
(15, 7, 2, 1350.00, 2700.00),
(15, 8, 1, 1550.00, 1550.00);


-- 14. pagos
-- ------------------------------------------------------------------------------
INSERT INTO `pagos` (`id_pago`, `id_venta`, `metodo_pago`, `monto`, `no_referencia`, `banco`, `estado_pago`) VALUES
(1, 1, 'transferencia', 3416.00, 'TRX-988123', 'Banco Industrial', 'verificado'),
(2, 2, 'tarjeta_credito', 2912.00, 'VOU-445102', 'BAC Credomatic', 'verificado'),
(3, 3, 'deposito', 5040.00, 'DEP-100293', 'G&T Continental', 'verificado'),
(4, 4, 'efectivo', 2128.00, 'REC-00104', 'Caja General Giganet', 'verificado'),
(5, 5, 'transferencia', 15120.00, 'TRX-109283', 'Banco Industrial', 'verificado'),
(6, 6, 'transferencia', 7504.00, 'TRX-551029', 'Banrural', 'verificado'),
(7, 7, 'tarjeta_debito', 2380.00, 'VOU-881203', 'BAC Credomatic', 'verificado'),
(8, 8, 'cheque', 6048.00, 'CHQ-004912', 'Banco Promerica', 'verificado'),
(9, 9, 'transferencia', 5264.00, 'TRX-776102', 'Banco Industrial', 'verificado'),
(10, 10, 'efectivo', 1400.00, 'REC-00110', 'Caja General Giganet', 'verificado'),
(11, 11, 'transferencia', 4256.00, 'TRX-331092', 'G&T Continental', 'verificado'),
(12, 12, 'tarjeta_credito', 1064.00, 'VOU-110293', 'BAC Credomatic', 'verificado'),
(13, 13, 'deposito', 1960.00, 'DEP-887102', 'Banco Industrial', 'verificado'),
(14, 14, 'transferencia', 2912.00, 'TRX-990123', 'Banrural', 'verificado'),
(15, 15, 'tarjeta_credito', 4760.00, 'VOU-556102', 'BAC Credomatic', 'verificado');