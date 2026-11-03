// Secrets (MONGODB_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, ...) are NOT kept here.
// They are loaded from the server's untracked .env file by dotenv in server.js.
module.exports = {
  apps: [{
    name: 'backend',
    script: 'server.js',
    cwd: '/root/MTC_Backend',
    instances: 1,
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    }
  }]
};
