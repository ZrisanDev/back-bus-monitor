import {
  parseSeedData,
  computeRouteSeedActions,
  computeStopSeedActions,
  computeRouteStopSeedActions,
  type SeedRoute,
  type SeedStop,
  type SeedRouteStop,
} from '../seeds/metropolitano.seed';

const seedJson = require('../../../data/metropolitano_seed_example.json');

describe('Metropolitano Seed: Routes, Stops, RouteStops', () => {
  describe('parseSeedData', () => {
    it('should parse valid JSON into typed seed data', () => {
      const result = parseSeedData(seedJson);

      expect(result.routes).toHaveLength(1);
      expect(result.stops).toHaveLength(10);
      expect(result.routeStops).toHaveLength(10);
    });

    it('should throw on missing routes_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).routes_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });

    it('should throw on missing stops_catalog_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).stops_catalog_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });

    it('should throw on missing route_stops_seed', () => {
      const badData = { ...seedJson };
      delete (badData as any).route_stops_seed;

      expect(() => parseSeedData(badData)).toThrow();
    });
  });

  describe('computeRouteSeedActions', () => {
    it('should mark all routes to insert when none exist', () => {
      const routes: SeedRoute[] = [{ name: 'Expreso 1' }, { name: 'Expreso 2' }];
      const result = computeRouteSeedActions([], routes);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip routes that already exist by name', () => {
      const routes: SeedRoute[] = [{ name: 'Expreso 1' }, { name: 'Expreso 2' }];
      const result = computeRouteSeedActions(['Expreso 1'], routes);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].name).toBe('Expreso 2');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].name).toBe('Expreso 1');
    });

    it('should skip all routes when all already exist', () => {
      const routes: SeedRoute[] = [{ name: 'Expreso 1' }, { name: 'Expreso 2' }];
      const result = computeRouteSeedActions(['Expreso 1', 'Expreso 2'], routes);

      expect(result.toInsert).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
    });
  });

  describe('computeStopSeedActions', () => {
    it('should mark all stops to insert when none exist', () => {
      const stops: SeedStop[] = [
        { name: 'Central', lat: -12.0, lng: -77.0 },
        { name: 'Matellini', lat: -12.1, lng: -77.0 },
      ];
      const result = computeStopSeedActions([], stops);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip stops that already exist by name', () => {
      const stops: SeedStop[] = [
        { name: 'Central', lat: -12.0, lng: -77.0 },
        { name: 'Matellini', lat: -12.1, lng: -77.0 },
      ];
      const result = computeStopSeedActions(['Central'], stops);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].name).toBe('Matellini');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].name).toBe('Central');
    });

    it('should skip all stops when all already exist', () => {
      const stops: SeedStop[] = [
        { name: 'Central', lat: -12.0, lng: -77.0 },
        { name: 'Matellini', lat: -12.1, lng: -77.0 },
      ];
      const result = computeStopSeedActions(['Central', 'Matellini'], stops);

      expect(result.toInsert).toHaveLength(0);
      expect(result.skipped).toHaveLength(2);
    });
  });

  describe('computeRouteStopSeedActions', () => {
    it('should mark all route stops to insert when none exist', () => {
      const routeStops: SeedRouteStop[] = [
        { route_name: 'Expreso 1', stop_order: 1, stop_name: 'Central' },
        { route_name: 'Expreso 1', stop_order: 2, stop_name: 'Matellini' },
      ];
      const result = computeRouteStopSeedActions([], routeStops);

      expect(result.toInsert).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    it('should skip route stops by composite key route_name + stop_order', () => {
      const routeStops: SeedRouteStop[] = [
        { route_name: 'Expreso 1', stop_order: 1, stop_name: 'Central' },
        { route_name: 'Expreso 1', stop_order: 2, stop_name: 'Matellini' },
      ];
      const result = computeRouteStopSeedActions(['Expreso 1|1'], routeStops);

      expect(result.toInsert).toHaveLength(1);
      expect(result.toInsert[0].stop_name).toBe('Matellini');
      expect(result.skipped).toHaveLength(1);
    });

    it('should return 10 route stops from Expreso 1 seed JSON', () => {
      const parsed = parseSeedData(seedJson);

      expect(parsed.routeStops).toHaveLength(10);
      expect(parsed.routeStops[0].route_name).toBe('Expreso 1');
      expect(parsed.routeStops[0].stop_order).toBe(1);
      expect(parsed.routeStops[9].stop_order).toBe(10);
    });
  });

  describe('Real seed JSON integration', () => {
    it('should parse all 10 unique stops from Expreso 1', () => {
      const parsed = parseSeedData(seedJson);

      expect(parsed.stops).toHaveLength(10);
      const stopNames = parsed.stops.map((s) => s.name);
      expect(stopNames).toContain('Estación Central');
      expect(stopNames).toContain('Matellini');
    });

    it('should parse route stops in sequential order 1-10', () => {
      const parsed = parseSeedData(seedJson);

      const orders = parsed.routeStops.map((rs) => rs.stop_order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});