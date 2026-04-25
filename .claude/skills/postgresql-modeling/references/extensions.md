# Extensiones PostgreSQL más útiles para modelado

## Habilitación

```sql
-- Ver extensiones disponibles
SELECT name, default_version, comment FROM pg_available_extensions ORDER BY name;

-- Instalar (requiere superuser o pg_extension_owner)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## uuid-ossp / pgcrypto

```sql
-- uuid-ossp
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v4(); -- UUID aleatorio (equivalente a gen_random_uuid() nativo en PG13+)

-- pgcrypto (para hash de contraseñas, cifrado)
CREATE EXTENSION pgcrypto;
SELECT crypt('mi_password', gen_salt('bf', 12)); -- bcrypt
SELECT crypt('input', stored_hash) = stored_hash AS valid; -- verificar
```

## pg_trgm — Búsqueda aproximada (fuzzy search)

```sql
CREATE EXTENSION pg_trgm;

-- Índice para LIKE/ILIKE y similitud
CREATE INDEX idx_products_name_trgm ON products
  USING GIN(name gin_trgm_ops);

-- Queries
SELECT * FROM products WHERE name ILIKE '%samsung%';  -- usa el índice
SELECT * FROM products WHERE similarity(name, 'samsun') > 0.3; -- typos
SELECT * FROM products ORDER BY similarity(name, 'iphone') DESC LIMIT 10;
```

## btree_gist / btree_gin

```sql
-- Necesarios para índices compuestos con columnas de rango
CREATE EXTENSION btree_gist;

-- Exclusion constraint: no permitir reservas solapadas
CREATE TABLE reservations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL,
  period     TSTZRANGE NOT NULL,
  CONSTRAINT no_overlap EXCLUDE USING GIST (
    room_id WITH =,
    period  WITH &&   -- && = overlap
  )
);
```

## PostGIS — Datos geoespaciales

```sql
CREATE EXTENSION postgis;

-- Columna geográfica
ALTER TABLE stores ADD COLUMN location GEOGRAPHY(POINT, 4326);

-- Insertar
UPDATE stores SET location = ST_MakePoint(-77.0428, -12.0464)  -- Lima
WHERE id = $1;

-- Buscar tiendas en radio de 5km
SELECT name, ST_Distance(location, ST_MakePoint(-77.03, -12.05)::geography) AS dist_m
FROM stores
WHERE ST_DWithin(location, ST_MakePoint(-77.03, -12.05)::geography, 5000)
ORDER BY dist_m;

-- Índice espacial
CREATE INDEX idx_stores_location ON stores USING GIST(location);
```

## pg_partman — Particionamiento automático

```sql
-- Gestiona particiones por tiempo automáticamente
CREATE EXTENSION pg_partman;

-- Crear particiones mensuales automáticamente
SELECT partman.create_parent(
  p_parent_table := 'public.events',
  p_control      := 'created_at',
  p_type         := 'range',
  p_interval     := 'monthly'
);
```

## timescaledb — Series de tiempo

Ideal para métricas, IoT, logs con alta tasa de inserción:

```sql
CREATE EXTENSION timescaledb;

-- Convertir tabla en hypertable (particionamiento automático por tiempo)
SELECT create_hypertable('metrics', 'time');

-- Compresión automática de datos viejos
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('metrics', INTERVAL '30 days');
```
