import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBusAssignmentDto } from '../dto/create-bus-assignment.dto';

describe('CreateBusAssignmentDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateBusAssignmentDto, data);
    return validate(dto);
  }

  // ── Valid DTOs ────────────────────────────────────────────────────────────

  it('should pass validation with valid bus_id and route_id', async () => {
    const errors = await validateDto({
      bus_id: 1,
      route_id: 5,
      direction_id: 1,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      bus_id: 42,
      route_id: 99,
      direction_id: 2,
    });
    expect(errors).toHaveLength(0);
  });

  // ── bus_id validation ─────────────────────────────────────────────────────

  it('should fail when bus_id is missing', async () => {
    const errors = await validateDto({
      route_id: 5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'bus_id');
    expect(prop).toBeDefined();
  });

  it('should fail when bus_id is less than 1', async () => {
    const errors = await validateDto({
      bus_id: 0,
      route_id: 5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'bus_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  it('should fail when bus_id is negative', async () => {
    const errors = await validateDto({
      bus_id: -3,
      route_id: 5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'bus_id');
    expect(prop).toBeDefined();
  });

  it('should fail when bus_id is not an integer', async () => {
    const errors = await validateDto({
      bus_id: 1.5,
      route_id: 5,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'bus_id');
    expect(prop).toBeDefined();
  });

  // ── route_id validation ───────────────────────────────────────────────────

  it('should fail when route_id is missing', async () => {
    const errors = await validateDto({
      bus_id: 1,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
  });

  it('should fail when route_id is less than 1', async () => {
    const errors = await validateDto({
      bus_id: 1,
      route_id: 0,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  it('should fail when route_id is negative', async () => {
    const errors = await validateDto({
      bus_id: 1,
      route_id: -10,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
  });
});
