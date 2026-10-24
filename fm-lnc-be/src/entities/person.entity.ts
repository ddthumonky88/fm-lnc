import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('people')
export class Person {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  first_name: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  common_name: string;

  @Column({ type: 'varchar', length: 255 })
  second_name: string;
}
