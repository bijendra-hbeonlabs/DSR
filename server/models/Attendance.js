const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define(
  'Attendance',
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
    checkInTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    checkOutTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Present',
      values: ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday', 'Leave', 'Remote', 'WFH'],
    },
    workingHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'attendance',
    indexes: [
      { fields: ['employeeId', 'date'], unique: true },
      { fields: ['employeeId'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['employeeId', 'date', 'status'] },
    ],
  }
);

module.exports = Attendance;
