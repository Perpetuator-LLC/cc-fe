// PM2 Ecosystem Configuration for Angular SSR
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Deployment: Copy this file to /var/www/capital-copilot-fe/ alongside dist/
// Start: pm2 start ecosystem.config.cjs
//
const path = require('path');

// Base directory - works whether running from project root or deployed location
const baseDir = __dirname;

module.exports = {
  apps: [
    {
      name: 'capital-copilot-fe',
      script: path.join(baseDir, 'server/server.mjs'),
      cwd: baseDir,
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Restart if memory exceeds 500MB
      max_memory_restart: '500M',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(baseDir, 'logs/pm2-error.log'),
      out_file: path.join(baseDir, 'logs/pm2-out.log'),
      merge_logs: true,
      // Graceful restart
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};

