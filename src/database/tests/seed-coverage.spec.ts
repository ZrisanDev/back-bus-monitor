import { SEED_DAY_TYPES } from '../seeds/day-types.seed';
import { SEED_DIRECTIONS } from '../seeds/directions.seed';

describe('Expreso 1 Seed Coverage: DayTypes and Directions', () => {
  // Day types referenced by schedules_seed in metropolitano_seed_example.json
  const REQUIRED_DAY_TYPE_CODES = [
    'LUNES_VIERNES',
    'SABADO',
    'DOMINGO',
  ];

  // Directions referenced by route_stops_seed and schedules_seed
  const REQUIRED_DIRECTION_CODES = ['NORTE_SUR', 'SUR_NORTE'];

  // ═══════════════════════════════════════════════════════════════════════
  // DayTypes coverage
  // ═══════════════════════════════════════════════════════════════════════

  it('should include all day types required by Expreso 1 schedules', () => {
    const seedCodes = SEED_DAY_TYPES.map((d) => d.code);

    for (const required of REQUIRED_DAY_TYPE_CODES) {
      expect(seedCodes).toContain(required);
    }
  });

  // ── SCN: Triangulation — each required day type has proper labels ────

  it('should have proper Spanish labels for each required day type', () => {
    for (const code of REQUIRED_DAY_TYPE_CODES) {
      const dayType = SEED_DAY_TYPES.find((d) => d.code === code);
      expect(dayType).toBeDefined();
      expect(dayType!.label_es.length).toBeGreaterThan(0);
      expect(dayType!.label_en.length).toBeGreaterThan(0);
    }
  });

  // ── SCN: Seed data has unique codes ──────────────────────────────────

  it('should have unique codes for all day types', () => {
    const codes = SEED_DAY_TYPES.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Directions coverage
  // ═══════════════════════════════════════════════════════════════════════

  it('should include all directions required by Expreso 1 route_stops and schedules', () => {
    const seedCodes = SEED_DIRECTIONS.map((d) => d.code);

    for (const required of REQUIRED_DIRECTION_CODES) {
      expect(seedCodes).toContain(required);
    }
  });

  // ── SCN: Triangulation — each required direction has proper labels ───

  it('should have proper labels for each required direction', () => {
    for (const code of REQUIRED_DIRECTION_CODES) {
      const dir = SEED_DIRECTIONS.find((d) => d.code === code);
      expect(dir).toBeDefined();
      expect(dir!.label_es.length).toBeGreaterThan(0);
      expect(dir!.label_en.length).toBeGreaterThan(0);
    }
  });

  // ── SCN: Seed data has unique codes ──────────────────────────────────

  it('should have unique codes for all directions', () => {
    const codes = SEED_DIRECTIONS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
