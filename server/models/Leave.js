const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Leave = sequelize.define(
  'Leave',
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
    leaveType: {
      type: DataTypes.STRING,
      allowNull: false,
      values: ['Sick', 'Personal', 'Annual', 'Casual', 'Maternity'],
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Applied',
      values: ['Applied', 'Approved', 'Rejected'],
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    appliedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: 'leaves',
    indexes: [
      { fields: ['employeeId'] },
      { fields: ['approvedBy'] },
      { fields: ['status'] },
      { fields: ['startDate'] },
      { fields: ['endDate'] },
      { fields: ['employeeId', 'status'] },
    ],
  }
);

module.exports = Leave;
