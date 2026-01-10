import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { V2AttendanceService } from "./v2-attendance.service";

@ApiTags("V2 Attendance")
@Controller("v2/attendance")
export class V2AttendanceController {
  constructor(private readonly v2Service: V2AttendanceService) {}

  @Get("report")
  @ApiOperation({ summary: "Get attendance report from database" })
  @ApiQuery({
    name: "month",
    type: Number,
    description: "0-indexed month (0=Jan, 11=Dec)",
  })
  @ApiQuery({ name: "year", type: Number })
  @ApiQuery({ name: "workStartTime", required: false, example: "09:30" })
  @ApiQuery({ name: "workEndTime", required: false, example: "18:30" })
  @ApiQuery({
    name: "lateThreshold",
    required: false,
    type: Number,
    example: 15,
  })
  @ApiQuery({
    name: "earlyOutThreshold",
    required: false,
    type: Number,
    example: 15,
  })
  async getReport(
    @Query("month") month: string,
    @Query("year") year: string,
    @Query("workStartTime") workStartTime = "09:30",
    @Query("workEndTime") workEndTime = "18:30",
    @Query("lateThreshold") lateThreshold = "15",
    @Query("earlyOutThreshold") earlyOutThreshold = "15"
  ) {
    try {
      const report = await this.v2Service.getAttendanceReport(
        parseInt(month, 10),
        parseInt(year, 10),
        {
          workStartTime,
          workEndTime,
          lateThresholdMinutes: parseInt(lateThreshold, 10),
          earlyOutThresholdMinutes: parseInt(earlyOutThreshold, 10),
        }
      );
      return report;
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get report",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("employees")
  @ApiOperation({ summary: "Get all employees from database" })
  async getEmployees() {
    try {
      const employees = await this.v2Service.getEmployees();
      return { success: true, employees };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to get employees",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("upload-users")
  @ApiOperation({ summary: "Upload user data file to database" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException("No file uploaded", HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.v2Service.uploadUsers(file.buffer);
      return {
        success: true,
        message: `Users uploaded: ${result.created} created, ${result.updated} updated`,
        ...result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to upload users",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("upload-attendance")
  @ApiOperation({ summary: "Upload attendance .dat file to database" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadAttendance(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException("No file uploaded", HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.v2Service.uploadAttendance(file.buffer);
      return {
        success: true,
        message: `Attendance uploaded: ${result.inserted} inserted, ${result.skipped} skipped`,
        ...result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to upload attendance",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @Post("mark-comp-off")
  @ApiOperation({ summary: "Mark a specific day as COMP off (only if ABSENT)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        date: { type: "string", example: "2026-01-01" },
      },
    },
  })
  async markCompOff(@Body() body: { userId: number; date: string }) {
    try {
      if (!body.userId || !body.date) {
        throw new HttpException(
          "userId and date are required",
          HttpStatus.BAD_REQUEST
        );
      }
      await this.v2Service.markCompOff(body.userId, body.date);
      return { success: true, message: "Marked as COMP off" };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to mark as COMP off",
        HttpStatus.BAD_REQUEST
      );
    }
  }
  @Post("add-punch")
  @ApiOperation({ summary: "Add a manual punch for a user" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        date: { type: "string", example: "2026-01-01" },
        time: { type: "string", example: "09:30" },
        isManual: { type: "boolean", default: true },
      },
    },
  })
  async addPunch(
    @Body()
    body: {
      userId: number;
      date: string;
      time: string;
      isManual?: boolean;
    }
  ) {
    try {
      if (!body.userId || !body.date || !body.time) {
        throw new HttpException(
          "userId, date, and time are required",
          HttpStatus.BAD_REQUEST
        );
      }
      // Default isManual to true if undefined
      const isManual = body.isManual !== undefined ? body.isManual : true;
      await this.v2Service.addPunch(
        body.userId,
        body.date,
        body.time,
        isManual
      );
      return { success: true, message: "Punch added successfully" };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to add punch",
        HttpStatus.BAD_REQUEST
      );
    }
  }
  @Delete("delete-punch")
  @ApiOperation({ summary: "Delete a specific punch" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        punchTime: { type: "string", example: "2026-01-01T09:30:00.000Z" },
      },
    },
  })
  async deletePunch(@Body() body: { userId: number; punchTime: string }) {
    try {
      if (!body.userId || !body.punchTime) {
        throw new HttpException(
          "userId and punchTime are required",
          HttpStatus.BAD_REQUEST
        );
      }
      await this.v2Service.deletePunch(body.userId, body.punchTime);
      return { success: true, message: "Punch deleted successfully" };
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to delete punch",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
