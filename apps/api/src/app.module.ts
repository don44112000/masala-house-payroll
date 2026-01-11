import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceModule } from "./attendance/attendance.module";
import { V2AttendanceModule } from "./v2/v2-attendance.module";
import { Employee, Punch, DailyAttendance } from "./v2/entities";

import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { SpaController } from "./spa.controller";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "apps/web/dist"),
      exclude: ["/api/(.*)"],
    }),
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
      ssl:
        process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    }),
    AttendanceModule,
    V2AttendanceModule,
  ],
  controllers: [SpaController],
})
export class AppModule {}
