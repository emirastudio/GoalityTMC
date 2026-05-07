module.exports = {
  apps: [{
    name: "goality",
    script: "./node_modules/next/dist/bin/next",
    args: "start -p 3001",
    cwd: "/home/goality/app",
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "1G",
    autorestart: true,
    env: { NODE_ENV: "production", PORT: "3001" }
  }]
}
