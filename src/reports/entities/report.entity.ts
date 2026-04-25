import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'bus_id' })
  bus_id: number;

  @Column({ type: 'numeric', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'numeric', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'int', name: 'passenger_count', default: 0 })
  passenger_count: number;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Bus, (bus) => bus.reports)
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;
}
