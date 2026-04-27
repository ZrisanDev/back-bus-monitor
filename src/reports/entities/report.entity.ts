import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'bus_id' })
  bus_id: number;

  @Column({ type: 'int', name: 'passenger_count', default: 0 })
  passenger_count: number;

  @Column({ type: 'bigint', name: 'route_id', nullable: true })
  route_id: number | null;

  @Column({ type: 'bigint', name: 'stop_id', nullable: true })
  stop_id: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'current_stop' })
  current_stop: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'next_stop' })
  next_stop: string | null;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Bus, (bus) => bus.reports)
  @JoinColumn({ name: 'bus_id' })
  bus: Bus;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route: Route | null;

  @ManyToOne(() => Stop)
  @JoinColumn({ name: 'stop_id' })
  stop: Stop | null;
}
