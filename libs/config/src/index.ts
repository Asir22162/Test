import type { ConfigSchema } from './types';
import type { RemoteProvider } from './remoteProvider';

export class ConfigService<T> {
  private cached!: T;

  constructor(private schema: ConfigSchema<T>, private opts?: { remote?: RemoteProvider; envPrefix?: string }) {}

  loadFromEnv(): Record<string, any> {
    const prefix = this.opts?.envPrefix ? `${this.opts.envPrefix}_` : '';
    const raw: Record<string, any> = {};
    for (const key of Object.keys(process.env)) {
      if (!key.startsWith(prefix)) continue;
      const short = key.substring(prefix.length);
      raw[short] = process.env[key] as any;
    }
    return raw;
  }

  async load(): Promise<T> {
    const envRaw = this.loadFromEnv();
    let merged: Record<string, any> = { ...envRaw };
    if (this.opts?.remote) {
      const remote = await this.opts.remote.fetch();
      // remote values have lower priority than env
      merged = { ...remote, ...merged };
    }
    this.cached = this.schema.parse(merged);
    return this.cached;
  }

  get(): T {
    if (!this.cached) throw new Error('Config not loaded yet');
    return this.cached;
  }
}
