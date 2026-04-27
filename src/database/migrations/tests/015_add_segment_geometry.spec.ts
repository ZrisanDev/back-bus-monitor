// Import will fail until migration file is created — that's the RED phase
import { AddSegmentGeometry1700000015000 } from '../015_add_segment_geometry';

describe('Migration 015: Add segment_geometry JSONB to route_stops', () => {
  let migration: AddSegmentGeometry1700000015000;

  beforeEach(() => {
    migration = new AddSegmentGeometry1700000015000();
  });

  // ── SCN: Migration implements MigrationInterface ──────────────────────

  it('should have up and down methods', () => {
    expect(migration.up).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(migration.down).toBeDefined();
    expect(typeof migration.down).toBe('function');
  });

  // ── SCN: up() adds segment_geometry JSONB NULL column ──────────────────

  it('should add segment_geometry column as JSONB NULL', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('segment_geometry');
    expect(allSql).toMatch(/JSONB/i);
    expect(allSql).toContain('route_stops');
  });

  // ── SCN: up() adds CHECK constraint for valid GeoJSON LineString ───────

  it('should add chk_route_stops_segment_geo CHECK constraint', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('chk_route_stops_segment_geo');
    expect(allSql).toMatch(/LineString/i);
    expect(allSql).toMatch(/coordinates/i);
  });

  // ── SCN: up() creates GIN index on segment_geometry ────────────────────

  it('should create idx_route_stops_segment_geo GIN index', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.up(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('idx_route_stops_segment_geo');
    expect(allSql).toMatch(/GIN/i);
    expect(allSql).toContain('segment_geometry');
  });

  // ── SCN: down() drops index, constraint, and column ───────────────────

  it('should drop index, constraint, and column in down()', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('segment_geometry');
    expect(allSql).toMatch(/DROP/i);
  });

  // ── TRIANGULATION: up adds, down drops — symmetry check ──────────────

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

  // ── TRIANGULATION: down drops constraint and index explicitly ──────────

  it('should drop chk_route_stops_segment_geo constraint and idx_route_stops_segment_geo index in down', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
      }),
    } as any;

    await migration.down(mockQueryRunner);

    const allSql = queries.join('\n');
    expect(allSql).toContain('idx_route_stops_segment_geo');
    expect(allSql).toContain('chk_route_stops_segment_geo');
    expect(allSql).toContain('segment_geometry');
  });
});
