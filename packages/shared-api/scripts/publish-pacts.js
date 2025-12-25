#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function publishPacts() {
  const broker = process.env.PACT_BROKER_BASE_URL;
  const token = process.env.PACT_BROKER_TOKEN;
  const version = process.env.GITHUB_SHA || process.env.BUILD_VERSION || '0.0.0';

  if (!broker) {
    console.error('PACT_BROKER_BASE_URL not set; skipping publish');
    process.exit(0);
  }

  const pactsDir = path.resolve(process.cwd(), 'packages/shared-api/pacts');
  if (!fs.existsSync(pactsDir)) {
    console.error('No pacts found (directory missing):', pactsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(pactsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No pact files to publish in', pactsDir);
    process.exit(1);
  }

  const results = [];

  // Tags to apply: from env.PACT_BROKER_TAGS (csv) or derive from GITHUB_REF_NAME
  const tagsRaw = process.env.PACT_BROKER_TAGS || process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || '';
  const tags = tagsRaw ? tagsRaw.split(/[,\/]/).filter(Boolean).slice(0, 5) : [];
  const buildId = process.env.GITHUB_RUN_ID || process.env.BUILD_ID || process.env.GITHUB_SHA || 'unknown';

  async function publishTag(consumer, version, tag) {
    const tagUrl = `${broker.replace(/\/$/, '')}/pacticipants/${encodeURIComponent(consumer)}/versions/${encodeURIComponent(version)}/tags/${encodeURIComponent(tag)}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const r = await fetch(tagUrl, { method: 'PUT', headers });
      const body = await r.text();
      return { tag, url: tagUrl, status: r.status, ok: r.ok, response: body };
    } catch (err) {
      return { tag, url: tagUrl, ok: false, error: err.message || String(err) };
    }
  }

  for (const file of files) {
    const filePath = path.join(pactsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse pact file', filePath, e.message);
      process.exit(1);
    }
    const consumer = json.consumer && json.consumer.name;
    const provider = json.provider && json.provider.name;
    if (!consumer || !provider) {
      console.error('Invalid pact file (missing consumer/provider)', filePath);
      process.exit(1);
    }

    const url = `${broker.replace(/\/$/, '')}/pacts/provider/${encodeURIComponent(provider)}/consumer/${encodeURIComponent(consumer)}/version/${encodeURIComponent(version)}`;

    console.log('Publishing', file, 'to', url);

    const headers = { 'Content-Type': 'application/json', 'X-BUILD-ID': buildId };
    // Support Bearer token OR Basic auth (username/password)
    const username = process.env.PACT_BROKER_USERNAME;
    const password = process.env.PACT_BROKER_PASSWORD;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (username && password) {
      const creds = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${creds}`;
    }
    // Optional metadata (JSON string) will be forwarded as a header for Broker processing
    if (process.env.PACT_BROKER_METADATA) {
      headers['X-Pact-Metadata'] = process.env.PACT_BROKER_METADATA;
    }

    try {
      const res = await fetch(url, { method: 'POST', body: content, headers });
      const text = await res.text();
      const result = { file, url, status: res.status, ok: res.ok, response: text, tags: [], metadata: null };
      // If published successfully, handle metadata (strategy: header/body/participant_meta)
      if (res.ok && process.env.PACT_BROKER_METADATA) {
        try {
          const strategy = (process.env.PACT_BROKER_METADATA_STRATEGY || 'header').toLowerCase();
          const meta = JSON.parse(process.env.PACT_BROKER_METADATA);
          result.metadata = { strategy };

          if (strategy === 'body') {
            // Some brokers may accept a wrapper with metadata; not standard across all brokers
            // Allow overriding the endpoint via PACT_BROKER_META_ENDPOINT environment variable
            const metaEndpoint = process.env.PACT_BROKER_META_ENDPOINT || url;
            const wrapper = JSON.stringify({ pact: JSON.parse(content), metadata: meta });
            const headersForBody = { 'Content-Type': 'application/json' };
            if (token) headersForBody['Authorization'] = `Bearer ${token}`;
            else if (username && password) headersForBody['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
            const r2 = await fetch(metaEndpoint, { method: 'POST', body: wrapper, headers: headersForBody });
            const btext = await r2.text();
            result.metadata.body = { endpoint: metaEndpoint, status: r2.status, ok: r2.ok, response: btext };
            if (!r2.ok) console.error('Metadata body upload failed for', file, r2.status, btext);
          } else if (strategy === 'participant_meta') {
            // PUT to /pacticipants/{consumer}/versions/{version}/metadata
            const defaultMetaUrl = `${broker.replace(/\/$/, '')}/pacticipants/${encodeURIComponent(consumer)}/versions/${encodeURIComponent(version)}/metadata`;
            const metaUrl = process.env.PACT_BROKER_PARTICIPANT_META_ENDPOINT || defaultMetaUrl;
            const headersForMeta = { 'Content-Type': 'application/json' };
            if (token) headersForMeta['Authorization'] = `Bearer ${token}`;
            else if (username && password) headersForMeta['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
            // Allow metadata mapping (pass-through by default)
            const metaPayload = meta;
            const r3 = await fetch(metaUrl, { method: 'PUT', body: JSON.stringify(metaPayload), headers: headersForMeta });
            const mtext = await r3.text();
            result.metadata.participant_meta = { endpoint: metaUrl, status: r3.status, ok: r3.ok, response: mtext };
            if (!r3.ok) console.error('Participant meta upload failed for', file, r3.status, mtext);
          } else {
            // header strategy was already sent as X-Pact-Metadata header
            result.metadata.header = { sent: true };
          }
        } catch (err) {
          console.error('Failed to process PACT_BROKER_METADATA for', file, err.message || err);
          result.metadata = { error: err.message || String(err) };
        }
      }

      // If published successfully, try tagging
      if (res.ok && tags.length > 0) {
        for (const t of tags) {
          const tagRes = await publishTag(consumer, version, t);
          result.tags.push(tagRes);
        }
      }
      results.push(result);
      if (!res.ok) {
        console.error('Failed to publish pact', file, 'status', res.status, text);
      } else {
        console.log('Published', file, 'tags:', tags.join(',') || '(none)');
      }
    } catch (err) {
      console.error('Error publishing pact', file, err.message || err);
      results.push({ file, url, ok: false, error: err.message || String(err) });
    }
  }

  const outPath = path.resolve(process.cwd(), 'packages/shared-api/pacts/publish-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ version, buildId, tags, results }, null, 2));
  console.log('Publish results written to', outPath);

  const failed = results.find((r) => !r.ok || (r.tags && r.tags.find((t) => !t.ok)));
  if (failed) {
    console.error('One or more pacts failed to publish or tag. See', outPath);
    process.exit(1);
  }

  console.log('All pacts published successfully');
}

publishPacts().catch((err) => {
  console.error(err);
  process.exit(1);
});
