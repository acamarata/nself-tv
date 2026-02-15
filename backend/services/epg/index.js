const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createLogger, requestIdMiddleware } = require('../lib/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const logger = createLogger('epg');

// Security middleware
app.use(helmet());

// Environment-aware CORS configuration
const getCorsOrigin = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',');
  }

  const env = process.env.ENV || 'development';
  const baseDomain = process.env.BASE_DOMAIN || 'localhost';

  if (env === 'production') {
    return [`https://${baseDomain}`, `https://*.${baseDomain}`];
  } else if (env === 'staging') {
    return [`https://${baseDomain}`, `https://*.${baseDomain}`, 'http://localhost:3000'];
  } else {
    return [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/.*\.local\.nself\.org$/];
  }
};

// CORS middleware
app.use(cors({
  origin: getCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID tracking
app.use(requestIdMiddleware(logger));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'epg',
    timestamp: new Date().toISOString()
  });
});

// Hello World endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from epg!',
    project: 'nself-tv',
    framework: 'Express',
    version: '4.18.2'
  });
});

// Example API endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'epg',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    domain: 'local.nself.org'
  });
});

// Example POST endpoint
app.post('/api/echo', (req, res) => {
  res.json({
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  const logger = req.logger || createLogger('epg');
  logger.error('Request failed', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Graceful shutdown
const gracefulShutdown = (server) => {
  return () => {
    logger.info('Shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };
};

// Start server
const server = app.listen(PORT, () => {
  logger.info('EPG service started', {
    port: PORT,
    healthCheck: `http://localhost:${PORT}/health`,
    apiEndpoint: `http://localhost:${PORT}/api/info`,
    echoEndpoint: `http://localhost:${PORT}/api/echo`
  });
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown(server));
process.on('SIGINT', gracefulShutdown(server));