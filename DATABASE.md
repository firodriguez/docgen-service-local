# Documentación de la Base de Datos

## Información General

- **Base de datos:** `docgen_service`
- **Usuario:** `docgen_user`
- **Host:** `data.surfrut.com`
- **Puerto:** `5432`
- **Motor:** PostgreSQL
- **Codificación:** UTF8

---

## Extensiones habilitadas

- `pgcrypto`: Para generación de UUIDs.
- `uuid-ossp`: Funciones adicionales para UUIDs.
- `pg_stat_statements`: Monitoreo de consultas y rendimiento.

---

## Tablas principales

### 1. `template_sessions`
Almacena la información de cada sesión de generación de documento.

```sql
CREATE TABLE template_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Índices adicionales

```sql
CREATE INDEX idx_template_name ON template_sessions(template_name);
CREATE INDEX idx_created_at ON template_sessions(created_at);
```

#### Restricciones adicionales (opcional)

```sql
ALTER TABLE template_sessions
  ADD CONSTRAINT chk_template_name CHECK (char_length(template_name) > 0);
```

---

## Buenas prácticas y recomendaciones

- **Vacuum y autovacuum:** PostgreSQL lo realiza automáticamente, pero es recomendable monitorear el crecimiento de la tabla.
- **Backups:** Realizar respaldos periódicos de la base de datos.
- **Monitoreo:** Usar la extensión `pg_stat_statements` para identificar consultas lentas.
- **Índices:** Si se agregan nuevas consultas frecuentes por otros campos, considerar crear índices adicionales.

## Notas
- La contraseña del usuario debe mantenerse segura y almacenarse en variables de entorno.
- Si se requiere auditoría o historial de cambios, se puede agregar una tabla de logs en el futuro. 