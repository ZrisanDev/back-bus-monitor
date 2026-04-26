import { AppDataSource } from '../migrations/data-source';

describe('Migration DataSource — data-source.ts', () => {
  // ── SCN: All 10 entities are registered ──────────────────────────────

  it('should register all 10 entities', () => {
    const entities = AppDataSource.options.entities as Function[];

    expect(entities).toHaveLength(10);
  });

  // ── SCN: Core entities are present ───────────────────────────────────

  it('should include Bus and Report entities', () => {
    const entities = AppDataSource.options.entities as Function[];
    const entityNames = entities.map((e: any) => e.name ?? e.constructor?.name);

    expect(entityNames).toContain('Bus');
    expect(entityNames).toContain('Report');
  });

  // ── SCN: New feature entities are present ────────────────────────────

  it('should include all new feature entities (Direction, Route, Stop, DayType, RouteStop, Holiday, Schedule, BusAssignment)', () => {
    const entities = AppDataSource.options.entities as Function[];
    const entityNames = entities.map((e: any) => e.name ?? e.constructor?.name);

    expect(entityNames).toContain('Direction');
    expect(entityNames).toContain('Route');
    expect(entityNames).toContain('Stop');
    expect(entityNames).toContain('DayType');
    expect(entityNames).toContain('RouteStop');
    expect(entityNames).toContain('Holiday');
    expect(entityNames).toContain('Schedule');
    expect(entityNames).toContain('BusAssignment');
  });

  // ── SCN: All 14 migration files are registered ───────────────────────

  it('should register exactly 14 migration files', () => {
    const migrations = AppDataSource.options.migrations as string[];

    expect(migrations).toHaveLength(14);
  });

  // ── SCN: Migrations are in correct order ─────────────────────────────

  it('should have migrations ordered from 001 to 014', () => {
    const migrations = AppDataSource.options.migrations as string[];

    expect(migrations[0]).toContain('001_create_buses');
    expect(migrations[1]).toContain('002_create_reports');
    expect(migrations[2]).toContain('003_create_directions');
    expect(migrations[3]).toContain('004_create_routes');
    expect(migrations[4]).toContain('005_create_stops');
    expect(migrations[5]).toContain('006_create_day_types');
    expect(migrations[6]).toContain('007_create_route_stops');
    expect(migrations[7]).toContain('008_create_holidays');
    expect(migrations[8]).toContain('009_create_schedules');
    expect(migrations[9]).toContain('010_create_bus_assignments');
    expect(migrations[10]).toContain('011_add_route_stop_to_reports');
    expect(migrations[11]).toContain('012_enforce_report_route_stop_not_null');
    expect(migrations[12]).toContain('013_add_lat_lng_to_reports');
    expect(migrations[13]).toContain('014_reconcile_reports_geo_constraints');
  });

  // ── SCN: DataSource is configured for PostgreSQL ──────────────────────

  it('should use PostgreSQL type', () => {
    expect(AppDataSource.options.type).toBe('postgres');
  });

  // ── SCN: Synchronize is disabled (migration-driven) ──────────────────

  it('should have synchronize disabled', () => {
    expect((AppDataSource.options as any).synchronize).toBe(false);
  });
});
