const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Appraisal = sequelize.define(
  'Appraisal',
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
      onDelete: 'CASCADE'
    },
    techRating: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    commRating: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    leadRating: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    deliveryRating: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    overallRating: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    remarks: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    goals: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  },
  {
    timestamps: true,
    tableName: 'appraisals',
  }
);

module.exports = Appraisal;
