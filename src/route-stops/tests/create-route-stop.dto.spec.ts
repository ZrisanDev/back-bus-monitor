import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRouteStopDto } from '../dto/create-route-stop.dto';

describe('CreateRouteStopDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateRouteStopDto, data);
    return validate(dto);
  }

  // ── Valid DTO ─────────────────────────────────────────────────────────────

  it('should pass validation with valid route_id, stop_id, direction_id, stop_order', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      route_id: 10,
      stop_id: 20,
      direction_id: 30,
      stop_order: 5,
    });
    expect(errors).toHaveLength(0);
  });

  // ── route_id validation ───────────────────────────────────────────────────

  it('should fail when route_id is missing', async () => {
    const errors = await validateDto({
      stop_id: 2,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
  });

  it('should fail when route_id is not an integer', async () => {
    const errors = await validateDto({
      route_id: 'abc',
      stop_id: 2,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isInt');
  });

  it('should fail when route_id is less than 1', async () => {
    const errors = await validateDto({
      route_id: 0,
      stop_id: 2,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  // ── stop_id validation ────────────────────────────────────────────────────

  it('should fail when stop_id is missing', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_id');
    expect(prop).toBeDefined();
  });

  it('should fail when stop_id is less than 1', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 0,
      direction_id: 3,
      stop_order: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  // ── stop_order validation ─────────────────────────────────────────────────

  it('should fail when stop_order is missing', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
  });

  it('should fail when stop_order is zero', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
      stop_order: 0,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  it('should fail when stop_order is negative', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
      stop_order: -5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  it('should fail when stop_order is not an integer', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
      stop_order: 1.5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isInt');
  });
});
