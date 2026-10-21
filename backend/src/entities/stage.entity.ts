import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BigIntTransformer } from './transformer';

@Entity('stages')
export class Stage {
  @PrimaryColumn({ type: 'bigint', transformer: BigIntTransformer })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;
}
