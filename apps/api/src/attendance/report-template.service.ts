import { Injectable, Logger } from "@nestjs/common";
import type { DailyAttendance, PunchRecord } from "@attendance/shared";
import * as fs from "fs";
import * as path from "path";

interface ReportData {
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

interface DurationResult {
  inDuration: number;
  outDuration: number;
}

@Injectable()
export class ReportTemplateService {
  private readonly logger = new Logger(ReportTemplateService.name);

  private calculateInOutDuration(punches: PunchRecord[]): DurationResult {
    if (punches.length < 2) {
      return { inDuration: 0, outDuration: 0 };
    }

    const sortedPunches = [...punches].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    let inDuration = 0;
    let outDuration = 0;

    for (let i = 0; i < sortedPunches.length - 1; i++) {
      const currentTime = this.timeToMinutes(sortedPunches[i].time);
      const nextTime = this.timeToMinutes(sortedPunches[i + 1].time);
      const duration = nextTime - currentTime;

      if (i % 2 === 0) {
        inDuration += duration;
      } else {
        outDuration += duration;
      }
    }

    return { inDuration, outDuration };
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  private formatDurationHHMM(totalMinutes: number): string {
    if (totalMinutes <= 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  private formatPunchRecords(punches: PunchRecord[]): string {
    if (punches.length === 0) return "";

    const sortedPunches = [...punches].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    return sortedPunches
      .map((punch, idx) => {
        const inOut = idx % 2 === 0 ? "in" : "out";
        const time = punch.time.substring(0, 5); // HH:MM
        const editedClass = punch.isEdited ? " edited" : "";
        const titleAttr = punch.isEdited ? ' title="Manual Entry"' : "";
        return `<span class="punch-tag ${inOut}${editedClass}"${titleAttr}>${time} <span class="type">(${inOut.toUpperCase()})</span></span>`;
      })
      .join("");
  }

  private formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    const dayDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
    return `${dayDate} <span class="weekday">(${weekday})</span>`;
  }

  private formatDateRange(from: string, to: string): string {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const formatPart = (d: Date) =>
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    return `${formatPart(fromDate)} - ${formatPart(toDate)}`;
  }

  private getCurrentTimestamp(): string {
    const now = new Date();
    return (
      now.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }) +
      " " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  }

  private getLogoBase64(): string {
    try {
      // Assuming the API runs from apps/api or root, try to locate the logo in apps/web/public/logo.png
      // We'll search a few common relative paths
      const possiblePaths = [
        path.join(process.cwd(), "apps/web/public/logo.png"), // From root
        path.join(process.cwd(), "../web/public/logo.png"), // From apps/api
        path.join(__dirname, "../../../web/public/logo.png"), // From dist/attendance/
        path.join(__dirname, "../../../../apps/web/public/logo.png"), // From dist/attendance/
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const bitmap = fs.readFileSync(p);
          return `data:image/png;base64,${bitmap.toString("base64")}`;
        }
      }
      this.logger.warn("Logo file not found in common locations");
      return "";
    } catch (error) {
      this.logger.error("Failed to load logo image", error);
      return "";
    }
  }

