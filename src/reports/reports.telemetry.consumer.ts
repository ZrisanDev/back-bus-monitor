import { Controller, Logger, Inject, Optional } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BusGateway } from '../websocket/bus.gateway';

@Controller()
export class ReportsTelemetryConsumer {
  private readonly logger = new Logger(ReportsTelemetryConsumer.name);

  constructor(
    @Inject('IReportsService')
    private readonly reportsService: any,
    @Optional()
    private readonly busGateway?: BusGateway,
  ) {}

  @EventPattern('bus.telemetry')
  async handleTelemetry(
    @Payload()
    payload: {
      bus_id: number;
      route_id: number;
      stop_id: number;
      latitude: number;
      longitude: number;
      passenger_count: number;
      timestamp: string;
      status: string;
      current_stop: string;
      next_stop: string | null;
    },
  ): Promise<any> {
    this.logger.log(
      `Received telemetry for bus ${payload.bus_id}, passengers: ${payload.passenger_count}`,
    );

    const report = await this.reportsService.createFromTelemetry(
      payload.bus_id,
      {
        passenger_count: payload.passenger_count,
        route_id: payload.route_id,
        stop_id: payload.stop_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: payload.status,
        current_stop: payload.current_stop,
        next_stop: payload.next_stop,
      },
    );

    // Emit WebSocket event after successful persistence
    if (this.busGateway && report) {
      const bus = report.bus;
      const occupancyPercentage =
        bus && bus.capacity > 0
          ? Math.round(
              (payload.passenger_count / bus.capacity) * 100 * 100,
            ) / 100
          : 0;

      this.busGateway.emitBusUpdated({
        bus_id: payload.bus_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        passenger_count: payload.passenger_count,
        occupancy_percentage: occupancyPercentage,
        timestamp: payload.timestamp,
        status: payload.status,
        current_stop: payload.current_stop,
        next_stop: payload.next_stop,
      });
    }

    return report;
  }
}
