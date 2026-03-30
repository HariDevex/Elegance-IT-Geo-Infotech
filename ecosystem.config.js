module.exports = {
  apps: [
    {
      name: "elegance-backend",
      script: "server/index.js",
      cwd: "/mnt/663EE6F93EE6C0E3/Developer/006/Elegance1",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        HOST: "0.0.0.0",
      },
      error_file: "/home/mrnobody/.pm2/logs/elegance-backend-error.log",
      out_file: "/home/mrnobody/.pm2/logs/elegance-backend-out.log",
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
    },
    {
      name: "elegance-frontend",
      script: "npx",
      args: "serve dist -l 8080 -s .",
      cwd: "/mnt/663EE6F93EE6C0E3/Developer/006/Elegance1/Frontend",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/home/mrnobody/.pm2/logs/elegance-frontend-error.log",
      out_file: "/home/mrnobody/.pm2/logs/elegance-frontend-out.log",
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
