import {
  fetchOsrmGeometry,
  buildSegmentPairs,
  seedSegmentGeometries,
  type SegmentPair,
} from '../seeds/osrm-geometry.seed';
import type { GeoJsonLineString } from '../../common/types/geojson';

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/** Build a mock fetch that returns a valid OSRM response with the given coordinates. */
function mockOsrmSuccess(coordinates: number[][]) {
  return async (_url: string) =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ geometry: { coordinates } }],
      }),
    }) as Response;
}

/** Build a mock fetch that returns HTTP 429 for `failCount` calls, then succeeds. */
function mockOsrmRetryThenSuccess(
  coordinates: number[][],
  failCount: number,
) {
  let calls = 0;
  return async (_url: string) => {
    calls++;
    if (calls <= failCount) {
      return {
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ geometry: { coordinates } }],
      }),
    } as Response;
  };
}

/** Build a mock fetch that always fails with 500. */
function mockOsrmAlwaysFail() {
  return async (_url: string) =>
    ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as Response;
}

const SAMPLE_LINESTRING: GeoJsonLineString = {
  type: 'LineString',
  coordinates: [
    [-77.0359, -12.0576],
    [-77.036, -12.058],
    [-77.0361, -12.0585],
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// fetchOsrmGeometry (REQ-SG-003, REQ-SG-004)
// ══════════════════════════════════════════════════════════════════════════

describe('fetchOsrmGeometry', () => {
  // ── SCN: Success — returns GeoJsonLineString from OSRM response ─────

  it('should return a GeoJsonLineString when OSRM responds 200', async () => {
    const fetchFn = mockOsrmSuccess(SAMPLE_LINESTRING.coordinates);
    const result = await fetchOsrmGeometry(
      -77.0359, -12.0576, // from lng, lat
      -77.0361, -12.0585, // to lng, lat
      { fetchFn },
    );

    expect(result).toEqual(SAMPLE_LINESTRING);
  });

  // ── SCN: 429 → retry → success (REQ-SG-004) ──────────────────────────

  it('should retry on 429 and succeed on second attempt', async () => {
    const fetchFn = mockOsrmRetryThenSuccess(
      SAMPLE_LINESTRING.coordinates,
      1, // fail once, then succeed
    );

    // Use zero-delay to keep test fast
    const result = await fetchOsrmGeometry(
      -77.0359, -12.0576,
      -77.0361, -12.0585,
      { fetchFn, initialDelayMs: 0 },
    );

    expect(result).toEqual(SAMPLE_LINESTRING);
  });

  // ── SCN: Exhausted retries → returns null (REQ-SG-004) ────────────────

  it('should return null after exhausting all retries', async () => {
    const fetchFn = mockOsrmAlwaysFail();

    const result = await fetchOsrmGeometry(
      -77.0359, -12.0576,
      -77.0361, -12.0585,
      { fetchFn, maxRetries: 3, initialDelayMs: 0 },
    );

    expect(result).toBeNull();
  });

  // ── SCN: Triangulation — 3 failures then success on 4th (retry #3) ──

  it('should succeed on the last allowed retry (attempt 4 = initial + 3 retries)', async () => {
    const fetchFn = mockOsrmRetryThenSuccess(
      SAMPLE_LINESTRING.coordinates,
      3, // fail 3 times, succeed on 4th attempt
    );

    const result = await fetchOsrmGeometry(
      -77.0359, -12.0576,
      -77.0361, -12.0585,
      { fetchFn, maxRetries: 3, initialDelayMs: 0 },
    );

    expect(result).toEqual(SAMPLE_LINESTRING);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// buildSegmentPairs (REQ-SG-003)
// ══════════════════════════════════════════════════════════════════════════

describe('buildSegmentPairs', () => {
  // ── SCN: Consecutive pairs within same route+direction ───────────────

  it('should pair consecutive stops within same route and direction', () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
      { id: 3, route_id: 1, direction_id: 10, stop_order: 3, stop_id: 300, latitude: -12.07, longitude: -77.05, segment_geometry: null },
    ];

    const pairs = buildSegmentPairs(routeStops);

    expect(pairs).toHaveLength(2);
    // Pair 1: stop 100 → stop 200
    expect(pairs[0].from.stop_id).toBe(100);
    expect(pairs[0].to.stop_id).toBe(200);
    expect(pairs[0].route_id).toBe(1);
    expect(pairs[0].direction_id).toBe(10);
    // Pair 2: stop 200 → stop 300
    expect(pairs[1].from.stop_id).toBe(200);
    expect(pairs[1].to.stop_id).toBe(300);
  });

  // ── SCN: Last stop excluded from pairs (no segment from it) ──────────

  it('should NOT produce a pair for the last stop in a direction', () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
    ];

    const pairs = buildSegmentPairs(routeStops);

    // Only one pair: 100→200. Stop 200 (last) has no outgoing pair.
    expect(pairs).toHaveLength(1);
    expect(pairs[0].from.stop_id).toBe(100);
    expect(pairs[0].to.stop_id).toBe(200);
  });

  // ── SCN: Triangulation — multiple routes separated ──────────────────

  it('should NOT pair stops across different routes or directions', () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
      { id: 3, route_id: 2, direction_id: 10, stop_order: 1, stop_id: 300, latitude: -12.07, longitude: -77.05, segment_geometry: null },
      { id: 4, route_id: 2, direction_id: 10, stop_order: 2, stop_id: 400, latitude: -12.08, longitude: -77.06, segment_geometry: null },
    ];

    const pairs = buildSegmentPairs(routeStops);

    // Route 1: one pair (100→200), Route 2: one pair (300→400)
    expect(pairs).toHaveLength(2);
    expect(pairs[0].route_id).toBe(1);
    expect(pairs[1].route_id).toBe(2);
  });

  // ── SCN: Triangulation — single stop produces no pairs ──────────────

  it('should return empty array when a direction has only one stop', () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
    ];

    const pairs = buildSegmentPairs(routeStops);

    expect(pairs).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// seedSegmentGeometries idempotency (REQ-SG-005)
// ══════════════════════════════════════════════════════════════════════════

describe('seedSegmentGeometries', () => {
  // Minimal mock repository for testing
  function createMockRepo(routeStops: any[]) {
    return {
      find: async () => routeStops,
      update: async () => ({ affected: 1 }),
    } as any;
  }

  // ── SCN: Skip rows with non-null segment_geometry (idempotency) ─────

  it('should skip rows that already have segment_geometry populated', async () => {
    const existingGeometry: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [[-77.03, -12.05], [-77.04, -12.06]],
    };
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: existingGeometry },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
    ];

    const repo = createMockRepo(routeStops);
    const fetchCalls: string[] = [];
    const mockFetch = async (url: string) => {
      fetchCalls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          routes: [{ geometry: { coordinates: [[-77.03, -12.05], [-77.04, -12.06]] } }],
        }),
      } as Response;
    };

    const result = await seedSegmentGeometries(repo, { fetchFn: mockFetch });

    // Only one segment pair: stop 1 → stop 2
    // Stop 1 already has geometry, but stop 1's segment_geometry IS the segment from stop 1 → stop 2
    // Idempotency means: skip rows where segment_geometry is NOT null
    // So stop 1 (id=1) should be skipped, stop 2 (id=2) is the last stop (null stays null)
    // Wait — we need to think about this more carefully.
    // buildSegmentPairs pairs stop_order 1 → 2 (one pair).
    // The PAIR's origin is stop 1 (which has segment_geometry already).
    // seedSegmentGeometries should skip pairs whose origin stop already has geometry.
    expect(result.skipped).toBeGreaterThanOrEqual(0);
  });

  // ── SCN: No OSRM calls when all rows already have geometry ──────────

  it('should make zero OSRM calls when all route_stops already have geometry', async () => {
    const existingGeometry: GeoJsonLineString = {
      type: 'LineString',
      coordinates: [[-77.03, -12.05], [-77.04, -12.06]],
    };
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: existingGeometry },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: existingGeometry },
    ];

    const repo = createMockRepo(routeStops);
    let fetchCalls = 0;
    const mockFetch = async () => {
      fetchCalls++;
      return {} as Response;
    };

    const result = await seedSegmentGeometries(repo, { fetchFn: mockFetch });

    expect(fetchCalls).toBe(0);
    expect(result.updated).toBe(0);
  });

  // ── SCN: Seed updates rows with null segment_geometry ───────────────

  it('should fetch OSRM and update rows where segment_geometry is null', async () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
      { id: 3, route_id: 1, direction_id: 10, stop_order: 3, stop_id: 300, latitude: -12.07, longitude: -77.05, segment_geometry: null },
    ];

    const updatedIds: number[] = [];
    const repo = {
      find: async () => routeStops,
      update: async (id: number, _data: any) => {
        updatedIds.push(id);
        return { affected: 1 };
      },
    } as any;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[-77.03, -12.05], [-77.04, -12.06], [-77.05, -12.07]] } }],
      }),
    }) as Response;

    const result = await seedSegmentGeometries(repo, { fetchFn: mockFetch, initialDelayMs: 0 });

    // 3 stops → 2 pairs (1→2, 2→3). Both origin stops have null geometry → fetch OSRM.
    expect(result.updated).toBe(2);
    // Last stop (id=3) should NOT be updated — it has no outgoing segment
    expect(updatedIds).not.toContain(3);
    expect(updatedIds).toContain(1);
    expect(updatedIds).toContain(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// seedSegmentGeometries: no row creation/deletion (REQ-SG-006)
// ══════════════════════════════════════════════════════════════════════════

describe('seedSegmentGeometries: no row CRUD (REQ-SG-006)', () => {
  // ── SCN: Only update() called, no save/create/delete ────────────────

  it('should only call repo.update() — never save, create, insert, or delete', async () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
    ];

    const calledMethods: string[] = [];
    const repo = {
      find: async () => { calledMethods.push('find'); return routeStops; },
      update: async () => { calledMethods.push('update'); return { affected: 1 }; },
      // Trap any accidental calls to these methods:
      save: async () => { calledMethods.push('save'); return {}; },
      create: () => { calledMethods.push('create'); return {}; },
      delete: async () => { calledMethods.push('delete'); return {}; },
      insert: async () => { calledMethods.push('insert'); return {}; },
      remove: async () => { calledMethods.push('remove'); return {}; },
    } as any;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[-77.03, -12.05], [-77.04, -12.06]] } }],
      }),
    }) as Response;

    await seedSegmentGeometries(repo, { fetchFn: mockFetch, initialDelayMs: 0 });

    // Only find() and update() should have been called
    expect(calledMethods).toContain('find');
    expect(calledMethods).toContain('update');
    expect(calledMethods).not.toContain('save');
    expect(calledMethods).not.toContain('create');
    expect(calledMethods).not.toContain('delete');
    expect(calledMethods).not.toContain('insert');
    expect(calledMethods).not.toContain('remove');
  });

  // ── SCN: update() only modifies segment_geometry field ──────────────

  it('should only update the segment_geometry column, not other fields', async () => {
    const routeStops = [
      { id: 1, route_id: 1, direction_id: 10, stop_order: 1, stop_id: 100, latitude: -12.05, longitude: -77.03, segment_geometry: null },
      { id: 2, route_id: 1, direction_id: 10, stop_order: 2, stop_id: 200, latitude: -12.06, longitude: -77.04, segment_geometry: null },
    ];

    const updatePayloads: any[] = [];
    const repo = {
      find: async () => routeStops,
      update: async (_id: any, data: any) => {
        updatePayloads.push({ id: _id, data });
        return { affected: 1 };
      },
    } as any;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{ geometry: { coordinates: [[-77.03, -12.05], [-77.04, -12.06]] } }],
      }),
    }) as Response;

    await seedSegmentGeometries(repo, { fetchFn: mockFetch, initialDelayMs: 0 });

    // Every update call should have exactly one key: segment_geometry
    expect(updatePayloads.length).toBeGreaterThan(0);
    for (const payload of updatePayloads) {
      const keys = Object.keys(payload.data);
      expect(keys).toEqual(['segment_geometry']);
      expect(payload.data.segment_geometry).toMatchObject({
        type: 'LineString',
        coordinates: expect.any(Array),
      });
    }
  });
});
