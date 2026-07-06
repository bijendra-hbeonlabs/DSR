# HBEONLABS - Employee Work Management System

A comprehensive full-stack enterprise SaaS application for managing employee workflows, attendance, daily status reports (DSR), task management, and project tracking.

## Project Structure

```
/
├── app/                          # Next.js frontend
│   ├── (auth)/                   # Authentication pages
│   │   └── login/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── page.tsx              # Main dashboard
│   │   ├── attendance/
│   │   ├── dsr/
│   │   ├── tasks/
│   │   └── projects/
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── globals.css               # Global styles
├── components/                   # React components
│   └── layout/                   # Layout components (Sidebar, Header)
├── lib/
│   ├── api-client.ts            # REST API client
│   ├── auth-context.tsx         # Authentication context
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Utility functions
├── server/                       # Express.js backend
│   ├── config/
│   │   ├── database.js          # Sequelize configuration
│   │   └── constants.js         # Constants and enums
│   ├── models/                  # Sequelize ORM models
│   ├── routes/                  # API route handlers
│   ├── controllers/             # Business logic
│   ├── middleware/              # Express middleware
│   ├── utils/                   # Utility functions (email, etc.)
│   │   └── emailService.js      # Email notification service
│   ├── seeds/                   # Database seeding
│   └── server.js                # Main server entry point
└── public/                      # Static assets
```

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide Icons** - Icon library

### Backend
- **Express.js 5** - Node.js web framework
- **Sequelize 6** - ORM for Node.js
- **MySQL 8** - Relational database (falls back to SQLite if MySQL unavailable)
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Nodemailer** - Email delivery service
- **node-cron** - Scheduled task runner

## Prerequisites

- Node.js 18+ (with pnpm)
- MySQL 8.0+ (optional - app falls back to SQLite automatically)
- Environment variables configured

## Setup Instructions

### 1. Environment Configuration

Create or update `.env` in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hbeonlabs_db
DB_USER=root
DB_PASSWORD=yourpassword
DB_DIALECT=mysql
# SQLite fallback path (used automatically if MySQL is unavailable)
DB_STORAGE=./database.sqlite

# Server
PORT=5001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Frontend API
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# Email (SMTP) Configuration — required for email notifications
# See "Email Setup" section below for full instructions
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 📧 Email Setup (SMTP Configuration)

The system sends automatic email notifications for:
- **DSR Submission** — when an employee submits their Daily Status Report (sends to employee, manager, admin, CEO)
- **DSR Reminder** — at 6:00 PM every day, reminders are sent to employees who haven't submitted their DSR
- **Password Reset** — sends a temporary password to the employee's email

### Step 1 — Choose Your Email Provider

