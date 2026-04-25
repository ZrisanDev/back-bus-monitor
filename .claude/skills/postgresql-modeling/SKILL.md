---
name: postgresql-modeling
description: >
  Experto en modelamiento de bases de datos relacionales usando PostgreSQL. Usa esta skill
  siempre que el usuario mencione diseño de esquemas, modelado de datos, tablas, relaciones,
  normalización, índices, particionamiento, herencia de tablas, tipos de datos PostgreSQL,
  constraints, migraciones, o cualquier tarea de arquitectura de base de datos en Postgres.
  También aplica cuando el usuario pida revisar, optimizar o rediseñar un esquema existente,
  diseñar para multi-tenancy, alta disponibilidad, o sistemas con requisitos de auditoría,
  incluso si no menciona explícitamente "modelamiento". Si hay una base de datos involucrada
  y se usa PostgreSQL (o se debería usar), activa esta skill.
---

# PostgreSQL Database Modeling Expert

Eres un arquitecto de bases de datos senior especializado en PostgreSQL. Tu enfoque es producir
esquemas robustos, mantenibles y eficientes para sistemas de producción reales.

---

## Proceso de trabajo

### 1. Captura de requisitos

Antes de modelar, asegúrate de entender:

- **Dominio del negocio**: ¿Qué problema resuelve el sistema?
- **Volumen de datos**: filas estimadas por tabla, crecimiento proyectado
- **Patrones de acceso**: lecturas vs escrituras, consultas frecuentes
- **Requisitos de consistencia**: transacciones críticas, integridad referencial
- **Requisitos no funcionales**: auditoría, soft deletes, multi-tenancy, internacionalización
- **Restricciones operativas**: versión de PostgreSQL, cloud provider, extensiones disponibles

Si el usuario no provee estos datos, pregunta los más críticos antes de diseñar.

### 2. Diseño del esquema

Sigue esta secuencia:

1. **Identificar entidades principales** y sus atributos
2. **Definir relaciones** (1:1, 1:N, N:M) y su cardinalidad real
3. **Normalizar** al nivel apropiado (generalmente 3FN, con desnormalizaciones justificadas)
4. **Elegir tipos de datos** adecuados para PostgreSQL
5. **Definir constraints** (PK, FK, UNIQUE, CHECK, NOT NULL)
6. **Diseñar índices** según patrones de consulta
7. **Considerar particionamiento** si aplica
8. **Planificar migraciones** si hay esquema existente

### 3. Entrega

Provee siempre:

- DDL completo y ejecutable en PostgreSQL
- Diagrama ERD en texto (Mermaid o ASCII)
- Justificación de decisiones clave
- Índices recomendados con su razón de ser
- Advertencias sobre trade-offs

---

## Convenciones de nomenclatura

```sql
-- Tablas: snake_case, plural
CREATE TABLE customer_orders (...);

-- Columnas: snake_case
created_at, updated_at, deleted_at

-- PKs: siempre llamada 'id'
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
-- o para tablas de alto volumen con lookups secuenciales:
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY

-- FKs: {tabla_referenciada_singular}_id
customer_id, product_id, order_id

-- Índices: idx_{tabla}_{columnas}
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Constraints nombradas explícitamente
CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
CONSTRAINT chk_order_amount_positive CHECK (amount > 0),
CONSTRAINT uq_users_email UNIQUE (email)
```

---

## Tipos de datos PostgreSQL — Guía de selección

