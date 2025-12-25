export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  service?: string;
  traceId?: string;
  [key: string]: any;
}

export interface LoggerOptions {
  level?: LogLevel;
  service?: string;
  sampleRate?: number; // 0..1
}
