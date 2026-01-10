import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Employee } from "./employee.entity";

@Entity("punches")
@Index("idx_employee_punch_time", ["employee_id", "punch_time"], {
  unique: true,
})
export class Punch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employee_id: number;

  @ManyToOne("Employee", "punches")
  @JoinColumn({ name: "employee_id" })
  employee: Employee;

  @Column({ type: "timestamp" })
  punch_time: Date;

  @Column({ type: "varchar", length: 20, default: "Fingerprint" })
  verification_type: string;

  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  punch_type: string | null;

  @Column({ type: "boolean", default: false })
  is_paired: boolean;

  @Column({ type: "boolean", default: false })
  is_edited: boolean;
}