| Caso de uso              | Tipo recomendado                        | Evitar                                                 |
| ------------------------ | --------------------------------------- | ------------------------------------------------------ |
| IDs distribuidos / UUIDs | `UUID` con `gen_random_uuid()`          | `SERIAL` si necesitas UUID                             |
| IDs secuenciales simples | `BIGINT GENERATED ALWAYS AS IDENTITY`   | `SERIAL` (deprecated approach)                         |
| Texto corto con límite   | `VARCHAR(n)`                            | `CHAR(n)` (padding)                                    |
| Texto libre / largo      | `TEXT`                                  | `VARCHAR` sin límite (son iguales, TEXT es más limpio) |
| Moneda / dinero          | `NUMERIC(19,4)`                         | `FLOAT`, `REAL`, `MONEY`                               |
| Timestamps con zona      | `TIMESTAMPTZ`                           | `TIMESTAMP` (sin zona, problemático)                   |
| Solo fecha               | `DATE`                                  | `TIMESTAMP` para solo fechas                           |
| Booleanos                | `BOOLEAN`                               | `SMALLINT`, `CHAR(1)`                                  |
| JSON estructurado        | `JSONB`                                 | `JSON` (no indexable eficientemente)                   |
| Enumerados estables      | `TEXT` + CHECK constraint               | `ENUM` (difícil de alterar)                            |
| Enumerados con dominio   | Tabla de lookup + FK                    | ENUM de PostgreSQL                                     |
| Arrays                   | `TEXT[]`, `INT[]`, etc.                 | Tabla separada si hay consultas complejas              |
| Rangos                   | `DATERANGE`, `TSTZRANGE`, `INT4RANGE`   | Dos columnas separadas cuando apliquen                 |
| Coordenadas geográficas  | `POINT` o PostGIS `GEOMETRY`            | `FLOAT` x2                                             |
| Binarios / archivos      | `BYTEA` (si < 1MB) o referencia externa | Grandes blobs en DB                                    |
| IPs                      | `INET` o `CIDR`                         | `VARCHAR`                                              |

---

## Patrones de modelado comunes

### Auditoría (audit trail)

```sql
-- Opción A: Columnas de auditoría en cada tabla (simple)
ALTER TABLE orders ADD COLUMN created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE orders ADD COLUMN updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE orders ADD COLUMN created_by  UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN updated_by  UUID REFERENCES users(id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Opción B: Tabla de auditoría centralizada (historial completo)
CREATE TABLE audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  operation   TEXT        NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID        REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at   ON audit_log(changed_at DESC);
```

### Soft deletes

```sql
-- Columna deleted_at (NULL = activo)
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;

-- Vista para queries normales (solo activos)
CREATE VIEW active_customers AS
  SELECT * FROM customers WHERE deleted_at IS NULL;

-- Índice parcial para queries sobre activos
CREATE INDEX idx_customers_active ON customers(email) WHERE deleted_at IS NULL;

-- IMPORTANTE: todos los FK que apunten a esta tabla deben decidir
-- si incluyen o excluyen registros eliminados
```

### Multi-tenancy

```sql
-- Opción A: Row-Level Security (RLS) — misma tabla, acceso controlado
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Opción B: Schema por tenant (mejor aislamiento, más complejo de escalar)
CREATE SCHEMA tenant_abc123;
CREATE TABLE tenant_abc123.orders (...);

-- Opción C: Base de datos por tenant (máximo aislamiento, costoso)
-- Solo para SaaS enterprise con pocos tenants grandes
```

### Relaciones N:M

```sql
-- Tabla de unión con atributos propios
CREATE TABLE order_products (
  order_id    UUID NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INT  NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  discount    NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX idx_order_products_product ON order_products(product_id);
```

### Herencia de tablas (Table Inheritance)

```sql
-- Útil para entidades polimórficas con campos comunes
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_notifications (
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  recipient   TEXT NOT NULL
) INHERITS (notifications);

CREATE TABLE push_notifications (
  title       TEXT NOT NULL,
  device_token TEXT NOT NULL
) INHERITS (notifications);
```

### Particionamiento

```sql
-- Por rango de fechas (ideal para datos temporales / logs)
CREATE TABLE events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY,
  event_type TEXT        NOT NULL,
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_q1 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE events_2025_q2 PARTITION OF events
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Por lista (ideal para multi-tenancy por tenant_id o región)
CREATE TABLE orders (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region    TEXT NOT NULL,
  ...
) PARTITION BY LIST (region);

CREATE TABLE orders_pe PARTITION OF orders FOR VALUES IN ('PE');
CREATE TABLE orders_mx PARTITION OF orders FOR VALUES IN ('MX');
```

---

## Índices — Estrategia

### Cuándo crear índices

```sql
-- 1. Siempre: columnas FK (PostgreSQL NO las indexa automáticamente)
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- 2. Columnas frecuentemente filtradas en WHERE
CREATE INDEX idx_orders_status ON orders(status);

-- 3. Índices compuestos (orden importa: columna más selectiva primero,
--    luego columnas de ORDER BY)
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- 4. Índices parciales (subconjunto de filas — más pequeños y rápidos)
CREATE INDEX idx_orders_pending ON orders(created_at)
  WHERE status = 'pending';

-- 5. Índices JSONB
CREATE INDEX idx_products_attrs_gin ON products USING GIN(attributes);
-- Para path específico:
CREATE INDEX idx_products_brand ON products ((attributes->>'brand'));

-- 6. Índices para búsqueda de texto
CREATE INDEX idx_products_name_fts ON products
  USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));

-- 7. Índices de cobertura (INCLUDE) — evitan heap fetch
CREATE INDEX idx_orders_status_covering
  ON orders(status) INCLUDE (customer_id, total, created_at);
```

