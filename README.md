# Attendance Processor

A modern full-stack application for processing biometric attendance `.dat` files. Built with **NestJS** (backend) and **React** (frontend) with in-memory processing - no database required.

![Tech Stack](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## ✨ Features

- 📤 **Drag & Drop Upload** - Easy file upload with progress feedback
- 📊 **Visual Analytics** - Charts and graphs for attendance data
- 👥 **Multi-User Support** - View attendance for all employees
- ⚙️ **Configurable Settings** - Customize work hours, late thresholds, etc.
- 🚀 **In-Memory Processing** - No database required, instant results
- 🎨 **Modern UI** - Beautiful dark theme with smooth animations

## 🛠️ Tech Stack

### Backend
- **NestJS** - Node.js framework
- **Multer** - File upload handling
- **Streaming** - Line-by-line file parsing

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **TanStack Query** - State management

### Monorepo
- **pnpm Workspaces**
- **Turborepo** - Build orchestration

## 📦 Project Structure

```
attendance-system/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types & utilities
├── package.json      # Root package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8

### Installation

1. **Install pnpm** (if not installed):
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start development servers**:
   ```bash
   # Start both backend and frontend
   pnpm dev

   # Or start individually
   pnpm dev:api   # Backend on http://localhost:3001
   pnpm dev:web   # Frontend on http://localhost:5173
   ```

4. **Open the app**:
   - Frontend: http://localhost:5173
   - API Docs: http://localhost:3001/api/docs

## 📁 Supported File Format

The system processes `.dat` files from biometric devices (ZKTeco, etc.) with the following format:

```
USER_ID    TIMESTAMP              VERIFY_TYPE  IN_OUT  WORK_CODE  RESERVED
5          2025-12-01 09:47:09    1            0       1          0
16         2025-12-01 09:47:14    1            0       1          0
```

### Column Description

| Column | Description | Values |
|--------|-------------|--------|
| USER_ID | Employee identifier | Integer |
| TIMESTAMP | Date and time | YYYY-MM-DD HH:MM:SS |
| VERIFY_TYPE | Verification method | 1=Fingerprint, 2=Card, etc. |
| IN_OUT | Check direction | 0=In, 1=Out |
| WORK_CODE | Work code | Usually 1 |
| RESERVED | Reserved field | Usually 0 |

## ⚙️ Configuration

Click the **Settings** icon in the app to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Work Start Time | 09:30 | Expected start time |
| Work End Time | 18:30 | Expected end time |
| Late Threshold | 15 min | Grace period for late arrival |
| Early Out Threshold | 15 min | Grace period for early leaving |
| Full Day Hours | 8 | Minimum hours for full day |
| Half Day Hours | 4 | Minimum hours for half day |

## 📊 Calculations

The system calculates:

- ✅ **Daily attendance** (first in, last out)
- ✅ **Working hours** per day
- ✅ **Total hours** per month
- ✅ **Late arrivals** based on configured threshold
- ✅ **Early departures** 
- ✅ **Overtime hours**
- ✅ **Attendance status** (Present, Half Day, Incomplete, Absent)

## 🏗️ Building for Production

```bash
# Build all packages
pnpm build

# Start production server
pnpm start:api
```

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attendance/upload` | Upload and process .dat file |
| POST | `/attendance/parse-text` | Parse raw attendance text |

### Example Request

```bash
curl -X POST http://localhost:3001/attendance/upload \
  -F "file=@attendance.dat" \
  -F 'settings={"workStartTime":"09:00","workEndTime":"18:00"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for any purpose.

---

Built with ❤️ using NestJS + React
