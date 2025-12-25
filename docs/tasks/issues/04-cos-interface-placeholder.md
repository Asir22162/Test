Title: Infra: COS interface placeholder

Priority: P2
Labels: infra, storage, priority/P2

Description:
Add `packages/storage` interface that defines a minimal object storage contract (upload, download, signed URL generation, delete). Provide a local filesystem adapter and a COS adapter stub with docs describing required env vars.

Acceptance criteria:
- `packages/storage` scaffolded with interface and local adapter implementation.
- README documents how to implement and configure a COS adapter.
- Tests for the local adapter are included.