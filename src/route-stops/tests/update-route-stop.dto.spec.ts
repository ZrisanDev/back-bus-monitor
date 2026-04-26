import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateRouteStopDto } from '../dto/update-route-stop.dto';

describe('UpdateRouteStopDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(UpdateRouteStopDto, data);
    return validate(dto);
  }

  it('should pass validation with no fields (all optional)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with only stop_order', async () => {
    const errors = await validateDto({ stop_order: 3 });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with all fields', async () => {
    const errors = await validateDto({
      route_id: 1,
      stop_id: 2,
      direction_id: 3,
      stop_order: 5,
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when stop_order is negative', async () => {
    const errors = await validateDto({ stop_order: -1 });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
    expect(prop!.constraints).toHaveProperty('min');
  });

  it('should fail when stop_order is zero', async () => {
    const errors = await validateDto({ stop_order: 0 });
    expect(errors.length).toBeGreaterThan(0);
    const prop = errors.find((e) => e.property === 'stop_order');
    expect(prop).toBeDefined();
  });
});
