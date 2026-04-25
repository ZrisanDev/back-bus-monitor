# JSONB Patterns en PostgreSQL

## Cuándo usar JSONB

**Úsalo cuando:**

- Los atributos varían por registro (productos con specs distintas, metadata dinámica)
- El esquema evoluciona frecuentemente
- Necesitas almacenar configuraciones o preferencias flexibles
- Datos semi-estructurados de APIs externas

**Evítalo cuando:**

- Todos los registros tienen los mismos campos → columnas normales
- Necesitas integridad referencial sobre los campos → normaliza
- Las queries filtran/ordenan frecuentemente por campos internos → columnas normales

---

## Operadores esenciales

```sql
-- Acceso a campos
SELECT data->>'name'          FROM products;  -- como TEXT
SELECT data->'price'          FROM products;  -- como JSONB
SELECT data#>>'{address,city}' FROM customers; -- path anidado como TEXT
SELECT data#>'{tags,0}'        FROM posts;     -- primer elemento de array

-- Filtros
SELECT * FROM products WHERE data->>'category' = 'electronics';
SELECT * FROM products WHERE data @> '{"brand": "Samsung"}';  -- contiene
SELECT * FROM products WHERE data ? 'discount';               -- tiene clave
SELECT * FROM products WHERE data ?| ARRAY['sale','clearance']; -- tiene alguna
SELECT * FROM products WHERE data ?& ARRAY['sku','price'];      -- tiene todas

-- Arrays JSONB
SELECT * FROM products WHERE data->'tags' @> '["sale"]';
SELECT jsonb_array_length(data->'images') FROM products;
SELECT jsonb_array_elements_text(data->'tags') FROM products;
```

## Índices GIN para JSONB

```sql
-- Índice general (cubre @>, ?, ?|, ?&)
CREATE INDEX idx_products_data ON products USING GIN(data);

-- Índice en path específico (más pequeño, para filtros en un campo)
CREATE INDEX idx_products_category ON products ((data->>'category'));
CREATE INDEX idx_products_price     ON products (((data->>'price')::NUMERIC));

-- Índice jsonb_path_ops (solo @>, más rápido para containment)
CREATE INDEX idx_products_data_path ON products
  USING GIN(data jsonb_path_ops);
```

## Actualización de campos JSONB

```sql
-- Actualizar un campo sin reemplazar todo el objeto
UPDATE products
SET data = jsonb_set(data, '{price}', '29.99')
WHERE id = $1;

-- Agregar campo nuevo
UPDATE products
SET data = data || '{"on_sale": true}'::jsonb
WHERE id = $1;

-- Eliminar un campo
UPDATE products
SET data = data - 'legacy_field'
WHERE id = $1;

-- Eliminar campo anidado
UPDATE products
SET data = data #- '{specs,deprecated_key}'
WHERE id = $1;
```

## Patrón: EAV con JSONB

```sql
-- En vez de Entity-Attribute-Value con 3 tablas (anti-patrón clásico):
-- Usa una columna JSONB para atributos dinámicos

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  base_price  NUMERIC(10,2) NOT NULL,
  -- Atributos específicos por categoría aquí:
  attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Electrónicos: {"brand":"Sony","voltage":220,"warranty_months":12}
-- Ropa: {"size":"M","color":"blue","material":"cotton"}
-- Alimentos: {"weight_g":500,"allergens":["gluten"],"expires_days":30}
```

## Validación con CHECK constraints

```sql
-- Asegurar que JSONB tenga campos requeridos
ALTER TABLE products ADD CONSTRAINT chk_products_attrs_required
  CHECK (
    attributes ? 'sku' AND
    jsonb_typeof(attributes->'price') = 'number'
  );

-- O usar JSON Schema via extensión (pg_jsonschema si está disponible)
```
