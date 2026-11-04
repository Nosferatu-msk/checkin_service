import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('fraud_logs')
export class FraudLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  user_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  fraud_type: string;

  @Column({ type: 'jsonb' })
  details: any;

  @Column({ type: 'varchar', length: 20, default: 'warning' })
  @Index()
  severity: 'info' | 'warning' | 'critical';

  @Column({ type: 'boolean', default: false })
  @Index()
  is_reviewed: boolean;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @CreateDateColumn()
  @Index()
  created_at: Date;
}
