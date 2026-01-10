import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
  HttpException,
  Res,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { Response } from "express";
import * as puppeteer from "puppeteer";
import { AttendanceService } from "./attendance.service";
import { ReportTemplateService } from "./report-template.service";
import { AttendanceSettingsDto } from "./dto/attendance-settings.dto";
import type {
  AttendanceReport,
  UploadResponse,
  DailyAttendance,
} from "@attendance/shared";

interface GenerateReportDto {
  userId: number;
  userName: string;
  dailyRecords: DailyAttendance[];
  dateRange: {
    from: string;
    to: string;
  };
  summary?: {
    totalHours?: string;
    avgHours?: string;
    presentDays?: number;
    absentDays?: number;
    incompleteDays?: number;
    compDays?: number;
    totalDays?: number;
  };
}

@ApiTags("Attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly reportTemplateService: ReportTemplateService
  ) {}

  @Post("report/html")
  @ApiOperation({ summary: "Generate HTML attendance report for a user" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        userName: { type: "string" },
        dailyRecords: { type: "array" },
        dateRange: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
        },
        summary: {
          type: "object",
          properties: {
            totalHours: { type: "string" },
            avgHours: { type: "string" },
            presentDays: { type: "number" },
            absentDays: { type: "number" },
            incompleteDays: { type: "number" },
            compDays: { type: "number" },
            totalDays: { type: "number" },
          },
        },
      },
    },
  })
  async generateHtmlReport(
    @Body() dto: GenerateReportDto
  ): Promise<{ html: string; filename: string }> {
    try {
      const result = this.reportTemplateService.generateHtmlReport(dto);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to generate report",
          error: error.message || "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("report/pdf")
  @ApiOperation({ summary: "Generate PDF attendance report for a user" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        userName: { type: "string" },
        dailyRecords: { type: "array" },
        dateRange: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
        },
      },
    },
  })
  async generatePdfReport(
    @Body() dto: GenerateReportDto,
    @Res() res: Response
  ): Promise<void> {
    let browser: puppeteer.Browser | null = null;
    try {
      // Generate HTML first
      const { html, filename } =
        this.reportTemplateService.generateHtmlReport(dto);
      const pdfFilename = filename.replace(/\.html$/i, ".pdf");

      // Launch Puppeteer and generate PDF
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "5mm",
          bottom: "5mm",
          left: "5mm",
          right: "5mm",
        },
      });

      await browser.close();
      browser = null;

      // Send PDF response
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        "Content-Length": pdfBuffer.length,
      });
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw new HttpException(
        {
          success: false,
          message: "Failed to generate PDF report",
          error: error.message || "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("upload")
  @ApiOperation({
    summary: "Upload and process attendance and user data files",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        attendanceFile: {
          type: "string",
          format: "binary",
          description: "Attendance data file (.dat, .txt, .csv)",
        },
        userFile: {
          type: "string",
          format: "binary",
          description: "User mapping data file (.dat)",
        },
        settings: {
          type: "object",
          properties: {
            workStartTime: { type: "string", example: "09:30" },
            workEndTime: { type: "string", example: "18:30" },
            lateThresholdMinutes: { type: "number", example: 15 },
            earlyOutThresholdMinutes: { type: "number", example: 15 },
          },
        },
      },
      required: ["attendanceFile", "userFile"],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "attendanceFile", maxCount: 1 },
      { name: "userFile", maxCount: 1 },
    ])
  )
  async uploadFile(
    @UploadedFiles()
    files: {
      attendanceFile?: Express.Multer.File[];
      userFile?: Express.Multer.File[];
    },
    @Body("settings") settingsJson?: string
  ): Promise<UploadResponse> {
    try {
      // Validate that we have both files
      if (!files?.attendanceFile?.[0] || !files?.userFile?.[0]) {
        throw new HttpException(
          "Both attendance file and user file are required",
          HttpStatus.BAD_REQUEST
        );
      }

      const attendanceFile = files.attendanceFile[0];
      const userFile = files.userFile[0];

      if (!attendanceFile || !userFile) {
        throw new HttpException(
          "Both attendanceFile and userFile must be provided",
          HttpStatus.BAD_REQUEST
        );
      }

      // Parse settings if provided
      let settings: AttendanceSettingsDto | undefined;
      if (settingsJson) {
        try {
          settings = JSON.parse(settingsJson);
        } catch {
          throw new HttpException(
            "Invalid settings JSON format",
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Validate attendance file type
      const validExtensions = [".dat", ".txt", ".csv"];
      const fileExt =
        "." + attendanceFile.originalname.split(".").pop()?.toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        throw new HttpException(
          `Invalid attendance file type. Supported: ${validExtensions.join(
            ", "
          )}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate attendance file naming convention (Must start with 'C')
      if (!attendanceFile.originalname.toUpperCase().startsWith("C")) {
        throw new HttpException(
          'Attendance file name must start with "C" (e.g., C001.dat)',
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate user file type
      const userFileExt =
        "." + userFile.originalname.split(".").pop()?.toLowerCase();
      if (userFileExt !== ".dat") {
        throw new HttpException(
          "User file must be a .dat file",
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate user file naming convention (Must start with 'user')
      if (!userFile.originalname.toLowerCase().startsWith("user")) {
        throw new HttpException(
          'User file name must start with "user" (e.g., user.dat)',
          HttpStatus.BAD_REQUEST
        );
      }

      // Process both files
      const report: AttendanceReport = await this.attendanceService.processFile(
        attendanceFile.buffer,
        attendanceFile.originalname,
        settings,
        userFile.buffer
      );

      return {
        success: true,
        message: `Successfully processed ${report.totalRecords} records for ${report.uniqueUsers} users`,
        report,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Failed to process files",
          error: error.message || "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("parse-text")
  @ApiOperation({ summary: "Parse attendance data from raw text" })
  async parseText(
    @Body("data") data: string,
    @Body("settings") settings?: AttendanceSettingsDto
  ): Promise<UploadResponse> {
    try {
      const buffer = Buffer.from(data, "utf-8");
      const report = await this.attendanceService.processFile(
        buffer,
        "pasted-data.txt",
        settings
      );

      return {
        success: true,
        message: `Successfully processed ${report.totalRecords} records`,
        report,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Failed to parse data",
          error: error.message || "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
