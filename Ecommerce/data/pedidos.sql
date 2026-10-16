-- Órdenes de compra (pedidos), su detalle y el seguimiento de los trabajos en cola.
-- IMPORTANTE: los tipos de id_usuario e id_producto deben ser idénticos a los de las tablas
-- usuarios y productos (si allá son INT UNSIGNED, aquí también) o las llaves foráneas fallarán.

CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT NOT NULL,
  estado         ENUM('pendiente','confirmado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones  VARCHAR(500) NULL,
  pdf_archivo    VARCHAR(100) NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pedidos_usuario (id_usuario),
  KEY idx_pedidos_estado (estado),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);

-- Se guardan código, nombre y precio al momento de la compra (la orden no cambia si luego cambia el catálogo)
CREATE TABLE IF NOT EXISTS pedido_detalle (
  id_detalle      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_pedido       BIGINT UNSIGNED NOT NULL,
  id_producto     INT NOT NULL,
  codigo          VARCHAR(50)  NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  KEY idx_detalle_pedido (id_pedido),
  CONSTRAINT fk_detalle_pedido   FOREIGN KEY (id_pedido)   REFERENCES pedidos (id_pedido) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
);

CREATE TABLE IF NOT EXISTS pedido_trabajos (
  id_trabajo     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_pedido      BIGINT UNSIGNED NOT NULL,
  cola           VARCHAR(30) NOT NULL,
  job_id         VARCHAR(64) NOT NULL,
  tipo           ENUM('pdf','correo') NOT NULL,
  estado         ENUM('en_cola','procesando','reintentando','completado','fallido') NOT NULL DEFAULT 'en_cola',
  intentos       INT NOT NULL DEFAULT 0,
  error          VARCHAR(500) NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trabajo (cola, job_id),
  KEY idx_trabajos_pedido (id_pedido),
  CONSTRAINT fk_trabajos_pedido FOREIGN KEY (id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE
);
