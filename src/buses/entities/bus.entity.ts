import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  // OneToMany — Se restaura en Fase 5 (ReportsModule)
  Check,
} from 'typeorm';
// import { Report } from '../../reports/entities/report.entity'; — Fase 5

@Entity('buses', { name: 'pk_buses' })
export class Bus {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'code' })
  code: string;

  @Column({ type: 'int', name: 'capacity' })
  @Check('"capacity" > 0')
  capacity: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;

  // @OneToMany(() => Report, (report) => report.bus) — Se restaura en Fase 5
  // reports: Report[];
}
