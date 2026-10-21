import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BigIntTransformer } from './transformer';

@Entity('people')
export class Person {
  @PrimaryColumn({ type: 'bigint', transformer: BigIntTransformer })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  first_name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  common_name: string;

  @Column({ type: 'varchar', length: 255 })
  second_name: string;
}
