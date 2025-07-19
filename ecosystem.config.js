module.exports = {
  apps: [{
    name: 'backend',
    script: 'server.js',
    cwd: '/root/MTC_Backend',
    instances: 1,
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      MONGODB_URI: 'mongodb+srv://***REMOVED***@cluster0.iepde.mongodb.net/mohalla_tuition',
      JWT_SECRET: '***REMOVED***',
      CORS_ORIGIN: 'http://localhost:5173',
      EMAIL_USER: 'noreplymtc.2025@gmail.com',
      EMAIL_PASS: '***REMOVED***'
    }
  }]
};