#### Gmail (Recommended)
1. Sign in to your Gmail account at [myaccount.google.com](https://myaccount.google.com)
2. Go to **Security** → **2-Step Verification** → Enable it if not already enabled
3. Go to **Security** → **App Passwords** → Select "Mail" + "Other (Custom name)" → Enter "HBEONLABS"
4. Copy the 16-character app password shown

#### Outlook / Office 365
Use `smtp.office365.com` on port `587` with your normal password.

#### Custom SMTP Server
Use your mail server's details.

### Step 2 — Add to `.env`

```env
SMTP_HOST=smtp.gmail.com        # Gmail SMTP host
SMTP_PORT=587                   # Use 587 for TLS (recommended)
SMTP_SECURE=false               # false for port 587 (STARTTLS), true for port 465 (SSL)
SMTP_USER=yourname@gmail.com    # Your full Gmail address
SMTP_PASS=xxxx xxxx xxxx xxxx   # The 16-character App Password (no spaces)
```

### Step 3 — Test

Restart the backend server and submit a DSR. Check the server terminal for logs:
```
DSR SUBMISSION EMAIL EVENT LOG
Recipients: employee@gmail.com, admin@hbeonlabs.com
Email Send Status: SUCCESS
```

> **Note:** If SMTP credentials are not set in `.env`, all emails are printed to the server console for testing. No real emails are sent until credentials are configured.

---

### 2. MySQL Setup (Optional)

```bash
# Create database
CREATE DATABASE hbeonlabs_db;
USE hbeonlabs_db;
```

> If MySQL is unavailable, the app automatically uses `./database.sqlite` as a fallback — no configuration required.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Seed Database

```bash
pnpm seed
```

This will:
- Create all 14 tables
- Insert test data (employees, projects, tasks, etc.)
- Create test user accounts with departments and designations

### 5. Start Development Servers

**Option A: Run both simultaneously**
```bash
pnpm dev
```

**Option B: Run separately**
```bash
# Terminal 1 - Frontend
pnpm dev:frontend

# Terminal 2 - Backend
pnpm dev:backend
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api

---

## Test Credentials

After seeding, use these credentials to log in:

| Username | Password | Role | Department |
|----------|----------|------|-----------|
| superadmin | Hbeonlabs@2026 | CEO | Executive |
| admin | Hbeonlabs@2026 | Admin | HR |
| manager | Hbeonlabs@2026 | Manager | Engineering |
| employee | Hbeonlabs@2026 | Employee | Engineering |

---

## Role-Based Access

### CEO (Super Admin)
- Full system access
- User management (create, edit, enable/disable users)
- Department & designation management
- System settings & announcements
- Attendance export (Excel)
- View all employee details and projects

### Admin
- Attendance management
- DSR reviews and approvals
- Task and project management
- Employee directory
- Department management

### Manager
- Team attendance viewing
- Team DSR review
- Task assignment and tracking
- Team member management

### Employee
- Personal attendance tracking (camera-based face capture)
- Daily DSR submission
- Task management
- Project participation
- Leave requests

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset (sends email)

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details (includes department + designation)
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Users
- `GET /api/users` - List all users (Admin+)
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user (Admin+)
- `PUT /api/users/:id` - Update user / toggle active status
- `DELETE /api/users/:id` - Delete user (Admin+)

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/check-in` - Clock in
- `POST /api/attendance/check-out` - Clock out
- `GET /api/attendance/today/status` - Today's status
- `GET /api/attendance/export-summary?startDate=&endDate=` - Excel export

### Tasks
- `GET /api/tasks` - List tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members` - Add team member

### DSR (Daily Status Report)
- `GET /api/dsr` - List DSR records
- `GET /api/dsr/:id` - Get DSR details
- `POST /api/dsr` - Create DSR
- `PUT /api/dsr/:id` - Update DSR
- `POST /api/dsr/:id/submit` - Submit DSR (triggers email to all stakeholders)
- `POST /api/dsr/:id/approve` - Approve DSR
- `POST /api/dsr/:id/reject` - Reject DSR

### Leaves
- `GET /api/leaves` - List leave requests
- `POST /api/leaves` - Apply for leave
- `POST /api/leaves/:id/approve` - Approve leave
- `POST /api/leaves/:id/reject` - Reject leave
- `DELETE /api/leaves/:id` - Cancel leave request

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

---

## Database Schema

### Core Tables
- **users** - User accounts with credentials
- **roles** - Role definitions (CEO/Super Admin, Admin, Manager, Employee)
- **employees** - Employee master records
- **departments** - Organization departments (Engineering, Design, Sales, HR, Finance, Executive)
- **designations** - Job titles/positions (CEO, HR Manager, Tech Lead, etc.)

### Operations Tables
- **attendance** - Daily attendance records
- **dsr** - Daily Status Reports
- **tasks** - Project tasks
- **projects** - Project management
- **project_members** - Project team assignment
- **leaves** - Leave requests
- **announcements** - Company announcements
- **notifications** - System notifications

---

## Features Implemented

### Authentication & Access ✅
- JWT-based login/logout
- Role-based access control (CEO / Admin / Manager / Employee)
- Forgot password via email (SMTP)
- User enable/disable by Super Admin

### Dashboard ✅
- Role-specific KPI cards with real database data
- Quick action buttons
- Recent activity and announcements

### Attendance ✅
- Check-in / Check-out with timer
- Camera-based attendance (webcam capture)
- Admin Excel export (hours + days present)
- Date-wise filtering

### DSR (Daily Status Reports) ✅
- Create, edit, submit daily reports
- Manager/Admin review and approval workflow
- Automatic email on submission to employee + manager + admin + CEO
- Automatic 6 PM daily reminder to employees who haven't submitted

### Employee Management ✅
- Full employee directory with search
- Date-wise detail filtering
- Project assignment tracking
- Department and designation management

### Departments ✅
- View all departments and member directory
- Executive department for CEO

### Projects & Tasks ✅
- Project creation and team assignment
- Task management with status tracking
- Employee project portfolio view

### Leaves ✅
- Leave application and approval workflow

### System Settings ✅
- Announcements management (CEO / Admin)
- User management (CEO / Admin)

---

## Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Seed database**: `pnpm seed`
3. **Start dev servers**: `pnpm dev`
4. **Open browser**: http://localhost:3000
5. **Login** with test credentials

## Building for Production

```bash
# Build frontend
pnpm build

# Start production server
pnpm start
```

---

## Troubleshooting

### Database Connection Error
- Ensure MySQL is running on `localhost:3306`
- Check DB credentials in `.env`
- Verify database exists: `CREATE DATABASE hbeonlabs_db;`
- **App falls back to SQLite automatically** if MySQL is unavailable

### API Connection Error
- Ensure backend is running on **port 5001** (`pnpm dev:backend`)
- Check `NEXT_PUBLIC_API_URL=http://localhost:5001/api` in `.env`
- Verify CORS is enabled in backend

### Emails Not Sending
- Check `SMTP_USER` and `SMTP_PASS` are set in `.env`
- For Gmail: use an **App Password** (not your login password)
- Check server console for `EMAIL EVENT LOG` printouts as fallback

### Port Already in Use
- Frontend: Change the port in package.json dev scripts or kill process on port 3000
- Backend: Update `PORT=5001` in `.env`

---

## 📋 Configuration Changelog

### What Was Changed & Where

| Change | File(s) | Reason |
|--------|---------|--------|
| Backend port changed from **5000 → 5001** | `.env`, `lib/api-client.ts`, `lib/auth-context.tsx`, `app/**/page.tsx` | Matches actual server `PORT=5001` config |
| CEO role display instead of Super Admin | `users/page.tsx`, `profile/page.tsx`, `employees/page.tsx`, `departments/page.tsx` | CEO is more accurate role title |
| New **Executive** department + **CEO** designation in DB | `server/seeds/seedDatabase.js` + live DB migration | CEO should not be under HR dept |
| Login now returns nested department + designation | `server/controllers/authController.js` | Profile page was showing N/A for dept/designation |
| User endpoint returns nested dept + designation | `server/routes/users.js` | Required for profile sync after session refresh |
| Auth context syncs with backend on mount | `lib/auth-context.tsx` | Prevents stale cached designation (HR Manager) from showing |
| Email notifications for DSR submit + 6PM reminders | `server/utils/emailService.js` | Auto-notify all stakeholders |
| SMTP config via `.env` variables | `.env`, `server/utils/emailService.js` | Configurable without code changes |
| Mobile sidebar auto-closes + dark mode fix | `components/layout/Sidebar.tsx` | Sidebar was invisible in mobile dark mode |
| Attendance export to Excel | `server/routes/attendance.js` | Admin/CEO export attendance data |

---

## Support

For issues or questions, please refer to the API documentation in `server/routes/` or the component documentation in `components/`.

## License

Proprietary - HBEONLABS Employee Management System


## Project Structure

```
/
├── app/                          # Next.js frontend
│   ├── (auth)/                   # Authentication pages
│   │   └── login/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── page.tsx              # Main dashboard
│   │   ├── attendance/
│   │   ├── dsr/
│   │   ├── tasks/
│   │   └── projects/
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── globals.css               # Global styles
├── components/                   # React components
│   └── layout/                   # Layout components (Sidebar, Header)
├── lib/
│   ├── api-client.ts            # REST API client
│   ├── auth-context.tsx         # Authentication context
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Utility functions
├── server/                       # Express.js backend
│   ├── config/
│   │   ├── database.js          # Sequelize configuration
│   │   └── constants.js         # Constants and enums
│   ├── models/                  # Sequelize ORM models
│   ├── routes/                  # API route handlers
│   ├── controllers/             # Business logic
│   ├── middleware/              # Express middleware
│   ├── utils/                   # Utility functions
│   ├── seeds/                   # Database seeding
│   └── server.js                # Main server entry point
└── public/                      # Static assets
```

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide Icons** - Icon library

### Backend
- **Express.js 5** - Node.js web framework
- **Sequelize 6** - ORM for Node.js
- **MySQL 8** - Relational database
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing

## Prerequisites

- Node.js 18+ (with pnpm)
- MySQL 8.0+
- Environment variables configured

## Setup Instructions

### 1. Environment Configuration

Create `.env.development.local` (already done, but verify):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hbeonlabs_db
DB_USER=root
DB_PASSWORD=password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Frontend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 2. MySQL Setup

```bash
# Create database
CREATE DATABASE hbeonlabs_db;
USE hbeonlabs_db;
```

Ensure MySQL server is running on localhost:3306

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Seed Database

```bash
pnpm seed
```

This will:
- Create all 14 tables
- Insert test data (employees, projects, tasks, etc.)
- Create test user accounts

### 5. Start Development Servers

**Option A: Run both simultaneously**
```bash
pnpm dev
```

**Option B: Run separately**
```bash
# Terminal 1 - Frontend
pnpm dev:frontend

# Terminal 2 - Backend
pnpm dev:backend
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Test Credentials

After seeding, use these credentials to log in:

| Username | Password | Role |
|----------|----------|------|
| superadmin | Hbeonlabs@2026 | Super Admin |
| admin | Hbeonlabs@2026 | Admin |
| manager | Hbeonlabs@2026 | Manager |
| employee | Hbeonlabs@2026 | Employee |

## Role-Based Access

### Super Admin
- Full system access
- User management
- Department management
- System settings

### Admin
- Attendance management
- DSR reviews and approvals
- Task and project management
- Employee directory
- Department management

### Manager
- Team attendance viewing
- Team DSR review
- Task assignment and tracking
- Team member management

### Employee
- Personal attendance tracking
- Daily DSR submission
- Task management
- Project participation
- Leave requests

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - User forgot password reset request

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/check-in` - Clock in
- `POST /api/attendance/check-out` - Clock out
- `GET /api/attendance/today/status` - Today's status

### Tasks
- `GET /api/tasks` - List tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `GET /api/projects/:id/members` - List project members
- `POST /api/projects/:id/members` - Add team member

### DSR (Daily Status Report)
- `GET /api/dsr` - List DSR records
- `GET /api/dsr/:id` - Get DSR details
- `POST /api/dsr` - Create DSR
- `PUT /api/dsr/:id` - Update DSR
- `POST /api/dsr/:id/submit` - Submit DSR
- `POST /api/dsr/:id/approve` - Approve DSR
- `POST /api/dsr/:id/reject` - Reject DSR

### Leaves
- `GET /api/leaves` - List leave requests
- `POST /api/leaves` - Apply for leave
- `POST /api/leaves/:id/approve` - Approve leave
- `POST /api/leaves/:id/reject` - Reject leave
- `DELETE /api/leaves/:id` - Cancel leave request

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

### Core Tables
- **users** - User accounts with credentials
- **roles** - Role definitions (Super Admin, Admin, Manager, Employee)
- **employees** - Employee master records
- **departments** - Organization departments
- **designations** - Job titles/positions

### Operations Tables
- **attendance** - Daily attendance records
- **dsr** - Daily Status Reports
- **tasks** - Project tasks
- **projects** - Project management
- **project_members** - Project team assignment
- **leaves** - Leave requests
- **announcements** - Company announcements
- **notifications** - System notifications

## Features Implemented

### Phase 1: Backend & Database ✅
- Express.js server setup
- Sequelize ORM with 14 models
- Complete CRUD API endpoints
- JWT authentication
- Role-based access control
- Database seeding

### Phase 2: Frontend Foundation ✅
- TypeScript types for all models
- API client library
- Authentication context
- Login page with test credentials
- Protected dashboard layout
- Role-based sidebar navigation
- Header with user menu

### Phase 3: Dashboard & Core UI ✅
- Role-specific dashboards
- KPI cards with real data
- Quick action buttons
- Recent activity section

### To Be Implemented
- Attendance management UI
- DSR submission and review workflows
- Task management (Kanban/Table/Calendar)
- Project management
- Employee directory
- Leave management
- Reports & analytics
- Advanced search
- Notifications system

## Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Seed database**: `pnpm seed`
3. **Start dev servers**: `pnpm dev`
4. **Open browser**: http://localhost:3000
5. **Login** with test credentials

## Building for Production

```bash
# Build frontend
pnpm build

# Start production server
pnpm start
```

## Troubleshooting

### Database Connection Error
- Ensure MySQL is running on localhost:3306
- Check DB credentials in `.env.development.local`
- Verify database exists: `CREATE DATABASE hbeonlabs_db;`

### API Connection Error
- Ensure backend is running on port 5000
- Check NEXT_PUBLIC_API_URL environment variable
- Verify CORS is enabled in backend

### Port Already in Use
- Frontend: Change `dev` script port or use `lsof -i :3000`
- Backend: Update `PORT` in `.env.development.local`

## Next Steps

1. **Set up MySQL locally** or use a remote instance
2. **Configure `.env.development.local`** with your database credentials
3. **Run `pnpm seed`** to populate database
4. **Run `pnpm dev`** to start both servers
5. **Login** and explore the application

## Support

For issues or questions, please refer to the API documentation in `server/routes/` or the component documentation in `components/`.

## License

Proprietary - HBEONLABS Employee Management System
