import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { Competition } from './competition.entity';
import { BigIntTransformer } from './transformer';

@Entity('clubs')
export class Club {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  long_name: string;

  @Column({ type: 'varchar', length: 255 })
  short_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  six_letter_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  three_letter_name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  comp_id: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @Column({ type: 'boolean', default: false })
  is_extinct: boolean;

  @ManyToOne(() => Nation, (nation) => nation.clubs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @ManyToOne(() => Competition, (comp) => comp.clubs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'comp_id' })
  competition: Competition;
}
