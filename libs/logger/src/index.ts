import { v4 as uuidv4 } from 'uuid';
import type { LogLevel, LogMeta, LoggerOptions } from './types';
import { ConsoleBackend, JsonBackend } from './backends';

export class Logger {
  private backend: any;
  private opts: LoggerOptions;

  constructor(opts?: LoggerOptions & { backend?: any }) {
    this.opts = { level: 'info', sampleRate: 1, ...opts } as any;
    this.backend = opts?.backend ?? new ConsoleBackend();
  }

  private shouldLog(): boolean {
    return Math.random() < (this.opts.sampleRate ?? 1);
  }

  private baseMeta(meta?: LogMeta) {
    return { service: this.opts.service, traceId: meta?.traceId ?? uuidv4(), ...meta };
  }

  log(level: LogLevel, msg: string, meta?: LogMeta) {
    if (!this.shouldLog()) return;
    this.backend.log(level, msg, this.baseMeta(meta));
  }

  debug(msg: string, meta?: LogMeta) {
    this.log('debug', msg, meta);
  }
  info(msg: string, meta?: LogMeta) {
    this.log('info', msg, meta);
  }
  warn(msg: string, meta?: LogMeta) {
    this.log('warn', msg, meta);
  }
  error(msg: string, meta?: LogMeta) {
    this.log('error', msg, meta);
  }
}
