module.exports = {
  apps: [
    {
      name: 'ems-backend',
      script: './server/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      }
    },
    {
      name: 'ems-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3004',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    }
  ]
};
