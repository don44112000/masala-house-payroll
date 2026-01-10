import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee, Punch, DailyAttendance } from "./entities";
import { V2AttendanceService } from "./v2-attendance.service";
import { V2AttendanceController } from "./v2-attendance.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Punch, DailyAttendance])],
  controllers: [V2AttendanceController],
  providers: [V2AttendanceService],
  exports: [V2AttendanceService],
})
export class V2AttendanceModule {}
