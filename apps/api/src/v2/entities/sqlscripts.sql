-- Create employees table
CREATE TABLE IF NOT EXISTS "employees" (
    "id" SERIAL PRIMARY KEY,
    "biometric_id" INTEGER NOT NULL UNIQUE,
    "name" VARCHAR(255)
);
-- Create punches table
CREATE TABLE IF NOT EXISTS "punches" (
    "id" SERIAL PRIMARY KEY,
    "employee_id" INTEGER NOT NULL,
    "punch_time" TIMESTAMP NOT NULL,
    "verification_type" VARCHAR(20) NOT NULL DEFAULT 'Fingerprint',
    "punch_type" VARCHAR(10),
    "is_paired" BOOLEAN NOT NULL DEFAULT false,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "fk_punches_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
-- Create unique index on punches
CREATE UNIQUE INDEX IF NOT EXISTS "idx_employee_punch_time" ON "punches" ("employee_id", "punch_time");
-- Create daily_attendance table
CREATE TABLE IF NOT EXISTS "daily_attendance" (
    "id" SERIAL PRIMARY KEY,
    "employee_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "day_code" VARCHAR(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ABSENT',
    "first_in" VARCHAR(8),
    "last_out" VARCHAR(8),
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "punch_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "fk_daily_attendance_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
-- Create unique index on daily_attendance
CREATE UNIQUE INDEX IF NOT EXISTS "idx_employee_date" ON "daily_attendance" ("employee_id", "date");