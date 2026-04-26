import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateBusAssignmentDto } from '../dto/update-bus-assignment.dto';

describe('UpdateBusAssignmentDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(UpdateBusAssignmentDto, data);
    return validate(dto);
  }

  it('should pass validation with no fields (all optional)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with valid route_id', async () => {
    const errors = await validateDto({
      route_id: 5,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid route_id', async () => {
    const errors = await validateDto({
      route_id: 100,
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when route_id is less than 1', async () => {
    const errors = await validateDto({ route_id: 0 });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'route_id');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });
});
