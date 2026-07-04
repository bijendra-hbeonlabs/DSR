const { sequelize, User, Employee, Task, DSR, Attendance, Leave, Project } = require('../models');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleName = req.user.role.name;

    let stats = {};

    if (roleName === 'SUPER_ADMIN') {
      // Super Admin stats
      stats = {
        totalUsers: await User.count(),
        totalEmployees: await Employee.count(),
        totalProjects: await Project.count(),
        activeProjects: await Project.count({ where: { status: 'Active' } }),
        pendingDSRs: await DSR.count({ where: { status: 'Submitted' } }),
        pendingLeaves: await Leave.count({ where: { status: 'Applied' } }),
      };
    } else if (roleName === 'ADMIN') {
      // Admin stats
      stats = {
        totalEmployees: await Employee.count(),
        totalProjects: await Project.count(),
        activeProjects: await Project.count({ where: { status: 'Active' } }),
        todaysPresentCount: await Attendance.count({
          where: {
            date: new Date().toISOString().split('T')[0],
            status: { [Op.in]: ['Present', 'Late', 'Remote', 'WFH'] },
          },
        }),
        pendingDSRs: await DSR.count({ where: { status: 'Submitted' } }),
        overdueTasks: await Task.count({
          where: {
            dueDate: { [Op.lt]: new Date() },
            status: { [Op.ne]: 'Completed' },
          },
        }),
        pendingLeaves: await Leave.count({ where: { status: 'Applied' } }),
      };
    } else if (roleName === 'MANAGER') {
      // Manager stats
      const employee = await Employee.findOne({ where: { userId } });
      stats = {
        teamSize: await Employee.count({ where: { managerId: userId } }),
        myTasks: await Task.count({ where: { assignedTo: userId } }),
        myPendingDSRs: await DSR.count({
          where: {
            employeeId: employee?.id,
            status: 'Draft',
          },
        }),
        teamPendingDSRs: await DSR.count({
          where: {
            employeeId: { [Op.in]: await Employee.findAll({ where: { managerId: userId }, attributes: ['id'] }).then(e => e.map(emp => emp.id)) },
            status: 'Submitted',
          },
        }),
      };
    } else if (roleName === 'EMPLOYEE') {
      // Employee stats
      const employee = await Employee.findOne({ where: { userId } });
      stats = {
        myTasks: await Task.count({ where: { assignedTo: userId } }),
        completedTasks: await Task.count({
          where: { assignedTo: userId, status: 'Completed' },
        }),
        myProjects: (await sequelize.query(
          `SELECT COUNT(DISTINCT pm.projectId) as count FROM project_members pm WHERE pm.userId = ?`,
          {
            replacements: [userId],
            type: sequelize.QueryTypes.SELECT,
          }
        ))[0]?.count || 0,
        todaysDSRDraft: employee ? await DSR.count({
          where: {
            employeeId: employee.id,
            date: new Date().toISOString().split('T')[0],
            status: 'Draft',
          },
        }) : 0,
      };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
  }
};

module.exports = {
  getDashboardStats,
};
