const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      values: [
        'TaskAssigned',
        'TaskCompleted',
        'DSRReminder',
        'AttendanceReminder',
        'LeaveApproved',
        'SystemAnnouncement',
      ],
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'notifications',
    indexes: [
      { fields: ['userId'] },
      { fields: ['read'] },
      { fields: ['createdAt'] },
      { fields: ['userId', 'read'] },
    ],
  }
);

module.exports = Notification;
