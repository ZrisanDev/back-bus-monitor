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

  it('should pass validation with valid passenger_count', async () => {
    const errors = await validateDto({
      passenger_count: 22,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — zero passengers ─────────────────────────────

  it('should pass validation with zero passengers', async () => {
    const errors = await validateDto({
      passenger_count: 0,
    });

    expect(errors).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // passenger_count validations
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: passenger_count negative ───────────────────────────────────────

  it('should fail when passenger_count is negative', async () => {
    const errors = await validateDto({
      passenger_count: -1,
    });

    const countErrors = errors.find((e) => e.property === 'passenger_count');
    expect(countErrors).toBeDefined();
    expect(countErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: passenger_count missing ────────────────────────────────────────

  it('should fail when passenger_count is missing', async () => {
    const errors = await validateDto({});

    const countErrors = errors.find((e) => e.property === 'passenger_count');
    expect(countErrors).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // timestamp NOT in DTO
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: timestamp field is stripped by whitelist ───────────────────────

  it('should not have timestamp as a property on the DTO', () => {
    const dto = new CreateReportDto();
    expect((dto as any).timestamp).toBeUndefined();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-010: route_id and stop_id (optional — nullable stage)
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: Valid DTO with route_id and stop_id passes ────────────────────

  it('should pass validation with passenger_count, route_id and stop_id', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: route_id and stop_id are optional (nullable stage) ────────────

  it('should pass validation without route_id and stop_id (nullable stage)', async () => {
    const errors = await validateDto({
      passenger_count: 22,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: route_id must be an integer ────────────────────────────────────

  it('should fail when route_id is not an integer', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 'abc',
    });

    const routeIdErrors = errors.find((e) => e.property === 'route_id');
    expect(routeIdErrors).toBeDefined();
    expect(routeIdErrors!.constraints).toHaveProperty('isInt');
  });

  // ── SCN: stop_id must be an integer ─────────────────────────────────────

  it('should fail when stop_id is not an integer', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      stop_id: 3.14,
    });

    const stopIdErrors = errors.find((e) => e.property === 'stop_id');
    expect(stopIdErrors).toBeDefined();
    expect(stopIdErrors!.constraints).toHaveProperty('isInt');
  });

  // ── SCN: route_id must be at least 1 ────────────────────────────────────

  it('should fail when route_id is zero', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 0,
    });

    const routeIdErrors = errors.find((e) => e.property === 'route_id');
    expect(routeIdErrors).toBeDefined();
    expect(routeIdErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: stop_id must be at least 1 ─────────────────────────────────────

  it('should fail when stop_id is negative', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      stop_id: -5,
    });

    const stopIdErrors = errors.find((e) => e.property === 'stop_id');
    expect(stopIdErrors).toBeDefined();
    expect(stopIdErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: Triangulation — both route_id and stop_id with valid values ────

  it('should pass with valid large route_id and stop_id', async () => {
    const errors = await validateDto({
      passenger_count: 50,
      route_id: 9999,
      stop_id: 8888,
    });

    expect(errors).toHaveLength(0);
  });
});
