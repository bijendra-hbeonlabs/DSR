const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Candidate = sequelize.define(
  'Candidate',
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
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stage: {
      type: DataTypes.ENUM('Applied', 'Screened', 'Technical', 'HR', 'Offered'),
      defaultValue: 'Applied',
    },
    experience: {
      type: DataTypes.STRING,
      defaultValue: 'N/A',
    },
    interviewerScore: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 8.0,
    },
  },
  {
    timestamps: true,
    tableName: 'candidates',
  }
);

module.exports = Candidate;
