import type { ConfigValue } from './types';

export interface RemoteProvider {
  fetch: () => Promise<Record<string, ConfigValue>>;
}

export class StubRemoteProvider implements RemoteProvider {
  constructor(private data: Record<string, ConfigValue> = {}) {}
  async fetch() {
    // simulate remote fetch
    return this.data;
  }
}
