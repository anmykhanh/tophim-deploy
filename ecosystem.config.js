module.exports = {
  apps: [
    {
      name: "hubphim",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // Sử dụng toàn bộ 4 Core của VPS
      exec_mode: "cluster", // Chạy dạng cluster để nhân 4 hiệu năng chịu tải
      watch: false,
      max_memory_restart: "1G", // Chống tràn RAM
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
