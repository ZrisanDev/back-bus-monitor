import { Injectable, Logger, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Optional()
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka | null,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.kafkaClient) {
      await this.kafkaClient.connect();
      this.logger.log('Kafka producer client connected');
    } else {
      this.logger.log('Kafka producer not configured — running in no-op mode');
    }
  }

  async publish(topic: string, payload: any): Promise<void> {
    if (!this.kafkaClient) {
      this.logger.warn(
        `Kafka client not available — dropping message to ${topic}`,
      );
      return;
    }

    this.kafkaClient.emit(topic, payload);
    this.logger.log(`Published to ${topic}: bus_id=${payload.bus_id}`);
  }
}
