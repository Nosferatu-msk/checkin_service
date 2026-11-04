import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Zone } from '../zones/entities/zone.entity';
import { Contract } from '../contracts/entities/contract.entity';

@Entity('zone_requirements')
@Unique(['zone_id', 'contract_id'])
export class ZoneRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  zone_id: string;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'uuid' })
  @Index()
  contract_id: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ type: 'int', default: 1 })
  min_employees: number;

  @Column({ type: 'int', default: 1 })
  visits_count: number;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  period_type: 'daily' | 'weekly' | 'monthly';

  @Column({ type: 'int', default: 127 })
  weekdays_mask: number;

  @Column({ type: 'boolean', default: true })
  @Index()
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
