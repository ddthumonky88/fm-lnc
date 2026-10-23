import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BigIntTransformer } from './transformer';

@Entity('stages')
export class Stage {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;
}
