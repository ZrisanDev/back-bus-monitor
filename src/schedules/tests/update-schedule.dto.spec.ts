import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';

describe('UpdateScheduleDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(UpdateScheduleDto, data);
    return validate(dto);
  }

  it('should pass validation with no fields (all optional)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with only start_time and end_time', async () => {
    const errors = await validateDto({
      start_time: '07:00',
      end_time: '21:00',
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
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

  it('should fail when is_operating is not a boolean', async () => {
    const errors = await validateDto({ is_operating: 123 });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'is_operating');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('isBoolean');
  });
});
