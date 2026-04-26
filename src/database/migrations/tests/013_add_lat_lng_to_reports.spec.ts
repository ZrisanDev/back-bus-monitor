// Import will fail until migration file is created — that's the RED phase
import { AddLatLngToReports1700000013000 } from '../013_add_lat_lng_to_reports';

describe('Migration 013: Add latitude/longitude to reports', () => {
  let migration: AddLatLngToReports1700000013000;

  beforeEach(() => {
    migration = new AddLatLngToReports1700000013000();
  });

  // ── SCN: Migration implements MigrationInterface ──────────────────────

  it('should have up and down methods', () => {
    expect(migration.up).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(migration.down).toBeDefined();
    expect(typeof migration.down).toBe('function');
  });

  // ── SCN: up() adds latitude and longitude columns ────────────────────────

  it('should call queryRunner.query to add latitude and longitude columns', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('latitude');
    expect(allSql).toContain('longitude');
    expect(allSql).toContain('reports');
  });

  // ── SCN: latitude uses NUMERIC(10,8) ───────────────────────────────────

  it('should define latitude as NUMERIC(10,8) NOT NULL', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/NUMERIC\(10,\s*8\)/);
    expect(allSql).toMatch(/latitude.*NOT NULL/i);
  });

  // ── SCN: longitude uses NUMERIC(11,8) ──────────────────────────────────

  it('should define longitude as NUMERIC(11,8) NOT NULL', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/NUMERIC\(11,\s*8\)/);
    expect(allSql).toMatch(/longitude.*NOT NULL/i);
  });

  // ── SCN: CHECK constraints for latitude range [-90, 90] ────────────────

  it('should add CHECK constraint for latitude range', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/chk_reports_latitude/i);
    expect(allSql).toMatch(/latitude.*>=.*-90/i);
    expect(allSql).toMatch(/latitude.*<=.*90/i);
  });

  // ── SCN: CHECK constraints for longitude range [-180, 180] ─────────────

  it('should add CHECK constraint for longitude range', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/chk_reports_longitude/i);
    expect(allSql).toMatch(/longitude.*>=.*-180/i);
    expect(allSql).toMatch(/longitude.*<=.*180/i);
  });

  // ── SCN: Composite index on (bus_id, timestamp DESC) ───────────────────

  it('should create composite index on (bus_id, timestamp DESC)', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/idx_reports_bus_timestamp/i);
    expect(allSql).toMatch(/bus_id.*timestamp.*DESC/i);
  });

  // ── SCN: down() reverses the migration ─────────────────────────────────

  it('should drop index, constraints and columns in down()', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('latitude');
    expect(allSql).toContain('longitude');
  });

  // ── SCN: Triangulation — up adds, down drops ───────────────────────────

  it('should have ADD in up and DROP in down', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const mockUpQueryRunner = {
      query: jest.fn((sql: string) => {
        upQueries.push(sql);
      }),
    } as any;
    const mockDownQueryRunner = {
      query: jest.fn((sql: string) => {
        downQueries.push(sql);
      }),
    } as any;

    await migration.up(mockUpQueryRunner);
    await migration.down(mockDownQueryRunner);

    const upSql = upQueries.join('\n');
    const downSql = downQueries.join('\n');

    expect(upSql).toContain('ADD');
    expect(downSql).toContain('DROP');
  });
});