  generateHtmlReport(data: ReportData): { html: string; filename: string } {
    const { userId, userName, dailyRecords, dateRange, summary } = data;

    const sortedRecords = [...dailyRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate metrics locally (fallback)
    let totalMinutes = 0;
    let localPresentDays = 0;
    let localAbsentDays = 0;
    let localIncompleteDays = 0;
    let localCompDays = 0;

    sortedRecords.forEach((record) => {
      const { punches } = record;
      const { inDuration } = this.calculateInOutDuration(punches);

      totalMinutes += inDuration;

      if (record.status === "COMP") {
        localCompDays++;
      } else if (punches.length === 0) {
        localAbsentDays++;
      } else if (punches.length % 2 !== 0) {
        localIncompleteDays++;
      } else {
        localPresentDays++;
      }
    });

    const localTotalHours = Math.floor(totalMinutes / 60);
    const localTotalMins = totalMinutes % 60;
    const avgDailyMinutes =
      localPresentDays > 0 ? Math.floor(totalMinutes / localPresentDays) : 0;
    const localAvgHours = Math.floor(avgDailyMinutes / 60);
    const localAvgMins = avgDailyMinutes % 60;

    // Use summary if provided, else use local calculations
    const displayTotalDays = summary?.totalDays ?? sortedRecords.length;
    const displayPresentDays = summary?.presentDays ?? localPresentDays;
    const displayAbsentDays = summary?.absentDays ?? localAbsentDays;
    const displayIncompleteDays =
      summary?.incompleteDays ?? localIncompleteDays;
    const displayCompDays = summary?.compDays ?? localCompDays;

    // Default to calculated strings - Use new formatting logic
    // Total Hours
    let totalHoursVal = localTotalHours;
    let totalMinsVal = localTotalMins;

    if (summary?.totalHours) {
      // Expected format "238h 24m"
      const match = summary.totalHours.match(/(\d+)h (\d+)m/);
      if (match) {
        totalHoursVal = parseInt(match[1]);
        totalMinsVal = parseInt(match[2]);
      }
    }

    const totalHoursMain = `${totalHoursVal}.${String(totalMinsVal).padStart(
      2,
      "0"
    )}`;
    const totalHoursSub = `${totalHoursVal} hours ${totalMinsVal} mins`;

    // Avg Hours
    let avgHoursMain = `${localAvgHours}.${String(localAvgMins).padStart(
      2,
      "0"
    )}`;
    let avgHoursSub = `${localAvgHours} hours ${localAvgMins} mins`;

    if (summary?.avgHours) {
      const match = summary.avgHours.match(/(\d+)h (\d+)m/);
      if (match) {
        const h = parseInt(match[1]);
        const m = parseInt(match[2]);
        avgHoursMain = `${h}.${String(m).padStart(2, "0")}`;
        avgHoursSub = `${h} hours ${m} mins`;
      } else if (!isNaN(parseFloat(summary.avgHours))) {
        avgHoursMain = summary.avgHours;
        const parts = summary.avgHours.split(".");
        const h = parseInt(parts[0]);
        const m = parts.length > 1 ? parseInt(parts[1]) : 0;
        avgHoursSub = `${h} hours ${m} mins`;
      }
    }

    // Generate table rows
    let tableRows = "";
    sortedRecords.forEach((record, idx) => {
      const { inDuration, outDuration } = this.calculateInOutDuration(
        record.punches
      );
      const punchRecords = this.formatPunchRecords(record.punches);
      const displayDate = this.formatDateForDisplay(record.date);

      const isAbsent =
        record.status === "ABSENT" ||
        (!record.status && record.punches.length === 0);
      const isIncomplete =
        record.status === "INCOMPLETE" ||
        (!record.status &&
          record.punches.length > 0 &&
          record.punches.length % 2 !== 0);
      const isComp = record.status === "COMP";

      let statusClass = "";
      if (isAbsent) statusClass = "row-absent";
      if (isIncomplete) statusClass = "row-incomplete";
      if (isComp) statusClass = "row-comp";

      const creativeAbsent = `
        <div class="status-pill absent">
          <span class="icon">●</span>
          <span>Absent</span>
        </div>
      `;

      const creativeIncomplete = `
        <div class="status-pill incomplete">
          <span class="icon">!</span>
          <span>Incomplete Punch</span>
        </div>
      `;

      const creativeComp = `
        <div class="status-pill comp">
          <span class="icon">★</span>
          <span>Comp Off</span>
        </div>
      `;

      let punchContent = punchRecords;
      if (isAbsent) punchContent = creativeAbsent;
      if (isComp) punchContent = creativeComp;
      if (isIncomplete && !punchRecords) punchContent = creativeIncomplete;

      if (isIncomplete && punchContent !== creativeIncomplete) {
        punchContent += ` <span class="status-pill incomplete-mini">Missing Out</span>`;
      }

      tableRows += `
        <tr class="${statusClass}">
          <td class="text-center font-mono text-xs text-gray-500">${
            idx + 1
          }</td>
          <td class="font-medium text-gray-900">${displayDate}</td>
          <td class="text-center font-bold text-slate-700">${
            inDuration > 0 ? this.formatDurationHHMM(inDuration) : "-"
          }</td>
          <td class="text-center text-gray-500">${
            outDuration > 0 ? this.formatDurationHHMM(outDuration) : "-"
          }</td>
          <td class="punch-cell">
            <div class="punch-list">
              ${punchContent}
            </div>
          </td>
        </tr>
      `;
    });

    // Construct Filename: employeeId.Name-mmmYY-report.pdf
    const fromDate = new Date(dateRange.from);
    const monthShort = fromDate
      .toLocaleDateString("en-US", { month: "short" })
      .toLowerCase();
    const yearShort = String(fromDate.getFullYear()).slice(-2);
    // Remove spaces from name for filename safety but keep basic structure
    const safeName = userName.replace(/[^a-zA-Z0-9]/g, "");
    const filename = `${userId}.${safeName}-${monthShort}${yearShort}-report.html`;

    const logoBase64 = this.getLogoBase64();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Attendance Report - ${userName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;
      --secondary: #475569;
      --accent: #0ea5e9;
      --border: #e2e8f0;
      --bg-gray: #f8fafc;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      color: var(--primary);
      background: white;
      -webkit-print-color-adjust: exact;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
    }

    /* Header - Creative Modern */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end; /* Bottom align for a solid base feel */
      padding: 10px 0 5px 0; /* Reduced padding */
      border-bottom: 3px solid var(--primary); /* requested separator */
      margin-bottom: 40px;
      position: relative;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .brand-logo {
      height: 110px; 
      width: auto;
      object-fit: contain;
      /* Visually crop top/bottom whitespace */
      margin-top: -20px;
      margin-bottom: -20px;
      
      /* Drop shadow for depth */
      filter: drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1));
    }

