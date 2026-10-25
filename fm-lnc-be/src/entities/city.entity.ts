import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { Region } from './region.entity';

@Entity('cities')
export class City {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  region: string;

  @Column({ type: 'integer', nullable: true })
  region_id: number;

  @Column({ type: 'boolean', default: false })
  is_disabled: boolean;

  @ManyToOne(() => Nation, (nation) => nation.cities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @ManyToOne(() => Region, (reg) => reg.cities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  regionEntity: Region;
}
