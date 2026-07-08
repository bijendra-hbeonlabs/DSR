# WorkFlow AI - Complete Setup Guide

This guide will walk you through setting up and running the WorkFlow AI Employee Management System locally.

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- MySQL 8.0+ server running
- pnpm package manager (or npm/yarn)

### Step 1: Clone and Install

```bash
# Install dependencies
pnpm install
```

### Step 2: Database Setup

```bash
# Create MySQL database
mysql -u root -p
```

```sql
CREATE DATABASE workflow_ai;
USE workflow_ai;
```

### Step 3: Configure Environment

Verify `.env.development.local` exists with:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=workflow_ai
DB_USER=root
DB_PASSWORD=password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 4: Seed Database

```bash
pnpm seed
```

**Output:**
```
[SEED] Starting database seed...
[SEED] Database synced
[SEED] Created roles
[SEED] Created departments
[SEED] Created designations
[SEED] Created test users
[SEED] Created employees
[SEED] Created additional employees
[SEED] Created projects
[SEED] Created tasks
[SEED] Created attendance records
[SEED] Created DSR records
[SEED] Created leave records
[SEED] Created announcements
[SEED] Database seeding completed successfully!
[SEED] Test Credentials:
  Super Admin: superadmin / Hbeonlabs@2026
  Admin: admin / Hbeonlabs@2026
  Manager: manager / Hbeonlabs@2026
  Employee: employee / Hbeonlabs@2026
```

### Step 5: Start Development Servers

```bash
# Run both frontend and backend
pnpm dev
```

**Expected Output:**
```
Terminal 1: 
  ▲ Next.js 16.2.6
  - Local: http://localhost:3004

Terminal 2:
  [SERVER] WorkFlow AI Backend running on http://localhost:5001
  [DATABASE] Connected and synced successfully
```

### Step 6: Login

1. Open http://localhost:3004 in your browser
2. Use any test credentials above
3. You'll be redirected to the dashboard

## Detailed Setup (with explanations)

### MySQL Installation & Configuration

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mysql-server
sudo mysql_secure_installation
sudo systemctl start mysql
```

**Windows:**
- Download MySQL installer: https://dev.mysql.com/downloads/windows/installer/
- Follow installation wizard
- Start MySQL Service

**Verify Installation:**
```bash
mysql --version
mysql -u root -p  # Should prompt for password
```

### Node.js & pnpm Setup

**Install Node.js:**
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from: https://nodejs.org/
```

**Install pnpm:**
```bash
npm install -g pnpm
pnpm --version  # Should show version
```

### Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| DB_HOST | MySQL server address | localhost |
| DB_PORT | MySQL server port | 3306 |
| DB_NAME | Database name | workflow_ai |
| DB_USER | MySQL username | root |
| DB_PASSWORD | MySQL password | password |
| PORT | Express server port | 5000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | Token signing key | random-string-min-32-chars |
| NEXT_PUBLIC_API_URL | Frontend API endpoint | http://localhost:5000/api |

### What the Seed Script Does

The `pnpm seed` command:

1. **Creates Database Tables** - 14 Sequelize models synced to MySQL
2. **Inserts Test Data:**
   - 4 test user accounts (one per role)
   - 5 departments with managers
   - 9 job designations
   - 10 additional employees
   - 3 projects with team members
   - 3 tasks across projects
   - 15 attendance records
   - 10 DSR submissions
   - 5 leave requests
   - 2 announcements

3. **Ready for Testing** - All data properly linked via foreign keys

## Running Separate Servers

If `pnpm dev` doesn't work or you prefer separate terminals:

**Terminal 1 - Frontend:**
```bash
pnpm dev:frontend
# Starts: http://localhost:
```

**Terminal 2 - Backend:**
```bash
pnpm dev:backend
# Starts: http://localhost:5000
```

**Terminal 3 - Optional: Monitor Backend Logs**
```bash
tail -f /tmp/backend.log
```

## Testing the API

Once backend is running, test endpoints:

```bash
# Test health check
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Hbeonlabs@2026"}'

# Response:
# {"token":"eyJhbGc...","user":{...}}
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# If error, restart MySQL
sudo systemctl restart mysql        # Linux
brew services restart mysql         # macOS
# Windows: Services app → MySQL Server → Restart
```

### Issue: "Port 3004 or 5001 already in use"

**Solution:**
```bash
# Find what's using the port
lsof -i :3004    # Frontend
lsof -i :5001    # Backend

# Kill the process
kill -9 <PID>

# Or change port in .env:
PORT=5001  # Use different port
```

### Issue: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue: "Database already exists"

