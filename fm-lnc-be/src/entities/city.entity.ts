import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';

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

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Nation, (nation) => nation.cities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;
}
