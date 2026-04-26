import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type KafkaHealthStatus = 'enabled' | 'disabled';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async checkHealth(): Promise<{
    status: 'ok' | 'degraded';
    database: 'connected' | 'disconnected';
    kafka: KafkaHealthStatus;
    timestamp: string;
  }> {
    const kafkaStatus = this.resolveKafkaStatus();

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        database: 'connected',
        kafka: kafkaStatus,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'degraded',
        database: 'disconnected',
        kafka: kafkaStatus,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Resolves Kafka health status from the KAFKA_ENABLED environment variable.
   * Pure, synchronous, no side effects.
   */
  private resolveKafkaStatus(): KafkaHealthStatus {
    return process.env.KAFKA_ENABLED === 'true' ? 'enabled' : 'disabled';
  }
}
