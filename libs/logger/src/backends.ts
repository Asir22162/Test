import type { LogLevel, LogMeta } from './types';

export interface LogBackend {
  log: (level: LogLevel, msg: string, meta?: LogMeta) => void;
}

export class ConsoleBackend implements LogBackend {
  log(level: LogLevel, msg: string, meta?: LogMeta) {
    const metaStr = meta ? JSON.stringify(meta) : '';
    switch (level) {
      case 'debug':
      case 'info':
        console.log(`[${level}] ${msg} ${metaStr}`);
        break;
      case 'warn':
        console.warn(`[${level}] ${msg} ${metaStr}`);
        break;
      case 'error':
        console.error(`[${level}] ${msg} ${metaStr}`);
        break;
    }
  }
}

export class JsonBackend implements LogBackend {
  log(level: LogLevel, msg: string, meta?: LogMeta) {
    const payload = { ts: new Date().toISOString(), level, msg, ...meta };
    console.log(JSON.stringify(payload));
  }
}
