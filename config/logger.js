import winston from 'winston';
import { format, transports } from 'winston';

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Console transport (for development)
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({ level, message, timestamp, ...metadata }) => 
            `${timestamp} [${level}]: ${message} ${JSON.stringify(metadata)}`
        )
      )
    }),
    // File transport (for production)
    new transports.File({ 
      filename: 'logs/combined.log',
      level: 'info'
    }),
    new transports.File({
      filename: 'logs/errors.log',
      level: 'error'
    })
  ]
});

// Create a method for specific module logging
export const createLogger = (moduleName) => {
  return {
    info: (message, meta) => logger.info(`[${moduleName}] ${message}`, meta),
    warn: (message, meta) => logger.warn(`[${moduleName}] ${message}`, meta),
    error: (message, meta) => logger.error(`[${moduleName}] ${message}`, meta),
    debug: (message, meta) => logger.debug(`[${moduleName}] ${message}`, meta)
  };
};

export default logger;