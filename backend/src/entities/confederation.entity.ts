import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Nation } from './nation.entity';
import { Competition } from './competition.entity';
import { BigIntTransformer } from './transformer';

@Entity('confederations')
export class Confederation {
  @PrimaryColumn({ type: 'bigint', transformer: BigIntTransformer })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => Nation, (nation) => nation.confederation)
  nations: Nation[];

  @OneToMany(() => Competition, (comp) => comp.confederation)
  competitions: Competition[];
}
