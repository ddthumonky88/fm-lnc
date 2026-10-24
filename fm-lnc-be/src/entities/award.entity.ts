import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { Competition } from './competition.entity';
import { BigIntTransformer } from './transformer';

@Entity('awards')
export class Award {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  long_name: string;

  @Column({ type: 'varchar', length: 255 })
  short_name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  comp_id: string;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Nation, (nation) => nation.awards, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @ManyToOne(() => Competition, (comp) => comp.awards, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'comp_id' })
  competition: Competition;
}
