import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Zone } from '@/modules/zones/entities/zone.entity';

@Entity('attendance_calculated')
export class AttendanceCalculated {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'uuid' })
  @Index()
  zone_id: string;

  @ManyToOne(() => Zone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'timestamptz' })
  @Index()
  enter_time: Date;

  @Column({ type: 'timestamptz' })
  @Index()
  exit_time: Date;

  @Column({ type: 'int' })
  duration_minutes: number;

  @Column({ type: 'float', nullable: true })
  avg_rssi: number;

  @CreateDateColumn()
  created_at: Date;
}
