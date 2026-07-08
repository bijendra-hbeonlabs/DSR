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

    // Create Parent Departments
    const parentDepts = await Department.bulkCreate([
      { name: 'Research & Development', description: 'R&D Department' },
      { name: 'Design', description: 'UI/UX Design Team' },
      { name: 'Sales', description: 'Sales & Business Development' },
      { name: 'HR', description: 'Human Resources' },
      { name: 'Finance', description: 'Finance & Accounting' },
      { name: 'Owner', description: 'Owner & Management' },
      { name: 'Sales & Marketing', description: 'Sales & Corporate Marketing' },
    ]);

    // Create Sub Departments
    const subDepts = await Department.bulkCreate([
      { name: 'Embedded Systems', description: 'Embedded Systems Engineering', parentId: parentDepts[0].id },
      { name: 'Software Development', description: 'Software Engineering Department', parentId: parentDepts[0].id },
      { name: 'Hardware Design', description: 'Electronics & Hardware Design', parentId: parentDepts[0].id },
      { name: 'Quality Assurance', description: 'QA & Software Testing', parentId: parentDepts[0].id },
    ]);

    const departments = [...parentDepts, ...subDepts];
    console.log('[SEED] Created departments and sub-departments under R&D');

    // Create Designations
    const designations = await Designation.bulkCreate([
      { name: 'Senior Developer', departmentId: departments[8].id },
      { name: 'Junior Developer', departmentId: departments[8].id },
      { name: 'Tech Lead', departmentId: departments[8].id },
      { name: 'Senior Designer', departmentId: departments[1].id },
      { name: 'UI Designer', departmentId: departments[1].id },
      { name: 'Sales Executive', departmentId: departments[2].id },
      { name: 'Sales Manager', departmentId: departments[2].id },
      { name: 'HR Manager', departmentId: departments[3].id },
      { name: 'Finance Manager', departmentId: departments[4].id },
      { name: 'Super Admin', departmentId: departments[5].id },
      { name: 'R & D Head', departmentId: departments[0].id },
      { name: 'Embedded Firmware Developer', departmentId: departments[7].id },
      { name: 'Hardware Design Engineer', departmentId: departments[9].id },
      { name: 'QA Automation Engineer', departmentId: departments[10].id },
      { name: 'Junior QA Tester', departmentId: departments[10].id },
      { name: 'Embedded Software Engineer', departmentId: departments[7].id },
      { name: 'Lead Hardware Architect', departmentId: departments[9].id },
    ]);
    console.log('[SEED] Created designations');

    // Create Users
    const users = await User.bulkCreate([
      {
        username: 'superadmin',
        email: 'superadmin@hbeonlabs.com',
        password: await hashPassword('Hbeonlabs@2026'),
        roleId: roles[0].id,
        departmentId: departments[5].id, // Executive department
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
        departmentId: departments[8].id,
        active: true,
      },
    ]);
    console.log('[SEED] Created test users');

    // Update department heads
    await departments[0].update({ headId: users[2].id });
    await departments[3].update({ headId: users[1].id });
    await departments[5].update({ headId: users[0].id }); // CEO heads Executive department

    // Create Employees
    const employees = await Employee.bulkCreate([
      {
        userId: users[0].id,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@hbeonlabs.com',
        phone: '+1-555-1000',
        departmentId: departments[5].id, // Executive
        designationId: designations[9].id, // CEO
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
        departmentId: departments[8].id,
        designationId: designations[0].id,
        managerId: users[2].id,
        status: 'Active',
        joinDate: new Date('2023-03-20'),
      },
    ]);
    console.log('[SEED] Created employees');

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
