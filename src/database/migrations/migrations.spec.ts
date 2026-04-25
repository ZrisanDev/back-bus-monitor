import { Client } from 'pg';

// These tests require a running PostgreSQL instance (e.g. docker-compose up db).
// They connect to real PG, create tables with raw SQL matching the migration files,
// verify the schema via information_schema, and clean up afterward.
//
// If PG is not available, all tests are skipped gracefully.

const DB_HOST = process.env.TEST_DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.TEST_DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'bus_monitor';

// Use prefixed table names to avoid conflicts with dev data
const BUSES_TABLE = 'test_buses';
const REPORTS_TABLE = 'test_reports';

const SQL_CREATE_BUSES = `
  CREATE TABLE ${BUSES_TABLE} (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_buses_code UNIQUE (code),
    CONSTRAINT chk_buses_capacity_positive CHECK (capacity > 0)
  );
`;

const SQL_CREATE_REPORTS = `
  CREATE TABLE ${REPORTS_TABLE} (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bus_id BIGINT NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    passenger_count INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reports_bus FOREIGN KEY (bus_id) REFERENCES ${BUSES_TABLE}(id) ON DELETE RESTRICT,
    CONSTRAINT chk_reports_passenger_count CHECK (passenger_count >= 0)
  );
  CREATE INDEX idx_reports_bus_id ON ${REPORTS_TABLE} (bus_id);
  CREATE INDEX idx_reports_timestamp ON ${REPORTS_TABLE} (timestamp DESC);
`;

const SQL_DROP_REPORTS = `DROP TABLE IF EXISTS ${REPORTS_TABLE};`;
const SQL_DROP_BUSES = `DROP TABLE IF EXISTS ${BUSES_TABLE};`;

