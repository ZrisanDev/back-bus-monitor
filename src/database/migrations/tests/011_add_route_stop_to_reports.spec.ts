// Import will fail until migration file is created — that's the RED phase
import { AddRouteStopToReports1700000011000 } from '../011_add_route_stop_to_reports';

describe('Migration 011: Add route_stop to reports', () => {
  let migration: AddRouteStopToReports1700000011000;

  beforeEach(() => {
    migration = new AddRouteStopToReports1700000011000();
  });

  // ── SCN: Migration implements MigrationInterface ──────────────────────

  it('should have up and down methods', () => {
    expect(migration.up).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(migration.down).toBeDefined();
    expect(typeof migration.down).toBe('function');
  });

  // ── SCN: up() adds route_id and stop_id columns ────────────────────────

  it('should call queryRunner.query to add route_id and stop_id columns', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('route_id');
    expect(allSql).toContain('stop_id');
    expect(allSql).toContain('reports');
  });

  // ── SCN: up() adds FK constraints ──────────────────────────────────────

  it('should add foreign key constraints for route_id and stop_id', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('fk_reports_route');
    expect(allSql).toContain('fk_reports_stop');
    expect(allSql).toContain('REFERENCES routes');
    expect(allSql).toContain('REFERENCES stops');
  });

  // ── SCN: up() adds indexes on route_id and stop_id ─────────────────────

  it('should create indexes on route_id and stop_id', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('idx_reports_route_id');
    expect(allSql).toContain('idx_reports_stop_id');
  });

  // ── SCN: columns are nullable (stage 9a) ────────────────────────────────

  it('should add route_id and stop_id as nullable columns', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toMatch(/route_id.*NULL/i);
    expect(allSql).toMatch(/stop_id.*NULL/i);
  });

  // ── SCN: down() reverses the migration ─────────────────────────────────

  it('should drop indexes, constraints and columns in down()', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => { queries.push(sql); }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('route_id');
    expect(allSql).toContain('stop_id');
  });

  // ── SCN: Triangulation — up adds, down drops ───────────────────────────

  it('should have ADD in up and DROP in down', async () => {
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

    expect(upSql).toContain('ADD');
    expect(downSql).toContain('DROP');
  });
});
