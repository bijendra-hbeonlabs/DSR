const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, Role, User, Department, Designation, Employee, Project, Task, Attendance, DSR, Leave, Announcement } = require('../models');
const { hashPassword } = require('../utils/passwordUtils');

const seedDatabase = async () => {
  try {
    console.log('[SEED] Starting database seed...');

    // Sync database
    await sequelize.sync({ force: true });
    console.log('[SEED] Database synced');

    // Create Roles
    const roles = await Role.bulkCreate([
      { name: 'SUPER_ADMIN', permissions: ['*'] },
      { name: 'ADMIN', permissions: ['employees', 'projects', 'tasks', 'attendance', 'dsr', 'leaves', 'departments'] },
      { name: 'MANAGER', permissions: ['team_tasks', 'team_attendance', 'team_dsr', 'my_profile'] },
      { name: 'EMPLOYEE', permissions: ['my_tasks', 'my_attendance', 'my_dsr', 'my_profile'] },
    ]);
    console.log('[SEED] Created roles');

    // Create Departments
    const departments = await Department.bulkCreate([
      { name: 'Engineering', description: 'Software Development Team' },
      { name: 'Design', description: 'UI/UX Design Team' },
      { name: 'Sales', description: 'Sales & Business Development' },
      { name: 'HR', description: 'Human Resources' },
      { name: 'Finance', description: 'Finance & Accounting' },
    ]);
    console.log('[SEED] Created departments');

    // Create Designations
    const designations = await Designation.bulkCreate([
      { name: 'Senior Developer', departmentId: departments[0].id },
      { name: 'Junior Developer', departmentId: departments[0].id },
      { name: 'Tech Lead', departmentId: departments[0].id },
      { name: 'Senior Designer', departmentId: departments[1].id },
      { name: 'UI Designer', departmentId: departments[1].id },
      { name: 'Sales Executive', departmentId: departments[2].id },
      { name: 'Sales Manager', departmentId: departments[2].id },
      { name: 'HR Manager', departmentId: departments[3].id },
      { name: 'Finance Manager', departmentId: departments[4].id },
    ]);
    console.log('[SEED] Created designations');

    // Create Users
    const users = await User.bulkCreate([
      {
        username: 'superadmin',
        email: 'superadmin@hbeonlabs.com',
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[0].id,
        departmentId: departments[3].id,
        active: true,
      },
      {
        username: 'admin',
        email: 'admin@hbeonlabs.com',
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[1].id,
        departmentId: departments[3].id,
        active: true,
      },
      {
        username: 'manager',
        email: 'manager@hbeonlabs.com',
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[2].id,
        departmentId: departments[0].id,
        active: true,
      },
      {
        username: 'employee',
        email: 'employee@hbeonlabs.com',
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[3].id,
        departmentId: departments[0].id,
        active: true,
      },
    ]);
    console.log('[SEED] Created test users');

    // Update department heads
    await departments[0].update({ headId: users[2].id });
    await departments[3].update({ headId: users[1].id });

    // Create Employees
    const employees = await Employee.bulkCreate([
      {
        userId: users[0].id,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@hbeonlabs.com',
        phone: '+1-555-1000',
        departmentId: departments[3].id,
        designationId: designations[7].id,
        status: 'Active',
        joinDate: new Date('2022-01-01'),
      },
      {
        userId: users[1].id,
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@hbeonlabs.com',
        phone: '+1-555-2000',
        departmentId: departments[3].id,
        designationId: designations[7].id,
        status: 'Active',
        joinDate: new Date('2022-06-01'),
      },
      {
        userId: users[2].id,
        firstName: 'John',
        lastName: 'Manager',
        email: 'john.manager@hbeonlabs.com',
        phone: '+1-555-0001',
        departmentId: departments[0].id,
        designationId: designations[2].id,
        status: 'Active',
        joinDate: new Date('2023-01-15'),
      },
      {
        userId: users[3].id,
        firstName: 'Jane',
        lastName: 'Developer',
        email: 'jane.dev@hbeonlabs.com',
        phone: '+1-555-0002',
        departmentId: departments[0].id,
        designationId: designations[0].id,
        managerId: users[2].id,
        status: 'Active',
        joinDate: new Date('2023-03-20'),
      },
    ]);
    console.log('[SEED] Created employees');

    // Create more employees for realistic data
    const moreEmployees = [];
    for (let i = 0; i < 8; i++) {
      const newUser = await User.create({
        username: `user${i}`,
        email: `user${i}@hbeonlabs.com`,
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[3].id,
        departmentId: departments[i % 5].id,
        active: true,
      });

      const newEmployee = await Employee.create({
        userId: newUser.id,
        firstName: `Employee${i}`,
        lastName: `User${i}`,
        email: `user${i}@hbeonlabs.com`,
        phone: `+1-555-000${i + 3}`,
        departmentId: departments[i % 5].id,
        designationId: designations[i % designations.length].id,
        managerId: i % 2 === 0 ? users[2].id : null,
        status: 'Active',
        joinDate: new Date(2023, Math.floor(i / 2), 15 + i),
      });
      moreEmployees.push(newEmployee);
    }
    console.log('[SEED] Created additional employees');

    // Create Projects
    const projects = await Project.bulkCreate([
      {
        name: 'Mobile App Redesign',
        description: 'Redesigning the mobile application UI/UX',
        status: 'Active',
        progress: 45,
        teamLeadId: users[2].id,
        departmentId: departments[0].id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      },
      {
        name: 'Cloud Migration',
        description: 'Migrating infrastructure to cloud',
        status: 'Active',
        progress: 65,
        teamLeadId: users[2].id,
        departmentId: departments[0].id,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31'),
      },
      {
        name: 'CRM Implementation',
        description: 'Implementing new CRM system',
        status: 'Planning',
        progress: 15,
        teamLeadId: users[2].id,
        departmentId: departments[2].id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-30'),
      },
    ]);
    console.log('[SEED] Created projects');

    // Create Tasks
    const tasks = await Task.bulkCreate([
      {
        title: 'Design homepage mockup',
        description: 'Create high-fidelity mockups for homepage',
        projectId: projects[0].id,
        assignedTo: moreEmployees[0].id,
        assignedBy: users[2].id,
        status: 'InProgress',
        priority: 'High',
        dueDate: new Date('2024-07-15'),
        startDate: new Date('2024-06-01'),
        estimatedHours: 16,
        progressPercentage: 60,
      },
      {
        title: 'API integration',
        description: 'Integrate backend APIs',
        projectId: projects[0].id,
        assignedTo: moreEmployees[1].id,
        assignedBy: users[2].id,
        status: 'Pending',
        priority: 'Critical',
        dueDate: new Date('2024-07-30'),
        estimatedHours: 24,
        progressPercentage: 0,
      },
      {
        title: 'Database schema design',
        description: 'Design efficient database schema',
        projectId: projects[1].id,
        assignedTo: moreEmployees[2].id,
        assignedBy: users[2].id,
        status: 'Completed',
        priority: 'High',
        dueDate: new Date('2024-06-20'),
        progressPercentage: 100,
      },
    ]);
    console.log('[SEED] Created tasks');

    // Create Attendance records
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
        await Attendance.create({
          employeeId: moreEmployees[i % moreEmployees.length].id,
          date: date,
          checkInTime: '09:00:00',
          checkOutTime: '18:00:00',
          status: i % 5 === 0 ? 'Absent' : 'Present',
          workingHours: 8,
        });
      }
    }
    console.log('[SEED] Created attendance records');

    // Create DSR records
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      await DSR.create({
        employeeId: moreEmployees[i % moreEmployees.length].id,
        date: date,
        projectId: projects[i % projects.length].id,
        taskIds: [tasks[i % tasks.length].id],
        startTime: '09:00:00',
        endTime: '17:00:00',
        completionPercentage: Math.floor(Math.random() * 100),
        priority: 'High',
        workDescription: `Worked on ${tasks[i % tasks.length].title}`,
        issues: i % 3 === 0 ? 'Network connectivity issue' : null,
        tomorrowsPlan: 'Continue with current task',
        status: i % 3 === 0 ? 'Approved' : i % 3 === 1 ? 'Submitted' : 'Draft',
        reviewedBy: i % 3 === 0 ? users[2].id : null,
      });
    }
    console.log('[SEED] Created DSR records');

    // Create Leave records
    for (let i = 0; i < 5; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10 + i * 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      await Leave.create({
        employeeId: moreEmployees[i].id,
        leaveType: ['Sick', 'Personal', 'Annual', 'Casual'][i % 4],
        startDate,
        endDate,
        reason: 'Personal reason',
        status: i % 2 === 0 ? 'Approved' : 'Applied',
        approvedBy: i % 2 === 0 ? users[2].id : null,
      });
    }
    console.log('[SEED] Created leave records');

    // Create Announcements
    await Announcement.bulkCreate([
      {
        title: 'Company Annual Meeting',
        content: 'Join us for our annual company meeting on July 15th',
        postedBy: users[1].id,
        departmentId: null,
        priority: 'High',
        expiryDate: new Date('2024-07-15'),
      },
      {
        title: 'New Office Policy',
        content: 'Please review the updated office policy in the HR portal',
        postedBy: users[1].id,
        departmentId: departments[3].id,
        priority: 'Normal',
        expiryDate: new Date('2024-12-31'),
      },
    ]);
    console.log('[SEED] Created announcements');

    console.log('[SEED] Database seeding completed successfully!');
    console.log('[SEED] Test Credentials:');
    console.log('  Super Admin: superadmin / Hbeonlabs@2026');
    console.log('  Admin: admin / Hbeonlabs@2026');
    console.log('  Manager: manager / Hbeonlabs@2026');
    console.log('  Employee: employee / Hbeonlabs@2026');

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('[SEED ERROR]', error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
