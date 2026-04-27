import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface BusUpdatedPayload {
  bus_id: number;
  latitude: number;
  longitude: number;
  passenger_count: number;
  occupancy_percentage: number;
  timestamp: string;
  status: string;
  current_stop: string;
  next_stop: string | null;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class BusGateway {
  private readonly logger = new Logger(BusGateway.name);

  @WebSocketServer()
  server: Server;

  emitBusUpdated(payload: BusUpdatedPayload): void {
    this.server.emit('bus:updated', payload);
    this.logger.log(
      `Emitted bus:updated for bus ${payload.bus_id}, occupancy: ${payload.occupancy_percentage}%`,
    );
  }
}
