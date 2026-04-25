import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';

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

  // ── SCN: Report can be instantiated with all required fields ────────

  it('should create a Report with required fields', () => {
    const bus = makeBus();
    const report = new Report();
    report.id = 1;
    report.bus_id = 1;
    report.latitude = -34.6;
    report.longitude = -58.38;
    report.passenger_count = 22;
    report.bus = bus;

    expect(report.id).toBe(1);
    expect(report.bus_id).toBe(1);
    expect(report.latitude).toBe(-34.6);
    expect(report.longitude).toBe(-58.38);
    expect(report.passenger_count).toBe(22);
    expect(report.bus).toEqual(bus);
  });

  // ── SCN: Triangulation — different values ────────────────────────────

  it('should create a Report with different values', () => {
    const bus = makeBus({ id: 5, code: 'BUS-005', capacity: 60 });
    const report = new Report();
    report.id = 99;
    report.bus_id = 5;
    report.latitude = 40.7128;
    report.longitude = -74.006;
    report.passenger_count = 0;
    report.bus = bus;

    expect(report.id).toBe(99);
    expect(report.bus_id).toBe(5);
    expect(report.latitude).toBe(40.7128);
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
});
