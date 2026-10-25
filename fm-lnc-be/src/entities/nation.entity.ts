import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Confederation } from './confederation.entity';
import { City } from './city.entity';
import { Competition } from './competition.entity';
import { Club } from './club.entity';
import { Stadium } from './stadium.entity';
import { Award } from './award.entity';
import { Region } from './region.entity';

@Entity('nations')
export class Nation {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name_lg: string;

  @Column({ type: 'varchar', length: 255 })
  name_sh: string;

  @Column({ type: 'varchar', length: 50 })
  name_3l: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  confed_id: string;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Confederation, (confed) => confed.nations, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confed_id' })
  confederation: Confederation;

  @OneToMany(() => City, (city) => city.nation)
  cities: City[];

  @OneToMany(() => Region, (region) => region.nation)
  regions: Region[];

  @OneToMany(() => Competition, (comp) => comp.nation)
  competitions: Competition[];

  @OneToMany(() => Club, (club) => club.nation)
  clubs: Club[];

  @OneToMany(() => Stadium, (stadium) => stadium.nation)
  stadiums: Stadium[];

  @OneToMany(() => Award, (award) => award.nation)
  awards: Award[];
}
