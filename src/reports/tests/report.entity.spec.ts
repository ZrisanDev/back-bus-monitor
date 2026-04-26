import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';

describe('Report Entity', () => {
  // ── Helper to create a Bus instance ──────────────────────────────────

  const makeBus = (overrides: Partial<Bus> = {}): Bus => ({
    id: 1,
    code: 'BUS-001',
    capacity: 40,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const makeRoute = (overrides: Partial<Route> = {}): Route => ({
    id: 1,
    name: 'Línea 1',
    description: null,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
    id: 1,
    name: 'Parada Central',
    latitude: -34.603722,
    longitude: -58.381592,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ── SCN: Report can be instantiated with all required fields ────────

  it('should create a Report with required fields', () => {
    const bus = makeBus();
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 22;
    report.bus = bus;

    expect(report.id).toBe(1);
    expect(report.bus_id).toBe(1);
    expect(report.passenger_count).toBe(22);
    expect(report.bus).toEqual(bus);
  });

  // ── SCN: Triangulation — different values ────────────────────────────

  it('should create a Report with different values', () => {
    const bus = makeBus({ id: 5, code: 'BUS-005', capacity: 60 });
    const report = new Report();
    report.id = 99;
    report.bus_id = 5;
    report.passenger_count = 0;
    report.bus = bus;

    expect(report.id).toBe(99);
    expect(report.bus_id).toBe(5);
    expect(report.passenger_count).toBe(0);
    expect(report.bus.code).toBe('BUS-005');
  });

  // ── SCN: Report has timestamp field from DB ─────────────────────────

  it('should have a timestamp field set by DB default', () => {
    const report = new Report();
    const now = new Date();
    report.timestamp = now;

    expect(report.timestamp).toEqual(now);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-010: route_id and stop_id nullable columns
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: Report can have route_id and stop_id set ────────────────────

  it('should accept route_id and stop_id fields', () => {
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 22;
    report.route_id = 10;
    report.stop_id = 20;

    expect(report.route_id).toBe(10);
    expect(report.stop_id).toBe(20);
  });

  // ── SCN: Triangulation — route_id and stop_id can be null (legacy) ──

  it('should allow route_id and stop_id to be null for legacy reports', () => {
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 15;
    report.route_id = null;
    report.stop_id = null;

    expect(report.route_id).toBeNull();
    expect(report.stop_id).toBeNull();
  });

  // ── SCN: Report has route relation ───────────────────────────────────

  it('should have a route relation', () => {
    const route = makeRoute({ id: 10, name: 'Línea 10' });
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 22;
    report.route_id = 10;
    report.route = route;

    expect(report.route).toEqual(route);
    expect(report.route.name).toBe('Línea 10');
  });

  // ── SCN: Report has stop relation ────────────────────────────────────

  it('should have a stop relation', () => {
    const stop = makeStop({ id: 20, name: 'Parada Norte' });
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 22;
    report.stop_id = 20;
    report.stop = stop;

    expect(report.stop).toEqual(stop);
    expect(report.stop.name).toBe('Parada Norte');
  });

  // ── SCN: Triangulation — different route/stop values ─────────────────

  it('should accept different route_id and stop_id values', () => {
    const report = new Report();
    report.id = 5;
    report.bus_id = 3;
    report.passenger_count = 10;
    report.route_id = 42;
    report.stop_id = 99;

    expect(report.route_id).toBe(42);
    expect(report.stop_id).toBe(99);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-013: latitude and longitude columns
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: Report has latitude and longitude fields ─────────────────────

  it('should accept latitude and longitude fields', () => {
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.passenger_count = 22;
    report.route_id = 10;
    report.stop_id = 20;
    report.latitude = -12.1294423;
    report.longitude = -77.0228339;

    expect(report.latitude).toBe(-12.1294423);
    expect(report.longitude).toBe(-77.0228339);
  });

  // ── SCN: Triangulation — different lat/lng values ─────────────────────

  it('should accept different latitude and longitude values', () => {
    const report = new Report();
    report.id = 2;
    report.bus_id = 2;
    report.passenger_count = 15;
    report.route_id = 5;
    report.stop_id = 8;
    report.latitude = -34.603722;
    report.longitude = -58.381592;

    expect(report.latitude).toBe(-34.603722);
    expect(report.longitude).toBe(-58.381592);
  });
});