    .brand-text h1 {
      font-size: 24px; /* Smaller brand name */
      font-weight: 800;
      line-height: 1.2;
      color: var(--primary);
      letter-spacing: -0.5px;
      margin-bottom: 0;
    }

    .report-meta {
      text-align: right;
    }

    .report-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--secondary);
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .meta-data {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .meta-period {
      font-size: 13px; /* Bigger Period */
      color: var(--primary);
      font-weight: 600;
    }
    
    .meta-generated {
      font-size: 10px;
      color: var(--secondary);
    }

    /* Summary Grid */
    .summary-container {
      background: var(--bg-gray);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .user-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .user-details h2 { font-size: 18px; font-weight: 700; color: var(--primary); }
    .user-details p { font-size: 12px; color: var(--secondary); margin-top: 4px; }

    .stats-grid-days {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }

    .stats-grid-hours {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .mini-stat {
      background: white;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      text-align: center;
    }
    .mini-stat .label { font-size: 10px; text-transform: uppercase; color: var(--secondary); font-weight: 600; margin-bottom: 4px; }
    .mini-stat .value { font-size: 18px; font-weight: 700; color: var(--primary); }
    
    .mini-stat.present .value { color: var(--success); }
    .mini-stat.absent .value { color: var(--danger); }
    .mini-stat.incomplete .value { color: #60a5fa; }
    .mini-stat.comp .value { color: #fbbf24; }

    .hour-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .hour-stat .label { font-size: 11px; text-transform: uppercase; color: var(--secondary); font-weight: 600; margin-bottom: 2px; }
    .hour-stat .value { font-size: 24px; font-weight: 700; color: var(--accent); }
    .hour-stat .sub { font-size: 10px; color: var(--secondary); }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    
    th {
      text-align: left;
      font-weight: 600;
      color: var(--secondary);
      text-transform: uppercase;
      font-size: 10px;
      padding: 10px 12px;
      background: white;
      border-bottom: 2px solid var(--border);
    }
    
    td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    
    tr:last-child td { border-bottom: none; }
    
    .weekday { color: var(--secondary); font-size: 10px; margin-left: 4px; }
    
    /* Status Styling */
    .row-absent td { background-color: #fef2f2; color: var(--secondary); }
    .row-incomplete td { background-color: #fff7ed; }
    .row-comp td { background-color: #fefce8; }

    /* Punch Tags */
    .punch-list { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    
    .punch-tag {
      background: white;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 500;
    }
    .punch-tag .type { font-size: 9px; color: var(--secondary); margin-left: 2px; }
    
    .punch-tag.in { border-left: 2px solid var(--success); }

    .punch-tag.out { border-left: 2px solid var(--danger); }
    .punch-tag.edited { background-color: #fefce8; border-color: #fca5a5; border-style: dashed; }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pill.absent { background: #f1f5f9; color: #64748b; border: 1px dashed #cbd5e1; }
    .status-pill.incomplete { background: #fff7ed; color: #9a3412; border: 1px solid #ffedd5; }
    .status-pill.incomplete-mini { padding: 1px 6px; font-size: 9px; background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid var(--border);
      font-size: 10px;
      color: var(--secondary);
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { font-size: 10pt; }
      .mini-stat { background: white !important; -webkit-print-color-adjust: exact; }
      .row-absent td { background-color: #fcfcfc !important; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="brand-section">
        ${
          logoBase64
            ? `<img src="${logoBase64}" alt="Logo" class="brand-logo" />`
            : ""
        }
        <div class="brand-text">
          <h1>Lokhande's Masala House</h1>
        </div>
      </div>
      
      <div class="report-meta">
        <div class="report-title">Monthly Attendance</div>
        <div class="meta-data">
          <div class="meta-period">${this.formatDateRange(
            dateRange.from,
            dateRange.to
          )}</div>
          <div class="meta-generated">Generated: ${this.getCurrentTimestamp()}</div>
        </div>
      </div>
    </header>

    <div class="summary-container">
      <div class="user-header">
        <div class="user-details">
          <h2>${userName}</h2>
          <p>Employee ID: #${userId} &nbsp;•&nbsp; Department: Default</p>
        </div>
      </div>

      <div class="stats-grid-days">
        <div class="mini-stat">
          <div class="label">Total Days</div>
          <div class="value">${displayTotalDays}</div>
        </div>
        <div class="mini-stat present">
          <div class="label">Present</div>
          <div class="value">${displayPresentDays}</div>
        </div>
        <div class="mini-stat absent">
          <div class="label">Absent</div>
          <div class="value">${displayAbsentDays}</div>
        </div>
        <div class="mini-stat incomplete">
          <div class="label">Incomplete</div>
          <div class="value">${displayIncompleteDays}</div>
        </div>
        <div class="mini-stat comp">
          <div class="label">Comp Off</div>
          <div class="value">${displayCompDays}</div>
        </div>
      </div>

      <div class="stats-grid-hours">
        <div class="hour-stat">
          <div class="label">Total Hours Worked</div>
          <div class="value">${totalHoursMain}</div>
          <div class="sub">${totalHoursSub}</div>
        </div>
        <div class="hour-stat">
          <div class="label">Avg Hours / Day</div>
          <div class="value">${avgHoursMain}</div>
          <div class="sub">${avgHoursSub}</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th width="5%" class="text-center">#</th>
          <th width="22%">Date</th>
          <th width="12%" class="text-center">In Duration</th>
          <th width="12%" class="text-center">Out Duration</th>
          <th>Punch Log</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="footer">
      <div>System Generated Report</div>
      <div>Confidential • Page <span class="pageNumber"></span></div>
    </div>
  </div>
</body>
</html>`;

    return { html, filename };
  }
}
