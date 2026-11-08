import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Zone } from '../../zones/entities/zone.entity';

@Entity('beacons')
export class Beacon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  zone_id: string;

  @ManyToOne('Zone', (zone: any) => zone.beacons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'varchar', length: 36, unique: true })
  @Index()
  uuid: string;

  @Column({ type: 'int' })
  major: number;

  @Column({ type: 'int' })
  minor: number;

  @Column({ type: 'varchar', length: 17, nullable: true })
  mac_address: string;

  @Column({ type: 'int', default: -59 })
  tx_power: number;

  @Column({ type: 'int', nullable: true })
  battery_level: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  installed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