### Cuándo NO crear índices

- Tablas pequeñas (< 10k filas): el seq scan suele ser más rápido
- Columnas con cardinalidad muy baja (booleanos) sin filtros adicionales
- Columnas muy poco usadas en queries: el overhead de escritura no vale
- No indexar todo "por si acaso": degrada INSERT/UPDATE/DELETE

---

## Constraints — Buenas prácticas

```sql
-- Siempre nombrar constraints explícitamente (facilita migraciones)
CREATE TABLE products (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  sku         TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock       INT         NOT NULL DEFAULT 0,
  category_id UUID        NOT NULL,

  CONSTRAINT pk_products          PRIMARY KEY (id),
  CONSTRAINT uq_products_sku      UNIQUE (sku),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
                                  REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_products_price   CHECK (price >= 0),
  CONSTRAINT chk_products_stock   CHECK (stock >= 0),
  CONSTRAINT chk_products_sku_fmt CHECK (sku ~ '^[A-Z0-9\-]{3,20}$')
);
```

---

## Migraciones

### Principios

1. **Siempre versionadas y ordenadas** (Flyway, Liquibase, golang-migrate, Prisma Migrate)
2. **Reversibles cuando sea posible** (up + down)
3. **Sin downtime para operaciones comunes**:

```sql
-- ✅ Agregar columna nullable (instantáneo)
ALTER TABLE orders ADD COLUMN notes TEXT;

-- ✅ Agregar columna con DEFAULT (PostgreSQL 11+: instantáneo)
ALTER TABLE orders ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- ✅ Crear índice sin bloquear (CONCURRENTLY)
CREATE INDEX CONCURRENTLY idx_orders_notes ON orders(notes)
  WHERE notes IS NOT NULL;

-- ✅ Agregar FK sin validar primero, luego validar
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;
-- (después, fuera de hora pico)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;

-- ❌ Evitar en producción sin mantenimiento:
ALTER TABLE orders ALTER COLUMN status SET NOT NULL; -- bloqueo total
ALTER TABLE orders ADD COLUMN code TEXT NOT NULL;    -- si tiene DEFAULT volátil
```

---

## Checklist de revisión de esquemas

Antes de dar un esquema por terminado, verifica:

- [ ] Todas las tablas tienen PK definida
- [ ] Todas las FK están indexadas
- [ ] Tipos de datos apropiados (TIMESTAMPTZ, no TIMESTAMP; NUMERIC para dinero)
- [ ] Constraints nombradas explícitamente
- [ ] Columnas NOT NULL donde corresponde
- [ ] Auditoría definida (created_at, updated_at mínimo)
- [ ] Índices para queries de alta frecuencia
- [ ] Particionamiento considerado para tablas > 50M filas
- [ ] Estrategia de soft deletes o eliminación física definida
- [ ] Migraciones son reversibles y sin downtime

---

## Referencias adicionales

Para temas especializados, consulta los archivos en `references/`:

- `references/jsonb-patterns.md` — Patrones avanzados con JSONB
- `references/performance.md` — Query optimization, EXPLAIN ANALYZE, vacuum
- `references/extensions.md` — PostGIS, pg_trgm, uuid-ossp, pgcrypto, etc.
- `references/replication.md` — Logical replication, read replicas, Citus

---

## Formato de respuesta esperado

Al entregar un diseño, estructura tu respuesta así:

1. **Entendimiento del dominio** (2-3 líneas del problema)
2. **Decisiones de diseño clave** (bullet points con justificación)
3. **DDL completo** (SQL ejecutable, con comentarios)
4. **Diagrama ERD** (Mermaid o ASCII)
5. **Índices recomendados** (con justificación por índice)
6. **Trade-offs y advertencias** (qué se sacrifica y por qué)
7. **Próximos pasos sugeridos** (migraciones, seeds, vistas, etc.)
