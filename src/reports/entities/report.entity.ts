import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';

@Entity('reports')
@Index('idx_reports_bus_id', ['bus_id'])
@Index('idx_reports_timestamp', ['timestamp'])
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'bus_id' })
  bus_id: number;

  @ManyToOne(() => Bus, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bus_id', foreignKeyConstraintName: 'fk_reports_bus' })
  bus: Bus;

  @Column({ type: 'numeric', precision: 10, scale: 8, name: 'latitude' })
  latitude: number;

  @Column({ type: 'numeric', precision: 11, scale: 8, name: 'longitude' })
  longitude: number;

  @Column({ type: 'int', name: 'passenger_count', default: 0 })
  @Check('"passenger_count" >= 0')
  passenger_count: number;

  @Column({ type: 'timestamptz', name: 'timestamp', default: () => 'NOW()' })
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
