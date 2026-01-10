import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceModule } from "./attendance/attendance.module";
import { V2AttendanceModule } from "./v2/v2-attendance.module";
import { Employee, Punch, DailyAttendance } from "./v2/entities";

@Module({
  imports: [
    // PostgreSQL database for v2 APIs
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME || "pgadmin",
      password: process.env.DB_PASSWORD || "pgadmin",
      database: process.env.DB_DATABASE || "attendence_db",
      entities: [Employee, Punch, DailyAttendance],
      synchronize: false, // Using manual migrations per user's SQL
    }),
    AttendanceModule,
    V2AttendanceModule,
  ],
})
export class AppModule {}
