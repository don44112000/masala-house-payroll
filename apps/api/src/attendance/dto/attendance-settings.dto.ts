import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class AttendanceSettingsDto {
  @ApiPropertyOptional({ example: '09:30', description: 'Work start time (HH:MM)' })
  @IsOptional()
  @IsString()
  workStartTime?: string;

  @ApiPropertyOptional({ example: '18:30', description: 'Work end time (HH:MM)' })
  @IsOptional()
  @IsString()
  workEndTime?: string;

  @ApiPropertyOptional({ example: 15, description: 'Late threshold in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  lateThresholdMinutes?: number;

  @ApiPropertyOptional({ example: 15, description: 'Early out threshold in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  earlyOutThresholdMinutes?: number;

  @ApiPropertyOptional({ example: 8, description: 'Minimum hours for full day' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  minHoursForFullDay?: number;

  @ApiPropertyOptional({ example: 4, description: 'Minimum hours for half day' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  minHoursForHalfDay?: number;
}
