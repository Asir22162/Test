export interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  body?: any;
  method?: string;
}

export interface Signer {
  sign: (method: string, path: string, body?: any) => Promise<{ headers: Record<string, string> }>; 
}
