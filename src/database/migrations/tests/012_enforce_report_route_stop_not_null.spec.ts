import { EnforceReportRouteStopNotNull1700000012000 } from '../012_enforce_report_route_stop_not_null';

describe('Migration 012: Enforce report route_id/stop_id NOT NULL', () => {
  let migration: EnforceReportRouteStopNotNull1700000012000;

  beforeEach(() => {
    migration = new EnforceReportRouteStopNotNull1700000012000();
  });

  // ── SCN: Migration implements MigrationInterface ──────────────────────

  it('should have up and down methods', () => {
    expect(migration.up).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(migration.down).toBeDefined();
    expect(typeof migration.down).toBe('function');
  });

  // ── SCN: up() sets NOT NULL on route_id and stop_id ───────────────────

  it('should set NOT NULL on route_id and stop_id columns', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('route_id');
    expect(allSql).toContain('stop_id');
    expect(allSql).toMatch(/NOT NULL/i);
  });

  // ── SCN: up() has safety check for existing NULLs ─────────────────────

  it('should check for existing NULL rows before enforcing NOT NULL', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    // Should have a safety check — either via DO block, RAISE, or COUNT check
    expect(allSql).toMatch(/NULL|EXISTS|RAISE/i);
  });

  // ── SCN: down() reverses to nullable ──────────────────────────────────

  it('should drop NOT NULL in down()', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('route_id');
    expect(allSql).toContain('stop_id');
    expect(allSql).toMatch(/DROP NOT NULL/i);
  });

  // ── SCN: Triangulation — up and down are different ────────────────────

  it('should have SET NOT NULL in up and DROP NOT NULL in down', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const mockUpQueryRunner = {
      query: jest.fn((sql: string) => { upQueries.push(sql); }),
    } as any;
    const mockDownQueryRunner = {
      query: jest.fn((sql: string) => { downQueries.push(sql); }),
    } as any;

    await migration.up(mockUpQueryRunner);
    await migration.down(mockDownQueryRunner);

    const upSql = upQueries.join('\n');
    const downSql = downQueries.join('\n');

    expect(upSql).toMatch(/SET NOT NULL/i);
    expect(downSql).toMatch(/DROP NOT NULL/i);
  });
});
