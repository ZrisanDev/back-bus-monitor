import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'route_id' })
  route_id: number;

  @Column({ type: 'bigint', name: 'direction_id' })
  direction_id: number;

  @Column({ type: 'bigint', name: 'day_type_id' })
  day_type_id: number;

  @Column({ type: 'time', name: 'start_time', nullable: true })
  start_time: string | null;

  @Column({ type: 'time', name: 'end_time', nullable: true })
  end_time: string | null;

  @Column({ type: 'boolean', name: 'is_operating', default: true })
  is_operating: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
