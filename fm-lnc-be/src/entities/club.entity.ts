import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { Competition } from './competition.entity';

@Entity('clubs')
export class Club {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name_lg: string;

  @Column({ type: 'varchar', length: 255 })
  name_sh: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name_6l: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name_3l: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  comp_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  affiliate_club_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  affiliate_club_type: string;

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

  @ManyToOne(() => Club, (club) => club.affiliates, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'affiliate_club_id' })
  affiliateClub: Club;

  @OneToMany(() => Club, (club) => club.affiliateClub)
  affiliates: Club[];
}
