import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  biometric_id: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string | null;

  @OneToMany("Punch", "employee")
  punches: unknown[];
}
