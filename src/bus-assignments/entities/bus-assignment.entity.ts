import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('bus_assignments')
export class BusAssignment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'bus_id' })
  bus_id: number;

  @Column({ type: 'bigint', name: 'route_id' })
  route_id: number;

  @Column({ type: 'timestamptz', name: 'assigned_at', default: () => 'NOW()' })
  assigned_at: Date;

  @Column({ type: 'timestamptz', name: 'unassigned_at', nullable: true })
  unassigned_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
