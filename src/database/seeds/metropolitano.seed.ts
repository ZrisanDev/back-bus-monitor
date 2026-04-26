/**
 * Metropolitano seed — Expreso 1 dataset ingestion
 *
 * Pure functions for idempotent seeding of routes, stops, route_stops,
 * and schedules from data/metropolitano_seed_example.json.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface SeedRoute {
  name: string;
}

export interface SeedStop {
  name: string;
  lat: number;
  lng: number;
}

export interface SeedRouteStop {
  route_name: string;
  direction_code: string;
  stop_order: number;
  stop_name: string;
}

export interface SeedSchedule {
  route_name: string;
  day_type_code: string;
  direction_code: string;
  start_time: string;
  end_time: string;
  is_operating: boolean;
}

export interface ParsedSeedData {
  routes: SeedRoute[];
  stops: SeedStop[];
  routeStops: SeedRouteStop[];
  schedules: SeedSchedule[];
}

export interface SeedActionResult<T> {
  toInsert: T[];
  skipped: T[];
}

export interface RawSeedJson {
  routes_seed?: Array<{ name: string }>;
  stops_catalog_seed?: Array<{ name: string; lat: number; lng: number }>;
  route_stops_seed?: Array<{
    route_name: string;
    direction_code: string;
    stop_order: number;
    stop_name: string;
  }>;
  schedules_seed?: Array<{
    route_name: string;
    day_type_code: string;
    direction_code: string;
    start_time: string;
    end_time: string;
    is_operating: boolean;
  }>;
}

// ── Parse & Validate ──────────────────────────────────────────────────

export function parseSeedData(raw: RawSeedJson): ParsedSeedData {
  if (!raw.routes_seed || !Array.isArray(raw.routes_seed)) {
    throw new Error('Missing or invalid routes_seed in seed JSON');
  }
  if (!raw.stops_catalog_seed || !Array.isArray(raw.stops_catalog_seed)) {
    throw new Error('Missing or invalid stops_catalog_seed in seed JSON');
  }
  if (!raw.route_stops_seed || !Array.isArray(raw.route_stops_seed)) {
    throw new Error('Missing or invalid route_stops_seed in seed JSON');
  }
  if (!raw.schedules_seed || !Array.isArray(raw.schedules_seed)) {
    throw new Error('Missing or invalid schedules_seed in seed JSON');
  }

  return {
    routes: raw.routes_seed.map((r) => ({ name: r.name })),
    stops: raw.stops_catalog_seed.map((s) => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    })),
    routeStops: raw.route_stops_seed.map((rs) => ({
      route_name: rs.route_name,
      direction_code: rs.direction_code,
      stop_order: rs.stop_order,
      stop_name: rs.stop_name,
    })),
    schedules: raw.schedules_seed.map((sc) => ({
      route_name: sc.route_name,
      day_type_code: sc.day_type_code,
      direction_code: sc.direction_code,
      start_time: sc.start_time,
      end_time: sc.end_time,
      is_operating: sc.is_operating,
    })),
  };
}

// ── Route seed actions ────────────────────────────────────────────────

export function computeRouteSeedActions(
  existingNames: string[],
  desired: SeedRoute[],
): SeedActionResult<SeedRoute> {
  const toInsert = desired.filter((r) => !existingNames.includes(r.name));
  const skipped = desired.filter((r) => existingNames.includes(r.name));
  return { toInsert, skipped };
}

// ── Stop seed actions ─────────────────────────────────────────────────

export function computeStopSeedActions(
  existingNames: string[],
  desired: SeedStop[],
): SeedActionResult<SeedStop> {
  const toInsert = desired.filter((s) => !existingNames.includes(s.name));
  const skipped = desired.filter((s) => existingNames.includes(s.name));
  return { toInsert, skipped };
}

// ── RouteStop seed actions ────────────────────────────────────────────

export function computeRouteStopSeedActions(
  existingCompositeKeys: string[],
  desired: SeedRouteStop[],
): SeedActionResult<SeedRouteStop> {
  const toInsert = desired.filter(
    (rs) =>
      !existingCompositeKeys.includes(
        `${rs.route_name}|${rs.direction_code}|${rs.stop_order}`,
      ),
  );
  const skipped = desired.filter((rs) =>
    existingCompositeKeys.includes(
      `${rs.route_name}|${rs.direction_code}|${rs.stop_order}`,
    ),
  );
  return { toInsert, skipped };
}

// ── Schedule seed actions ─────────────────────────────────────────────

export function computeScheduleSeedActions(
  existingCompositeKeys: string[],
  desired: SeedSchedule[],
): SeedActionResult<SeedSchedule> {
  const toInsert = desired.filter(
    (sc) =>
      !existingCompositeKeys.includes(
        `${sc.route_name}|${sc.direction_code}|${sc.day_type_code}`,
      ),
  );
  const skipped = desired.filter((sc) =>
    existingCompositeKeys.includes(
      `${sc.route_name}|${sc.direction_code}|${sc.day_type_code}`,
    ),
  );
  return { toInsert, skipped };
}
