import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Object } from '../../objects/entities/object.entity';
import type { Beacon } from '../../beacons/entities/beacon.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  object_id: string;

  @ManyToOne(() => Object, (object) => object.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'object_id' })
  object: Object;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parent_zone_id: string;

  @ManyToOne(() => Zone, (zone) => zone.children, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_zone_id' })
  parent_zone: Zone;

  @OneToMany(() => Zone, (zone) => zone.parent_zone)
  children: Zone[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  zone_type: 'floor' | 'room' | 'zone';

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'ltree' })
  @Index()
  path: string;

  @Column({ type: 'float', default: -75.0 })
  rssi_threshold: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Beacon, (beacon) => beacon.zone)
  beacons: Beacon[];
}
