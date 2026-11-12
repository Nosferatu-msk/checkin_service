import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  action: string; // 'create', 'update', 'delete', 'login', 'logout'

  @Column({ type: 'varchar', length: 100 })
  @Index()
  entity_type: string; // 'user', 'object', 'zone', 'beacon', etc.

  @Column({ type: 'uuid', nullable: true })
  @Index()
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any>;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'varchar', length: 500 })
  user_agent: string;

  @CreateDateColumn()
  @Index()
  created_at: Date;
}
