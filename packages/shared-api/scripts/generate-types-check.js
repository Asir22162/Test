#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '..', 'src', 'types.generated.ts');
const dest = path.resolve(__dirname, '..', 'src', 'types.ts');
try {
  execSync('npx openapi-typescript openapi.yaml --output ' + out, { stdio: 'inherit' });
} catch (e) {
  console.error('openapi-typescript failed', e && e.message);
  process.exit(1);
}
let generated;
try { generated = fs.readFileSync(out, 'utf8'); } catch (e) { console.error('Failed to read generated types', e); process.exit(1); }
let existing = null;
try { existing = fs.readFileSync(dest, 'utf8'); } catch (e) { /* missing existing file means fail */ existing = null; }
if (existing === null || generated !== existing) {
  try { fs.unlinkSync(out); } catch (e) {}
  console.error('Generated types differ from committed types. Run "pnpm --filter packages/shared-api... run generate-types" and commit the result.');
  process.exit(1);
} else {
  try { fs.unlinkSync(out); } catch (e) {}
  process.exit(0);
}