// Import will fail until migration file is created — that's the RED phase
import { AddTelemetryStatusColumns1700000016000 } from '../016_add_telemetry_status_columns';

describe('Migration 016: Add telemetry status columns to reports', () => {
  let migration: AddTelemetryStatusColumns1700000016000;

  beforeEach(() => {
    migration = new AddTelemetryStatusColumns1700000016000();
  });

  // ── SCN: Migration implements MigrationInterface ──────────────────────

  it('should have up and down methods', () => {
    expect(migration.up).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(migration.down).toBeDefined();
    expect(typeof migration.down).toBe('function');
  });

  // ── SCN: up() adds status varchar column ─────────────────────────────

  it('should add status varchar column to reports table', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('status');
    expect(allSql).toContain('reports');
  });

  // ── SCN: up() adds current_stop varchar column ───────────────────────

  it('should add current_stop varchar column to reports table', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('current_stop');
    expect(allSql).toContain('reports');
  });

  // ── SCN: up() adds next_stop varchar column ──────────────────────────

  it('should add next_stop varchar column to reports table', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('next_stop');
    expect(allSql).toContain('reports');
  });

  // ── SCN: All three columns are nullable varchar(100) ─────────────────

  it('should define all three columns as nullable varchar(100)', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    // Each column should have varchar(100) and be nullable
    expect(allSql).toMatch(/status.*varchar\(100\)/i);
    expect(allSql).toMatch(/current_stop.*varchar\(100\)/i);
    expect(allSql).toMatch(/next_stop.*varchar\(100\)/i);
  });

  // ── SCN: down() drops all three columns ──────────────────────────────

  it('should drop all three columns in down()', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('status');
    expect(allSql).toContain('current_stop');
    expect(allSql).toContain('next_stop');
  });

  // ── SCN: Triangulation — up adds, down drops (symmetry) ──────────────

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
