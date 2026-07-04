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
