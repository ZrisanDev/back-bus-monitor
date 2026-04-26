import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

describe('UpdateHolidayDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(UpdateHolidayDto, data);
    return validate(dto);
  }

  it('should pass validation with no fields (all optional)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with only date', async () => {
    const errors = await validateDto({ date: '2026-12-25' });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with only description', async () => {
    const errors = await validateDto({ description: 'Navidad' });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const errors = await validateDto({
      date: '2026-12-25',
      description: 'Navidad',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when date is not a valid date string', async () => {
    const errors = await validateDto({ date: 'invalid' });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'date');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isDateString');
  });
});
