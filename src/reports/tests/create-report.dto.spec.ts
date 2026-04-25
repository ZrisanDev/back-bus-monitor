import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateReportDto } from '../dto/create-report.dto';

describe('CreateReportDto', () => {
  // ── Helper to validate a DTO instance ──────────────────────────────────

  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateReportDto, data);
    return validate(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Valid payloads
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: Valid DTO passes validation ───────────────────────────────────

  it('should pass validation with valid coordinates and passenger_count', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      longitude: -58.38,
      passenger_count: 22,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — boundary values ───────────────────────────────

  it('should pass validation at boundary values (0, ±90, ±180)', async () => {
    const errors = await validateDto({
      latitude: 90,
      longitude: -180,
      passenger_count: 0,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — negative boundaries ───────────────────────────

  it('should pass validation at negative boundaries', async () => {
    const errors = await validateDto({
      latitude: -90,
      longitude: 180,
      passenger_count: 0,
    });

    expect(errors).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // latitude validations
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: latitude exceeds upper range (>90) ────────────────────────────

  it('should fail when latitude > 90', async () => {
    const errors = await validateDto({
      latitude: 95,
      longitude: -58.38,
      passenger_count: 22,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
  });

  // ── SCN: latitude below lower range (<-90) ─────────────────────────────

  it('should fail when latitude < -90', async () => {
    const errors = await validateDto({
      latitude: -91,
      longitude: -58.38,
      passenger_count: 22,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
  });

  // ── SCN: latitude missing ──────────────────────────────────────────────

  it('should fail when latitude is missing', async () => {
    const errors = await validateDto({
      longitude: -58.38,
      passenger_count: 22,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // longitude validations
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: longitude exceeds upper range (>180) ──────────────────────────

  it('should fail when longitude > 180', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      longitude: 181,
      passenger_count: 22,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
  });

  // ── SCN: longitude below lower range (<-180) ───────────────────────────

  it('should fail when longitude < -180', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      longitude: -181,
      passenger_count: 22,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
  });

  // ── SCN: longitude missing ─────────────────────────────────────────────

  it('should fail when longitude is missing', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      passenger_count: 22,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // passenger_count validations
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: passenger_count negative ───────────────────────────────────────

  it('should fail when passenger_count is negative', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      longitude: -58.38,
      passenger_count: -1,
    });

    const countErrors = errors.find((e) => e.property === 'passenger_count');
    expect(countErrors).toBeDefined();
    expect(countErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: passenger_count missing ────────────────────────────────────────

  it('should fail when passenger_count is missing', async () => {
    const errors = await validateDto({
      latitude: -34.6,
      longitude: -58.38,
    });

    const countErrors = errors.find((e) => e.property === 'passenger_count');
    expect(countErrors).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // timestamp NOT in DTO
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: timestamp field is stripped by whitelist ───────────────────────

  it('should not have timestamp as a property on the DTO', () => {
    const dto = new CreateReportDto();
    expect((dto as any).timestamp).toBeUndefined();
  });
});
