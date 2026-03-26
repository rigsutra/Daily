module.exports = {
  apps: [
    {
      name: 'daily-backend',
      script: './dist/index.js',
      cwd: '/root/apps/daily/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/root/logs/daily-backend-error.log',
      out_file: '/root/logs/daily-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
}
