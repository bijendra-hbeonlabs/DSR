const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Announcement = sequelize.define(
  'Announcement',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    postedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'Normal',
      values: ['Low', 'Normal', 'High', 'Urgent'],
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'announcements',
    indexes: [
      { fields: ['postedBy'] },
      { fields: ['departmentId'] },
      { fields: ['createdAt'] },
      { fields: ['expiryDate'] },
    ],
  }
);

module.exports = Announcement;
