import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('attendance_raw')
export class AttendanceRaw {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  beacon_uuid: string;

  @Column({ type: 'varchar', length: 17, nullable: true })
  mac_address: string;

  @Column({ type: 'timestamptz' })
  scan_timestamp_start: Date;

  @Column({ type: 'timestamptz' })
  scan_timestamp_end: Date;

  @Column({ type: 'float' })
  median_rssi: number;

  @Column({ type: 'float', nullable: true })
  min_rssi: number;

  @Column({ type: 'float', nullable: true })
  max_rssi: number;

  @Column({ type: 'int', nullable: true })
  samples_count: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  device_fingerprint_hash: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  request_id: string;

  @CreateDateColumn()
  @Index()
  synced_at: Date;
}
