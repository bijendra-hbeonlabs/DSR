const { Sequelize } = require('sequelize');

let sequelize;
const dialect = process.env.DB_DIALECT || 'mysql';

if (dialect === 'sqlite') {
  console.log('[DATABASE] Initializing SQLite connection pool.');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true
    }
  });
} else {
  console.log('[DATABASE] Initializing MySQL connection pool.');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hbeonlabs_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 20,
        min: 5,
        acquire: 60000,
        idle: 30000,
        evict: 1000,
      },
      dialectOptions: {
        connectTimeout: 10000,
        charset: 'utf8mb4_unicode_ci',
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    }
  );
}

module.exports = sequelize;