describe('Database Migrations — Schema Validation', () => {
  let client: Client;
  let canConnect = false;

  beforeAll(async () => {
    client = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
    try {
      await client.connect();
      canConnect = true;
    } catch {
      console.warn(
        '⚠ PostgreSQL not available — skipping migration integration tests',
      );
      console.warn(
        `  Connection: ${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      );
    }
  });

  afterAll(async () => {
    if (canConnect && client) {
      await client.end();
    }
  });

  // ---------------------------------------------------------------
  // Setup: create tables with raw SQL (the executable spec)
  // ---------------------------------------------------------------
  beforeAll(async () => {
    if (!canConnect) return;

    await client.query(SQL_DROP_REPORTS);
    await client.query(SQL_DROP_BUSES);
    await client.query(SQL_CREATE_BUSES);
    await client.query(SQL_CREATE_REPORTS);
  });

  // ---------------------------------------------------------------
  // Teardown: clean up test tables
  // ---------------------------------------------------------------
  afterAll(async () => {
    if (!canConnect) return;

    await client.query(SQL_DROP_REPORTS);
    await client.query(SQL_DROP_BUSES);
  });

  // Each test must bail if PG is not available
  const requireConnection = () => {
    if (!canConnect) {
      console.warn('  Skipping — PG not available');
      return false;
    }
    return true;
  };

  // ===============================================================
  // Buses table — column types
  // ===============================================================
  describe('buses table columns', () => {
    it('should have an id column of type bigint', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'id'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('int8');
    });

    it('should have a code column of type character varying(50)', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, character_maximum_length
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'code'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('character varying');
      expect(result.rows[0].character_maximum_length).toBe(50);
    });

    it('should have a capacity column of type integer', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'capacity'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('int4');
    });

    it('should have created_at column of type timestamptz', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'created_at'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('timestamptz');
    });

    it('should have updated_at column of type timestamptz', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'updated_at'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('timestamptz');
    });

    it('should have exactly 5 columns', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(5);
      const names = result.rows.map((r) => r.column_name);
      expect(names).toEqual([
        'id',
        'code',
        'capacity',
        'created_at',
        'updated_at',
      ]);
    });
  });

  // ===============================================================
  // Buses table — constraints
  // ===============================================================
  describe('buses table constraints', () => {
    it('should have a PRIMARY KEY on id', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT constraint_type
         FROM information_schema.table_constraints
         WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should have UNIQUE constraint uq_buses_code on code', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT constraint_name, constraint_type
         FROM information_schema.table_constraints
         WHERE table_name = $1 AND constraint_name = 'uq_buses_code'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_type).toBe('UNIQUE');
    });

    it('should have CHECK constraint chk_buses_capacity_positive', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = $1
           AND constraint_type = 'CHECK'
           AND constraint_name = 'chk_buses_capacity_positive'`,
        [BUSES_TABLE],
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should enforce capacity > 0 via CHECK constraint', async () => {
      if (!requireConnection()) return;
      // Insert a row with invalid capacity → should throw
      await expect(
        client.query(
          `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('BAD-CODE', -5)`,
        ),
      ).rejects.toThrow();

      // Insert a row with valid capacity → should succeed
      await client.query(
        `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('CHK-TEST', 30)`,
      );
      const result = await client.query(
        `SELECT code, capacity FROM ${BUSES_TABLE} WHERE code = 'CHK-TEST'`,
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].capacity).toBe(30);
    });
  });

  // ===============================================================
  // Reports table — column types
  // ===============================================================
  describe('reports table columns', () => {
    it('should have an id column of type bigint', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'id'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('int8');
    });

    it('should have a bus_id column of type bigint', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'bus_id'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('int8');
    });

    it('should have latitude column as NUMERIC(10,8)', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, numeric_precision, numeric_scale
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'latitude'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('numeric');
      expect(result.rows[0].numeric_precision).toBe(10);
      expect(result.rows[0].numeric_scale).toBe(8);
    });

    it('should have longitude column as NUMERIC(11,8)', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, numeric_precision, numeric_scale
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'longitude'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('numeric');
      expect(result.rows[0].numeric_precision).toBe(11);
      expect(result.rows[0].numeric_scale).toBe(8);
    });

    it('should have passenger_count column as integer with default 0', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, data_type, udt_name, column_default
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'passenger_count'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('int4');
      expect(result.rows[0].column_default).toBe('0');
    });

    it('should have timestamp column as timestamptz with default NOW()', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, udt_name, column_default
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'timestamp'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('timestamptz');
      expect(result.rows[0].column_default).toBe('now()');
    });

    it('should have created_at column as timestamptz', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name, udt_name
         FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'created_at'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].udt_name).toBe('timestamptz');
    });

    it('should have exactly 7 columns', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(7);
      const names = result.rows.map((r) => r.column_name);
      expect(names).toEqual([
        'id',
        'bus_id',
        'latitude',
        'longitude',
        'passenger_count',
        'timestamp',
        'created_at',
      ]);
    });
  });

  // ===============================================================
  // Reports table — constraints
  // ===============================================================
  describe('reports table constraints', () => {
    it('should have a PRIMARY KEY on id', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT constraint_type
         FROM information_schema.table_constraints
         WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should have FOREIGN KEY constraint fk_reports_bus referencing buses(id)', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT tc.constraint_name, tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
         WHERE tc.table_name = $1
           AND tc.constraint_name = 'fk_reports_bus'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].constraint_type).toBe('FOREIGN KEY');
      expect(result.rows[0].column_name).toBe('bus_id');
      expect(result.rows[0].delete_rule).toBe('NO ACTION');
    });

    it('should enforce FK restrict — inserting report with non-existent bus_id should fail', async () => {
      if (!requireConnection()) return;
      await expect(
        client.query(
          `INSERT INTO ${REPORTS_TABLE} (bus_id, latitude, longitude, passenger_count)
           VALUES (99999, -34.60372200, -58.38159200, 10)`,
        ),
      ).rejects.toThrow();
    });

    it('should enforce FK restrict — deleting a bus with reports should fail', async () => {
      if (!requireConnection()) return;
      // Insert a valid bus and a report referencing it
      await client.query(
        `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('FK-TEST-BUS', 50)`,
      );
      const busResult = await client.query(
        `SELECT id FROM ${BUSES_TABLE} WHERE code = 'FK-TEST-BUS'`,
      );
      const busId = busResult.rows[0].id;

      await client.query(
        `INSERT INTO ${REPORTS_TABLE} (bus_id, latitude, longitude, passenger_count)
         VALUES ($1, -34.60372200, -58.38159200, 10)`,
        [busId],
      );

      // Attempting to delete the bus should fail (RESTRICT)
      await expect(
        client.query(`DELETE FROM ${BUSES_TABLE} WHERE id = $1`, [busId]),
      ).rejects.toThrow();
    });

    it('should have CHECK constraint chk_reports_passenger_count', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = $1
           AND constraint_type = 'CHECK'
           AND constraint_name = 'chk_reports_passenger_count'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should enforce passenger_count >= 0 via CHECK constraint', async () => {
      if (!requireConnection()) return;
      // First insert a valid bus for FK reference
      await client.query(
        `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('CHK-RPT-BUS', 50) ON CONFLICT DO NOTHING`,
      );
      const busResult = await client.query(
        `SELECT id FROM ${BUSES_TABLE} WHERE code = 'CHK-RPT-BUS'`,
      );
      const busId = busResult.rows[0].id;

      // Negative passenger_count should fail
      await expect(
        client.query(
          `INSERT INTO ${REPORTS_TABLE} (bus_id, latitude, longitude, passenger_count)
           VALUES ($1, -34.60372200, -58.38159200, -1)`,
          [busId],
        ),
      ).rejects.toThrow();

      // Zero passenger_count should succeed
      await client.query(
        `INSERT INTO ${REPORTS_TABLE} (bus_id, latitude, longitude, passenger_count)
         VALUES ($1, -34.60372200, -58.38159200, 0)`,
        [busId],
      );
      const result = await client.query(
        `SELECT passenger_count FROM ${REPORTS_TABLE}
         WHERE bus_id = $1 AND passenger_count = 0`,
        [busId],
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===============================================================
  // Reports table — indexes
  // ===============================================================
  describe('reports table indexes', () => {
    it('should have index idx_reports_bus_id on bus_id', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = $1 AND indexname = 'idx_reports_bus_id'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].indexdef).toContain('bus_id');
    });

    it('should have index idx_reports_timestamp on timestamp DESC', async () => {
      if (!requireConnection()) return;
      const result = await client.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = $1 AND indexname = 'idx_reports_timestamp'`,
        [REPORTS_TABLE],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].indexdef).toContain('DESC');
    });
  });

  // ===============================================================
  // Data round-trip — verify actual inserts work correctly
  // ===============================================================
  describe('data round-trip', () => {
    it('should insert a bus and retrieve it with all columns', async () => {
      if (!requireConnection()) return;
      await client.query(
        `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('RT-001', 42)`,
      );
      const result = await client.query(
        `SELECT id, code, capacity, created_at, updated_at
         FROM ${BUSES_TABLE}
         WHERE code = 'RT-001'`,
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].code).toBe('RT-001');
      expect(result.rows[0].capacity).toBe(42);
      expect(result.rows[0].id).toBeDefined();
      expect(result.rows[0].created_at).toBeDefined();
      expect(result.rows[0].updated_at).toBeDefined();
    });

    it('should insert a report and retrieve it with all columns', async () => {
      if (!requireConnection()) return;
      // Ensure bus exists
      await client.query(
        `INSERT INTO ${BUSES_TABLE} (code, capacity) VALUES ('RT-002', 35) ON CONFLICT DO NOTHING`,
      );
      const busResult = await client.query(
        `SELECT id FROM ${BUSES_TABLE} WHERE code = 'RT-002'`,
      );
      const busId = busResult.rows[0].id;

      await client.query(
        `INSERT INTO ${REPORTS_TABLE}
           (bus_id, latitude, longitude, passenger_count, timestamp)
         VALUES ($1, -34.60372200, -58.38159200, 25, '2026-01-15T10:30:00Z')`,
        [busId],
      );
      const result = await client.query(
        `SELECT id, bus_id, latitude, longitude, passenger_count, timestamp, created_at
         FROM ${REPORTS_TABLE}
         WHERE bus_id = $1 AND passenger_count = 25`,
        [busId],
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].bus_id).toBe(busId);
      expect(result.rows[0].latitude).toBe('-34.60372200');
      expect(result.rows[0].longitude).toBe('-58.38159200');
      expect(result.rows[0].passenger_count).toBe(25);
    });
  });
});