**Solution:**
```sql
DROP DATABASE workflow_ai;
CREATE DATABASE workflow_ai;
```

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           BROWSER (http://localhost:3004)       │
│                 Next.js Frontend                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Login Page → Protected Dashboard       │   │
│  │  • Sidebar Navigation (Role-based)      │   │
│  │  • Header with User Menu                │   │
│  │  • Dashboard Widgets                    │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ HTTP/REST API
                 │ (JWT Token Auth)
                 ▼
┌──────────────────────────────────────────────┐
│    SERVER (http://localhost:5000)             │
│         Express.js Backend                    │
│  ┌──────────────────────────────────────┐   │
│  │  API Routes (Express):               │   │
│  │  • /api/auth         (Login/Logout)  │   │
│  │  • /api/employees    (CRUD)          │   │
│  │  • /api/attendance   (Check-in/out)  │   │
│  │  • /api/tasks        (Task Mgmt)     │   │
│  │  • /api/projects     (Project Mgmt)  │   │
│  │  • /api/dsr          (Reports)       │   │
│  │  • /api/leaves       (Leave Mgmt)    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Middleware:                         │   │
│  │  • JWT Verification                  │   │
│  │  • Role-based Access Control         │   │
│  │  • Error Handling                    │   │
│  └──────────────────────────────────────┘   │
└───────────────┬───────────────────────────────┘
                │ SQL Queries
                │ (Sequelize ORM)
                ▼
┌──────────────────────────────────────────────┐
│    DATABASE (localhost:3306)                  │
│          MySQL workflow_ai                    │
│  ┌──────────────────────────────────────┐   │
│  │  Tables:                             │   │
│  │  • users           (Authentication)  │   │
│  │  • employees       (Master Data)     │   │
│  │  • attendance      (Daily Records)   │   │
│  │  • tasks           (Task Mgmt)       │   │
│  │  • projects        (Project Data)    │   │
│  │  • dsr             (Status Reports)  │   │
│  │  • leaves          (Leave Requests)  │   │
│  │  ... (7 more tables)                 │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## File Structure Quick Reference

```
app/
  ├── (auth)/login/              # Login page
  ├── (dashboard)/               # Protected routes
  │   ├── page.tsx              # Main dashboard
  │   └── layout.tsx            # Dashboard layout
  ├── layout.tsx                # Root layout
  └── globals.css               # Global styles

components/
  └── layout/
      ├── Sidebar.tsx           # Navigation sidebar
      └── Header.tsx            # Top navbar

lib/
  ├── api-client.ts             # API communication
  ├── auth-context.tsx          # Auth state
  └── types.ts                  # TypeScript types

server/
  ├── server.js                 # Entry point
  ├── config/
  │   ├── database.js           # DB config
  │   └── constants.js          # Enums
  ├── models/                   # ORM models
  ├── routes/                   # API routes
  ├── controllers/              # Business logic
  ├── middleware/               # Auth, errors
  ├── utils/                    # Helpers
  └── seeds/                    # DB seed script
```

## Security Notes

⚠️ **Before Production:**

1. **Change JWT Secret:**
   ```env
   JWT_SECRET=<generate-random-32-char-string>
   ```

2. **Use Environment-Specific Passwords:**
   ```env
   DB_PASSWORD=<strong-production-password>
   ```

3. **Enable HTTPS:**
   - Deploy with SSL certificates
   - Use secure cookie flags
   - Set CORS restrictions

4. **Rate Limiting:**
   - Add request rate limiting
   - Implement DDoS protection

5. **Database Backups:**
   - Set up automated backups
   - Test restore procedures

## Next Steps After Setup

1. **Explore Test Accounts:**
   - Login with each role
   - Notice different dashboards
   - Check role-based sidebar

2. **Test API Endpoints:**
   - Use Postman or curl
   - Test CRUD operations
   - Verify authentication

3. **Extend Features:**
   - Add more pages (attendance, tasks, etc.)
   - Implement real-time notifications
   - Add file uploads
   - Build reports

4. **Deploy:**
   - Push to GitHub
   - Deploy frontend to Vercel
   - Deploy backend to Render/Railway
   - Connect to cloud MySQL

## Support Resources

- Next.js Docs: https://nextjs.org/docs
- Express Docs: https://expressjs.com
- Sequelize Docs: https://sequelize.org
- MySQL Docs: https://dev.mysql.com/doc
- API Testing: https://www.postman.com

## Common Commands Reference

```bash
# Development
pnpm dev              # Run both servers
pnpm dev:frontend     # Frontend only
pnpm dev:backend      # Backend only

# Database
pnpm seed             # Seed database with test data

# Building
pnpm build            # Build for production
pnpm start            # Start production server

# Utilities
pnpm lint             # Check code quality
```

---

## CI/CD: Automatic Deployment on Git Push

We have integrated a professional **GitHub Actions** CI/CD pipeline and **PM2 Process Manager** configuration into the project. When you push to your Git repository (GitHub/GitLab), the server will automatically pull the code, install dependencies, compile the application, and trigger a zero-downtime hot-restart.

### 1. PM2 Orchestration (`ecosystem.config.js`)
We use `ecosystem.config.js` to manage both the Next.js client and Express.js backend as concurrent processes on your production Linux server:
- **`ems-backend`**: Runs the Express API on port `5001`.
- **`ems-frontend`**: Runs the Next.js production server on port `3004`.

To start them on your server manually using PM2:
```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start both servers in production mode
pm2 start ecosystem.config.js --env production

# Check status of the applications
pm2 status

# Set PM2 to automatically start on server reboot
pm2 startup
pm2 save
```

### 2. Configure GitHub Actions Workflow
The workflow file `.github/workflows/deploy.yml` triggers automatically on every push to the `main` or `master` branch.

To enable this:
1. Open your GitHub Repository and go to **Settings** > **Secrets and variables** > **Actions**.
2. Add the following **Repository Secrets**:
   - **`SERVER_HOST`**: The IP address or domain name of your deployment server (e.g. `15.206.184.22`).
   - **`SERVER_USER`**: The SSH username of the server (e.g. `ubuntu`, `root`).
   - **`SSH_PRIVATE_KEY`**: Your server's private SSH key (value of `id_rsa`).
   - **`SERVER_PORT`**: *(Optional)* The SSH port if different from default `22` (e.g. `2201`).

3. Once configured, simply run:
   ```bash
   git add .
   git commit -m "Configure auto deployment pipeline"
   git push origin main
   ```
   GitHub Actions will instantly spin up a runner, connect to your server, pull the latest commits, build Next.js, and restart PM2 gracefully!

---

**Ready to go!** You now have a fully functional Employee Management System running locally with production-ready AI Face Verification and CI/CD pipelines. Happy coding!

