require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const updateRouter = require('./infrastructure/web/routes/update');
const logsRouter = require('./infrastructure/web/routes/logs');
// const crashReportsRouter = require('./infrastructure/web/routes/crashReports');
// const releaseRouter = require('./infrastructure/web/routes/releases');

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'file://' // For Electron apps
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Electron)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('file://')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Platform'],
  exposedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for downloads
app.use('/downloads', express.static(path.join(__dirname, '../uploads/releases')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'codeagentswarm-backend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/update', updateRouter);
app.use('/api/logs', logsRouter);
// app.use('/api/crash-reports', crashReportsRouter);
// app.use('/api/releases', releaseRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`CodeAgentSwarm Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});