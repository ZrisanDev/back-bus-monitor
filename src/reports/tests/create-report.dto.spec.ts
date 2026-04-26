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

  it('should pass validation with valid passenger_count, latitude, longitude', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: -12.1294423,
      longitude: -77.0228339,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — zero passengers ─────────────────────────────

  it('should pass validation with zero passengers', async () => {
    const errors = await validateDto({
      passenger_count: 0,
      latitude: -12.1294423,
      longitude: -77.0228339,
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
      latitude: -12.1294423,
      longitude: -77.0228339,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: route_id and stop_id are optional (nullable stage) ────────────

  it('should pass validation without route_id and stop_id (nullable stage)', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: -12.1294423,
      longitude: -77.0228339,
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
      latitude: -12.1294423,
      longitude: -77.0228339,
    });

    expect(errors).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-013: latitude and longitude required fields
  // ═══════════════════════════════════════════════════════════════════════

  // ── SCN: Valid DTO with latitude and longitude passes ──────────────────

  it('should pass validation with passenger_count, route_id, stop_id, latitude, longitude', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
      latitude: -12.1294423,
      longitude: -77.0228339,
    });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: latitude is required ──────────────────────────────────────────

  it('should fail when latitude is missing', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
      longitude: -77.0228339,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
  });

  // ── SCN: longitude is required ─────────────────────────────────────────

  it('should fail when longitude is missing', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
      latitude: -12.1294423,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
  });

  // ── SCN: latitude must be a number ─────────────────────────────────────

  it('should fail when latitude is not a number', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
      latitude: 'not-a-number',
      longitude: -77.0228339,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('isNumber');
  });

  // ── SCN: longitude must be a number ────────────────────────────────────

  it('should fail when longitude is not a number', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      route_id: 10,
      stop_id: 20,
      latitude: -12.1294423,
      longitude: 'bad',
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('isNumber');
  });

  // ── SCN: latitude range validation — value below -90 ───────────────────

  it('should fail when latitude is below -90', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: -91,
      longitude: -77.0228339,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: latitude range validation — value above 90 ────────────────────

  it('should fail when latitude is above 90', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: 91,
      longitude: -77.0228339,
    });

    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('max');
  });

  // ── SCN: longitude range validation — value below -180 ─────────────────

  it('should fail when longitude is below -180', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: -12.1294423,
      longitude: -181,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: longitude range validation — value above 180 ──────────────────

  it('should fail when longitude is above 180', async () => {
    const errors = await validateDto({
      passenger_count: 22,
      latitude: -12.1294423,
      longitude: 181,
    });

    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('max');
  });

  // ── SCN: Triangulation — valid boundary values pass ────────────────────

  it('should pass with latitude at boundary -90 and longitude at boundary -180', async () => {
    const errors = await validateDto({
      passenger_count: 10,
      latitude: -90,
      longitude: -180,
    });

    expect(errors).toHaveLength(0);
  });

  it('should pass with latitude at boundary 90 and longitude at boundary 180', async () => {
    const errors = await validateDto({
      passenger_count: 10,
      latitude: 90,
      longitude: 180,
    });

    expect(errors).toHaveLength(0);
  });
});
