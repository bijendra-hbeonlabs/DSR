const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Department = require('./Department');
const Designation = require('./Designation');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const DSR = require('./DSR');
const Leave = require('./Leave');
const Announcement = require('./Announcement');
const Notification = require('./Notification');

// Define associations
// User associations
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
User.hasOne(Employee, { foreignKey: 'userId', as: 'employee' });

// Department associations
Department.belongsTo(User, { foreignKey: 'headId', as: 'head' });
Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
Department.hasMany(Designation, { foreignKey: 'departmentId', as: 'designations' });

// Designation associations
Designation.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Designation.hasMany(Employee, { foreignKey: 'designationId', as: 'employees' });

// Employee associations
Employee.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Employee.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });
Employee.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });
Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendances' });
Employee.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Employee.hasMany(DSR, { foreignKey: 'employeeId', as: 'dsrs' });
Employee.hasMany(Leave, { foreignKey: 'employeeId', as: 'leaves' });

// Attendance associations
Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Project associations
Project.belongsTo(User, { foreignKey: 'teamLeadId', as: 'teamLead' });
Project.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members' });
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Project.hasMany(DSR, { foreignKey: 'projectId', as: 'dsrs' });

// ProjectMember associations
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Task associations
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'assignedBy', as: 'createdBy' });

// DSR associations
DSR.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
DSR.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
DSR.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

// Leave associations
Leave.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Leave.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Announcement associations
Announcement.belongsTo(User, { foreignKey: 'postedBy', as: 'postedByUser' });
Announcement.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Role,
  User,
  Department,
  Designation,
  Employee,
  Attendance,
  Project,
  ProjectMember,
  Task,
  DSR,
  Leave,
  Announcement,
  Notification,
};
