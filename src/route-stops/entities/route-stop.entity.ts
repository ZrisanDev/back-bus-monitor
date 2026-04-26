import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { Direction } from '../../directions/entities/direction.entity';

@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'route_id' })
  route_id: number;

  @Column({ type: 'bigint', name: 'stop_id' })
  stop_id: number;

  @Column({ type: 'bigint', name: 'direction_id' })
  direction_id: number;

  @Column({ type: 'integer', name: 'stop_order' })
  stop_order: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(() => Stop)
  @JoinColumn({ name: 'stop_id' })
  stop: Stop;

  @ManyToOne(() => Direction)
  @JoinColumn({ name: 'direction_id' })
  direction: Direction;
}
