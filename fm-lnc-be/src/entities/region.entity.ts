import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Nation } from './nation.entity';
import { City } from './city.entity';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  code: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nation_id: string;

  @ManyToOne(() => Nation, (nation) => nation.regions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nation_id' })
  nation: Nation;

  @OneToMany(() => City, (city) => city.regionEntity)
  cities: City[];
}
