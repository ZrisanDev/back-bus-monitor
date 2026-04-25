import { Controller, Get } from '@nestjs/common';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @SkipTransform()
  check() {
    return this.healthService.checkHealth();
  }
}
