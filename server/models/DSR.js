const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DSR = sequelize.define(
  'DSR',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    taskIds: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    completionPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'Medium',
      values: ['Low', 'Medium', 'High', 'Critical'],
    },
    workDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issues: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tomorrowsPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    customProjectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    module: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hoursWorked: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Draft',
      values: ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected'],
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewComments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'dsr',
    indexes: [
      { fields: ['employeeId'] },
      { fields: ['projectId'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['reviewedBy'] },
      { fields: ['employeeId', 'date'] },
      { fields: ['status', 'date'] },
    ],
  }
);

module.exports = DSR;
