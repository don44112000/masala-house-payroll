import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Employee } from "./employee.entity";

/**
 * Attendance status enum
 */
export enum AttendanceStatusEnum {
  ABSENT = "ABSENT",
  PRESENT = "PRESENT",
  INCOMPLETE = "INCOMPLETE",
  COMP = "COMP",
}

@Entity("daily_attendance")
@Index("idx_employee_date", ["employee_id", "date"], { unique: true })
export class DailyAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employee_id: number;

  @ManyToOne("Employee", "dailyAttendance")
  @JoinColumn({ name: "employee_id" })
  employee: Employee;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "varchar", length: 3, nullable: true })
  day_code: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: AttendanceStatusEnum.ABSENT,
  })
  status: AttendanceStatusEnum;

  @Column({ type: "varchar", length: 8, nullable: true })
  first_in: string | null;

  @Column({ type: "varchar", length: 8, nullable: true })
  last_out: string | null;

  @Column({ type: "int", default: 0 })
  total_minutes: number;

  @Column({ type: "int", default: 0 })
  punch_count: number;
}
