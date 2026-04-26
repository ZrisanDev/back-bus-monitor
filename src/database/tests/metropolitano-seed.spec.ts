import {
  parseSeedData,
  computeRouteSeedActions,
  computeStopSeedActions,
  computeRouteStopSeedActions,
  computeScheduleSeedActions,
  type SeedRoute,
  type SeedStop,
  type SeedRouteStop,
  type SeedSchedule,
} from '../seeds/metropolitano.seed';

// Load seed JSON via require (works with ts-jest without resolveJsonModule)
const seedJson = require('../../../data/metropolitano_seed_example.json');

describe('Metropolitano Seed: Routes, Stops, RouteStops', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // parseSeedData — validates and returns typed seed data
  // ═══════════════════════════════════════════════════════════════════════

  describe('parseSeedData', () => {
    it('should parse valid JSON into typed seed data', () => {
      const result = parseSeedData(seedJson);

      expect(result.routes).toHaveLength(1);
      expect(result.stops).toHaveLength(10);
      expect(result.routeStops).toHaveLength(20);
      expect(result.schedules).toHaveLength(6);
    });

    // ── SCN: Triangulation — missing routes_seed ────────────────────────

    it('should throw on missing routes_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).routes_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });

    // ── SCN: Triangulation — missing stops_catalog_seed ─────────────────

    it('should throw on missing stops_catalog_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).stops_catalog_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });

    // ── SCN: Triangulation — missing route_stops_seed ───────────────────

    it('should throw on missing route_stops_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).route_stops_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });

    // ── SCN: Triangulation — missing schedules_seed ─────────────────────

    it('should throw on missing schedules_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).schedules_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // computeRouteSeedActions — idempotent route seeding
  // ═══════════════════════════════════════════════════════════════════════

  describe('computeRouteSeedActions', () => {
    it('should mark all routes to insert when none exist', () => {
      const routes: SeedRoute[] = [
        { name: 'Expreso 1' },
        { name: 'Expreso 2' },
      ];
      const result = computeRouteSeedActions([], routes);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    // ── SCN: Triangulation — partial existing routes ────────────────────

    it('should skip routes that already exist by name', () => {
      const routes: SeedRoute[] = [
        { name: 'Expreso 1' },
        { name: 'Expreso 2' },
      ];
      const result = computeRouteSeedActions(['Expreso 1'], routes);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].name).toBe('Expreso 2');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].name).toBe('Expreso 1');
    });

    // ── SCN: All routes already exist ───────────────────────────────────

    it('should skip all routes when all names exist', () => {
      const routes: SeedRoute[] = [{ name: 'Expreso 1' }];
      const result = computeRouteSeedActions(['Expreso 1'], routes);

      expect(result.toInsert).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // computeStopSeedActions — idempotent stop seeding
  // ═══════════════════════════════════════════════════════════════════════

  describe('computeStopSeedActions', () => {
    const stops: SeedStop[] = [
      { name: 'Estación Central', lat: -12.0576958, lng: -77.0359527 },
      { name: 'Angamos', lat: -12.1132904, lng: -77.0259612 },
    ];

    it('should mark all stops to insert when none exist', () => {
      const result = computeStopSeedActions([], stops);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    // ── SCN: Triangulation — partial existing stops ─────────────────────

    it('should skip stops that already exist by name', () => {
      const result = computeStopSeedActions(['Estación Central'], stops);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].name).toBe('Angamos');
      expect(result.skipped).toHaveLength(1);
    });

    // ── SCN: All stops already exist ────────────────────────────────────

    it('should skip all stops when all names exist', () => {
      const result = computeStopSeedActions(
        ['Estación Central', 'Angamos'],
        stops,
      );

      expect(result.toInsert).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
    });

    // ── SCN: Real JSON data — 10 unique stops ───────────────────────────

    it('should return 10 stops from Expreso 1 seed JSON', () => {
      const parsed = parseSeedData(seedJson);
      const result = computeStopSeedActions([], parsed.stops);

      expect(result.toInsert).toHaveLength(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // computeRouteStopSeedActions — idempotent route_stop seeding
  // ═══════════════════════════════════════════════════════════════════════

  describe('computeRouteStopSeedActions', () => {
    const routeStops: SeedRouteStop[] = [
      {
        route_name: 'Expreso 1',
        direction_code: 'NORTE_SUR',
        stop_order: 1,
        stop_name: 'Estación Central',
      },
      {
        route_name: 'Expreso 1',
        direction_code: 'NORTE_SUR',
        stop_order: 2,
        stop_name: 'Estadio Nacional',
      },
      {
        route_name: 'Expreso 1',
        direction_code: 'SUR_NORTE',
        stop_order: 1,
        stop_name: 'Matellini',
      },
    ];

    it('should mark all route_stops to insert when none exist', () => {
      const result = computeRouteStopSeedActions([], routeStops);

      expect(result.toInsert).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
    });

    // ── SCN: Triangulation — skip existing by composite key ─────────────

    it('should skip route_stops that already exist by composite key', () => {
      const existing = [
        'Expreso 1|NORTE_SUR|1',
        'Expreso 1|SUR_NORTE|1',
      ];
      const result = computeRouteStopSeedActions(existing, routeStops);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].stop_name).toBe('Estadio Nacional');
      expect(result.skipped).toHaveLength(2);
    });

    // ── SCN: Real JSON data — 20 route stops ────────────────────────────

    it('should return 20 route_stops from Expreso 1 seed JSON', () => {
      const parsed = parseSeedData(seedJson);
      const result = computeRouteStopSeedActions([], parsed.routeStops);

      expect(result.toInsert).toHaveLength(20);
    });

    // ── SCN: Route stops preserve order per direction ───────────────────

    it('should preserve stop_order within each direction', () => {
      const parsed = parseSeedData(seedJson);
      const norteSurStops = parsed.routeStops
        .filter((rs) => rs.direction_code === 'NORTE_SUR')
        .sort((a, b) => a.stop_order - b.stop_order);
      const surNorteStops = parsed.routeStops
        .filter((rs) => rs.direction_code === 'SUR_NORTE')
        .sort((a, b) => a.stop_order - b.stop_order);

      expect(norteSurStops).toHaveLength(10);
      expect(surNorteStops).toHaveLength(10);

      // Verify ordering
      const norteSurOrders = norteSurStops.map((rs) => rs.stop_order);
      const surNorteOrders = surNorteStops.map((rs) => rs.stop_order);
      expect(norteSurOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(surNorteOrders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // computeScheduleSeedActions — idempotent schedule seeding
  // ═══════════════════════════════════════════════════════════════════════

  describe('computeScheduleSeedActions', () => {
    const schedules: SeedSchedule[] = [
      {
        route_name: 'Expreso 1',
        day_type_code: 'LUNES_VIERNES',
        direction_code: 'NORTE_SUR',
        start_time: '05:30',
        end_time: '20:00',
        is_operating: true,
      },
      {
        route_name: 'Expreso 1',
        day_type_code: 'LUNES_VIERNES',
        direction_code: 'SUR_NORTE',
        start_time: '05:00',
        end_time: '21:00',
        is_operating: true,
      },
      {
        route_name: 'Expreso 1',
        day_type_code: 'SABADO',
        direction_code: 'NORTE_SUR',
        start_time: '06:30',
        end_time: '21:00',
        is_operating: true,
      },
    ];

    it('should mark all schedules to insert when none exist', () => {
      const result = computeScheduleSeedActions([], schedules);

      expect(result.toInsert).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
    });

    // ── SCN: Triangulation — skip existing by composite key ─────────────

    it('should skip schedules that already exist by composite key', () => {
      const existing = ['Expreso 1|NORTE_SUR|LUNES_VIERNES'];
      const result = computeScheduleSeedActions(existing, schedules);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].direction_code).toBe('NORTE_SUR');
    });

    // ── SCN: All schedules already exist ────────────────────────────────

    it('should skip all schedules when all composite keys exist', () => {
      const existing = [
        'Expreso 1|NORTE_SUR|LUNES_VIERNES',
        'Expreso 1|SUR_NORTE|LUNES_VIERNES',
        'Expreso 1|NORTE_SUR|SABADO',
      ];
      const result = computeScheduleSeedActions(existing, schedules);

      expect(result.toInsert).toHaveLength(0);
      expect(result.skipped).toHaveLength(3);
    });

    // ── SCN: Real JSON data — 6 schedules ───────────────────────────────

    it('should return 6 schedules from Expreso 1 seed JSON', () => {
      const parsed = parseSeedData(seedJson);
      const result = computeScheduleSeedActions([], parsed.schedules);

      expect(result.toInsert).toHaveLength(6);
    });

    // ── SCN: Schedules cover 3 day types × 2 directions ────────────────

    it('should cover all 3 day types and 2 directions', () => {
      const parsed = parseSeedData(seedJson);
      const dayTypes = new Set(parsed.schedules.map((s) => s.day_type_code));
      const directions = new Set(
        parsed.schedules.map((s) => s.direction_code),
      );

      expect(dayTypes).toEqual(
        new Set(['LUNES_VIERNES', 'SABADO', 'DOMINGO']),
      );
      expect(directions).toEqual(new Set(['NORTE_SUR', 'SUR_NORTE']));
    });

    // ── SCN: All schedules are operating ────────────────────────────────

    it('should have all Expreso 1 schedules marked as operating', () => {
      const parsed = parseSeedData(seedJson);

      for (const schedule of parsed.schedules) {
        expect(schedule.is_operating).toBe(true);
      }
    });
  });
});
