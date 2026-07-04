const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Designation = sequelize.define(
  'Designation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id',
      },
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    timestamps: true,
    tableName: 'designations',
  }
);

module.exports = Designation;
