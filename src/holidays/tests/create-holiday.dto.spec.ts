import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateHolidayDto } from '../dto/create-holiday.dto';

describe('CreateHolidayDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateHolidayDto, data);
    return validate(dto);
  }

  // ── Valid DTO ─────────────────────────────────────────────────────────────

  it('should pass validation with valid date and description', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
      description: 'Navidad',
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      date: '2026-07-09',
      description: 'Día de la Independencia',
    });
    expect(errors).toHaveLength(0);
  });

  // ── date validation ───────────────────────────────────────────────────────

  it('should fail when date is missing', async () => {
    const errors = await validateDto({
      description: 'Navidad',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'date');
    expect(prop).toBeDefined();
  });

  it('should fail when date is not a string', async () => {
    const errors = await validateDto({
      date: 123,
      description: 'Navidad',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'date');
    expect(prop).toBeDefined();
  });

  it('should fail when date is empty', async () => {
    const errors = await validateDto({
      date: '',
      description: 'Navidad',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'date');
    expect(prop).toBeDefined();
  });

  it('should fail when date is not a valid date string', async () => {
    const errors = await validateDto({
      date: 'not-a-date',
      description: 'Navidad',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'date');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isDateString');
  });

  // ── description validation ────────────────────────────────────────────────

  it('should fail when description is missing', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'description');
    expect(prop).toBeDefined();
  });

  it('should fail when description is not a string', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
      description: 123,
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'description');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isString');
  });

  it('should fail when description is empty', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
      description: '',
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'description');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when description exceeds 200 characters', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
      description: 'A'.repeat(201),
    });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'description');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('maxLength');
  });
});
