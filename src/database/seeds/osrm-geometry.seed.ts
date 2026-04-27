/**
 * OSRM Geometry Seed — fetches street-level LineString geometry
 * for each consecutive stop pair in route_stops.
 *
 * Pure functions matching the existing seed pattern.
 * Uses Node 22 native fetch for OSRM API calls.
 */

import type { GeoJsonLineString } from '../../common/types/geojson';

// ── Types ──────────────────────────────────────────────────────────────

export interface FetchConfig {
  /** Base URL for the OSRM router. Default: http://router.project-osrm.org */
  baseUrl?: string;
  /** Maximum retry attempts on failure. Default: 3 */
  maxRetries?: number;
  /** Initial delay in ms before first retry (doubles each retry). Default: 1000 */
  initialDelayMs?: number;
  /** Inject fetch function for testing. Default: globalThis.fetch */
  fetchFn?: (url: string) => Promise<Response>;
}

export interface SegmentPair {
  from: {
    stop_id: number;
    latitude: number;
    longitude: number;
    stop_order: number;
    row_id: number;
  };
  to: {
    stop_id: number;
    latitude: number;
    longitude: number;
  };
  route_id: number;
  direction_id: number;
}

export interface SeedGeometryResult {
  updated: number;
  skipped: number;
  failed: number;
}

// ── fetchOsrmGeometry ──────────────────────────────────────────────────

/**
 * Fetches a route geometry (LineString) from OSRM between two coordinates.
 * Implements exponential backoff retry: 1s → 2s → 4s, up to maxRetries.
 *
 * @returns GeoJsonLineString on success, null if all retries exhausted.
 */
export async function fetchOsrmGeometry(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  config: FetchConfig = {},
): Promise<GeoJsonLineString | null> {
  const {
    baseUrl = 'http://router.project-osrm.org',
    maxRetries = 3,
    initialDelayMs = 1000,
    fetchFn = globalThis.fetch,
  } = config;

  const url = `${baseUrl}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn(url);

      if (response.ok && response.status === 200) {
        const data = await response.json();
        const coordinates = data?.routes?.[0]?.geometry?.coordinates;

        if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
          return {
            type: 'LineString',
            coordinates,
          };
        }
      }

      // Non-success status → retry (unless last attempt)
      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    } catch {
      // Network error → retry (unless last attempt)
      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    }
  }

  return null;
}

// ── buildSegmentPairs ──────────────────────────────────────────────────

/**
 * Groups route_stops by (route_id, direction_id), orders by stop_order,
 * and returns consecutive stop pairs. The last stop in each group has
 * no outgoing pair (its segment_geometry stays null).
 */
export function buildSegmentPairs(
  routeStops: Array<{
    route_id: number;
    direction_id: number;
    stop_order: number;
    stop_id: number;
    latitude: number;
    longitude: number;
    segment_geometry: GeoJsonLineString | null;
    id: number;
  }>,
): SegmentPair[] {
  // Group by (route_id, direction_id)
  const groups = new Map<string, typeof routeStops>();

  for (const rs of routeStops) {
    const key = `${rs.route_id}|${rs.direction_id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(rs);
  }

  const pairs: SegmentPair[] = [];

  for (const group of groups.values()) {
    // Sort by stop_order ascending
    group.sort((a, b) => a.stop_order - b.stop_order);

    // Create consecutive pairs (last stop excluded)
    for (let i = 0; i < group.length - 1; i++) {
      const from = group[i];
      const to = group[i + 1];

      pairs.push({
        from: {
          stop_id: from.stop_id,
          latitude: from.latitude,
          longitude: from.longitude,
          stop_order: from.stop_order,
          row_id: from.id,
        },
        to: {
          stop_id: to.stop_id,
          latitude: to.latitude,
          longitude: to.longitude,
        },
        route_id: from.route_id,
        direction_id: from.direction_id,
      });
    }
  }

  return pairs;
}

// ── seedSegmentGeometries ──────────────────────────────────────────────

/**
 * Orchestrates the OSRM geometry seeding.
 * 1. Loads all route_stops with their stop coordinates.
 * 2. Builds segment pairs (consecutive stops per route+direction).
 * 3. Skips pairs whose origin stop already has segment_geometry.
 * 4. Fetches OSRM geometry for each remaining pair.
 * 5. Updates segment_geometry for each successful fetch.
 *
 * Idempotent: safe to re-run. Only updates rows where segment_geometry IS NULL.
 */
export async function seedSegmentGeometries(
  repo: {
    find: (options?: any) => Promise<any[]>;
    update: (criteria: any, data: any) => Promise<any>;
  },
  config: FetchConfig = {},
): Promise<SeedGeometryResult> {
  const routeStops = await repo.find({
    relations: ['stop'],
    order: { stop_order: 'ASC' },
  });

  // Flatten to the shape buildSegmentPairs expects
  const flatStops = routeStops.map((rs: any) => ({
    id: Number(rs.id),
    route_id: Number(rs.route_id),
    direction_id: Number(rs.direction_id),
    stop_order: Number(rs.stop_order),
    stop_id: Number(rs.stop_id),
    latitude: Number(rs.stop?.latitude ?? rs.latitude ?? 0),
    longitude: Number(rs.stop?.longitude ?? rs.longitude ?? 0),
    segment_geometry: rs.segment_geometry,
  }));

  const pairs = buildSegmentPairs(flatStops);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const pair of pairs) {
    // Idempotency: find the original route_stop row for this pair's origin
    const originRow = flatStops.find(
      (rs: any) =>
        rs.route_id === pair.route_id &&
        rs.direction_id === pair.direction_id &&
        rs.stop_order === pair.from.stop_order,
    );

    // Skip if already populated (REQ-SG-005)
    if (originRow && originRow.segment_geometry !== null) {
      skipped++;
      continue;
    }

    // Fetch geometry from OSRM
    const geometry = await fetchOsrmGeometry(
      pair.from.longitude,
      pair.from.latitude,
      pair.to.longitude,
      pair.to.latitude,
      config,
    );

    if (geometry) {
      await repo.update(pair.from.row_id, { segment_geometry: geometry });
      updated++;
    } else {
      failed++;
    }
  }

  return { updated, skipped, failed };
}

// ── Helpers ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
