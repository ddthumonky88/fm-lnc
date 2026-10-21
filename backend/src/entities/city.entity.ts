import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { BigIntTransformer } from './transformer';

@Entity('cities')
export class City {
  @PrimaryColumn({ type: 'bigint', transformer: BigIntTransformer })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  country_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  categories: string;

  @Column({ type: 'text', nullable: true })
  inactive_fields: string;

  @ManyToOne(() => Nation, (nation) => nation.cities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  nation: Nation;
}
