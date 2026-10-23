import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Nation } from './nation.entity';
import { Confederation } from './confederation.entity';
import { Club } from './club.entity';
import { Award } from './award.entity';
import { BigIntTransformer } from './transformer';

@Entity('competitions')
export class Competition {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  long_name: string;

  @Column({ type: 'varchar', length: 255 })
  short_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  three_letter_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fg_color: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bg_color: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  confed_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  categories: string;

  @Column({ type: 'boolean', default: false })
  is_international: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parent_id: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Confederation, (confed) => confed.competitions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confed_id' })
  confederation: Confederation;

  @ManyToOne(() => Nation, (nation) => nation.competitions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @ManyToOne(() => Competition, (comp) => comp.children, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Competition;

  @OneToMany(() => Competition, (comp) => comp.parent)
  children: Competition[];

  @OneToMany(() => Club, (club) => club.competition)
  clubs: Club[];

  @OneToMany(() => Award, (award) => award.competition)
  awards: Award[];
}
