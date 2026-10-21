import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Confederation } from './confederation.entity';
import { City } from './city.entity';
import { Competition } from './competition.entity';
import { Club } from './club.entity';
import { Stadium } from './stadium.entity';
import { Award } from './award.entity';
import { BigIntTransformer } from './transformer';

@Entity('nations')
export class Nation {
  @PrimaryColumn({ type: 'bigint', transformer: BigIntTransformer })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  long_name: string;

  @Column({ type: 'varchar', length: 255 })
  short_name: string;

  @Column({ type: 'varchar', length: 50 })
  three_letter_name: string;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  confederation_id: number;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Confederation, (confed) => confed.nations, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confederation_id' })
  confederation: Confederation;

  @OneToMany(() => City, (city) => city.nation)
  cities: City[];

  @OneToMany(() => Competition, (comp) => comp.nation)
  competitions: Competition[];

  @OneToMany(() => Club, (club) => club.nation)
  clubs: Club[];

  @OneToMany(() => Stadium, (stadium) => stadium.nation)
  stadiums: Stadium[];

  @OneToMany(() => Award, (award) => award.nation)
  awards: Award[];
}
