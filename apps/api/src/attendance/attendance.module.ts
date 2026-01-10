import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { DatFileParser } from './parsers/dat-file.parser';
import { UserDataParser } from './parsers/user-data.parser';
import { ReportTemplateService } from './report-template.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, DatFileParser, UserDataParser, ReportTemplateService],
})
export class AttendanceModule {}

