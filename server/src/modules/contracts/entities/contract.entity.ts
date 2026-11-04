import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Object } from '../objects/entities/object.entity';
import { User } from '../users/entities/user.entity';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  number: string;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToMany(() => Object)
  @JoinTable({
    name: 'contract_objects',
    joinColumn: { name: 'contract_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'object_id', referencedColumnName: 'id' },
  })
  objects: Object[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'contract_employees',
    joinColumn: { name: 'contract_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  employees: User[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'contract_curators',
    joinColumn: { name: 'contract_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  curators: User[];
}
