const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define(
  'Task',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Pending',
      values: ['Pending', 'InProgress', 'Completed', 'Closed'],
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'Medium',
      values: ['Low', 'Medium', 'High', 'Critical'],
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    actualHours: {
      type: DataTypes.DECIMAL(8, 2),
      defaultValue: 0,
    },
    progressPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    comments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    checklist: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    taskType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Development',
    },
    techStack: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    tableName: 'tasks',
    indexes: [
      { fields: ['projectId'] },
      { fields: ['assignedTo'] },
      { fields: ['assignedBy'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['dueDate'] },
      { fields: ['projectId', 'status'] },
    ],
  }
);

module.exports = Task;
