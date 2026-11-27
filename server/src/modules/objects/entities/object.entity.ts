import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  AfterLoad,
} from 'typeorm';
import { Zone } from '../../zones/entities/zone.entity';

@Entity('objects')
export class ObjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, default: 'Россия' })
  country: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  building: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  structure: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  object_code: string;

  @Column({ type: 'text', nullable: true })
  full_address: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany('Zone', (zone: any) => zone.object)
  zones: Zone[];

  @AfterLoad()
  computeFullAddress?() {
    this.full_address = this.buildFullAddress();
  }

  buildFullAddress(): string {
    const parts: string[] = [];
    if (this.country) parts.push(this.country);
    if (this.region) parts.push(this.region);
    if (this.city) parts.push(this.city);
    if (this.street) parts.push(this.street);
    if (this.building) parts.push(`д. ${this.building}`);
    if (this.structure) parts.push(`стр. ${this.structure}`);
    return parts.join(', ');
  }
}
