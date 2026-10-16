-- Tabla nueva para los refresh tokens (permite logout y rotación).
-- IMPORTANTE: el tipo de id_usuario debe ser idéntico al de usuarios.id_usuario
-- (si allá es INT UNSIGNED, aquí también) o la llave foránea fallará.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id_refresh  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  jti         CHAR(36)        NOT NULL,
  id_usuario  INT             NOT NULL,
  expira_en   DATETIME        NOT NULL,
  revocado    TINYINT(1)      NOT NULL DEFAULT 0,
  creado_en   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_jti (jti),
  KEY idx_refresh_usuario (id_usuario),
  CONSTRAINT fk_refresh_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

-- El registro depende de que el email sea único (si ya lo es, omite esta línea):
-- ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_email (email);
