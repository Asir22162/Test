import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('shared-api contract skeleton', () => {
  it('has openapi file with /products and /orders', async () => {
    const yaml = fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
    expect(yaml).toContain('/products:');
    expect(yaml).toContain('/orders:');
  });
});