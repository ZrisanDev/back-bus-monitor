import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Simulation')
@Controller('simulation')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the bus simulation' })
  async start() {
    return this.simulatorService.start();
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop the bus simulation' })
  async stop() {
    return this.simulatorService.stop();
  }
}
