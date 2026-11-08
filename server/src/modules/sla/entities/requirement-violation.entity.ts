import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ZoneRequirement } from '@/modules/sla/entities/zone-requirement.entity';

@Entity('requirement_violations')
export class RequirementViolation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index()
  requirement_id: string;

  @ManyToOne(() => ZoneRequirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirement_id' })
  requirement: ZoneRequirement;

  @Column({ type: 'date' })
  @Index()
  period_date: Date;

  @Column({ type: 'int' })
  required_count: number;

  @Column({ type: 'int' })
  actual_count: number;

  @Column({ type: 'int' })
  deficit: number;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @CreateDateColumn()
  created_at: Date;
}
