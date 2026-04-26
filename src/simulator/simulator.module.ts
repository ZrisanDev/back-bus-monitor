import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { RouteStop } from '../route-stops/entities/route-stop.entity';
import { SimulatorService } from './simulator.service';
import { SimulatorController } from './simulator.controller';
import { KafkaProducerService } from './kafka-producer.service';
import { BusAssignmentsModule } from '../bus-assignments/bus-assignments.module';
import { BusesModule } from '../buses/buses.module';
import { resolveKafkaConfig } from '../config/kafka.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteStop]),
    BusAssignmentsModule,
    BusesModule,
  ],
  controllers: [SimulatorController],
  providers: [
    {
      provide: 'KAFKA_CLIENT',
      useFactory: (): ClientKafka | null => {
        const config = resolveKafkaConfig(process.env);
        if (!config.enabled) return null;
        return new ClientKafka({
          client: {
            brokers: config.brokers,
            clientId: config.clientId,
          },
          consumer: { groupId: config.groupId },
        });
      },
    },
    KafkaProducerService,
    SimulatorService,
  ],
  exports: [SimulatorService, KafkaProducerService],
})
export class SimulatorModule {}
