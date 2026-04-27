import { AppDataSource } from '../migrations/data-source';

describe('Migration DataSource — data-source.ts', () => {
  it('should register exactly 6 entities', () => {
    const entities = AppDataSource.options.entities as Function[];

    expect(entities).toHaveLength(6);
  });

  it('should include core entities', () => {
    const entities = AppDataSource.options.entities as Function[];
    const entityNames = entities.map((e: any) => e.name ?? e.constructor?.name);

    expect(entityNames).toContain('Bus');
    expect(entityNames).toContain('Report');
    expect(entityNames).toContain('Route');
    expect(entityNames).toContain('Stop');
    expect(entityNames).toContain('RouteStop');
    expect(entityNames).toContain('BusAssignment');
  });

  it('should register exactly 13 migration files', () => {
    const migrations = AppDataSource.options.migrations as string[];

    expect(migrations).toHaveLength(13);
  });

  it('should have migrations ordered from 001 to 017', () => {
    const migrations = AppDataSource.options.migrations as string[];

    expect(migrations[0]).toContain('001_create_buses');
    expect(migrations[1]).toContain('002_create_reports');
    expect(migrations[2]).toContain('004_create_routes');
    expect(migrations[3]).toContain('005_create_stops');
    expect(migrations[4]).toContain('007_create_route_stops');
    expect(migrations[5]).toContain('010_create_bus_assignments');
    expect(migrations[12]).toContain('017_drop_direction_from_route_stops');
  });

  it('should use PostgreSQL type', () => {
    expect(AppDataSource.options.type).toBe('postgres');
  });

  it('should have synchronize disabled', () => {
    expect((AppDataSource.options as any).synchronize).toBe(false);
  });
});
