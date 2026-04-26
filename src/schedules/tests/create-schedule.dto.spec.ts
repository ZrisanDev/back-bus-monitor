import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateScheduleDto } from '../dto/create-schedule.dto';

describe('CreateScheduleDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateScheduleDto, data);
    return validate(dto);
  }

  // ── Valid DTOs ────────────────────────────────────────────────────────────

  it('should pass validation with valid operating schedule', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
      is_operating: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      route_id: 10,
      direction_id: 20,
      day_type_id: 30,
      start_time: '08:30',
      end_time: '18:45',
      is_operating: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with is_operating false and no times', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      is_operating: false,
    });
    expect(errors).toHaveLength(0);
  });

  it('should default is_operating to true when not provided', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors).toHaveLength(0);
  });

  // ── route_id validation ───────────────────────────────────────────────────

  it('should fail when route_id is missing', async () => {
    const errors = await validateDto({
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
  });

  it('should fail when route_id is less than 1', async () => {
    const errors = await validateDto({
      route_id: 0,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  // ── direction_id validation ───────────────────────────────────────────────

  it('should fail when direction_id is missing', async () => {
    const errors = await validateDto({
      route_id: 1,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'direction_id');
    expect(prop).toBeDefined();
  });

  it('should fail when direction_id is less than 1', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: -1,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'direction_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  // ── day_type_id validation ────────────────────────────────────────────────

  it('should fail when day_type_id is missing', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'day_type_id');
    expect(prop).toBeDefined();
  });

  it('should fail when day_type_id is less than 1', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 0,
      start_time: '06:00',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'day_type_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  // ── start_time validation ─────────────────────────────────────────────────

  it('should fail when start_time is not a valid time string', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      start_time: 'not-a-time',
      end_time: '22:00',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'start_time');
    expect(prop).toBeDefined();
  });

  // ── end_time validation ───────────────────────────────────────────────────

  it('should fail when end_time is not a valid time string', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: 'invalid',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'end_time');
    expect(prop).toBeDefined();
  });

  // ── is_operating validation ───────────────────────────────────────────────

  it('should fail when is_operating is not a boolean', async () => {
    const errors = await validateDto({
      route_id: 1,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
      is_operating: 'yes',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'is_operating');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isBoolean');
  });
});
