/**
 * Winston logger configured for the thumbnail_generator service.
 */

const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'thumbnail_generator' },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    config.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
            const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
            return `${timestamp} [${service}] ${level}: ${message}${extra}`;
          }),
        ),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
