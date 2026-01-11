import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AttendanceModule } from "./attendance/attendance.module";
import { V2AttendanceModule } from "./v2/v2-attendance.module";
import { Employee, Punch, DailyAttendance } from "./v2/entities";

import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { SpaController } from "./spa.controller";

// In Docker (production), WORKDIR is /app, so paths resolve correctly
// For local dev, process.cwd() is the monorepo root
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? "/app/apps/web/dist"
    : join(process.cwd(), "apps/web/dist");

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: STATIC_PATH,
      serveRoot: "/", // Serve at root URL
      exclude: ["/attendance/(.*)", "/v2/(.*)", "/api/(.*)"],
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
