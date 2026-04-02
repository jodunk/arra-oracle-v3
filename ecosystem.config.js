module.exports = {
  apps: [
    {
      name: 'oracle-backend',
      script: 'src/server.ts',
      interpreter: 'bun',
      cwd: '/Users/jodunk/.local/share/arra-oracle-v3',
      env: {
        ORACLE_PORT: 47778,
        ORACLE_DATA_DIR: '/Users/jodunk/.arra-oracle-v3',
        ORACLE_DB_PATH: '/Users/jodunk/.local/share/arra-oracle-v3/oracle.db',
        ORACLE_VECTOR_DB: 'lancedb',
      },
      error_file: '/Users/jodunk/.local/share/arra-oracle-v3/logs/pm2-backend-error.log',
      out_file: '/Users/jodunk/.local/share/arra-oracle-v3/logs/pm2-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'oracle-frontend',
      script: 'bun',
      args: 'run dev',
      cwd: '/Users/jodunk/.local/share/arra-oracle-v3/frontend',
      env: {
        ORACLE_API_URL: 'http://localhost:47778',
      },
      error_file: '/Users/jodunk/.local/share/arra-oracle-v3/logs/pm2-frontend-error.log',
      out_file: '/Users/jodunk/.local/share/arra-oracle-v3/logs/pm2-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
