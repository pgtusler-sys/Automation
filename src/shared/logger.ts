import winston from 'winston';
import { settings } from '../../config/settings';

export const logger = winston.createLogger({
  level: settings.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mortgage-automation' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'data/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'data/combined.log' }),
  ],
});
