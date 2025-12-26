# Grafana: Auth Dashboard & Alerts

This directory contains a Grafana dashboard JSON template and Prometheus alert rules for Auth-related metrics (revoke/rotate/issue, and rate limiter errors).

Files:
- `auth-dashboard.json` — Grafana dashboard export; import into Grafana (Dashboards -> Import) and choose a Prometheus data source (or select the `${DS_PROMETHEUS}` variable after import). The dashboard includes template variables:
  - **${DS_PROMETHEUS}** (datasource)
  - **${env}** (environment label)
  - **${service}** (service name)
  - **${instance}** (instance/host)
  - **${region}** (optional region label)
  - **${team}** (optional team label)
  - **${topk}** (top N for rank panels, default 10)

Notes on panels:
- **Top Users by Revokes**: shows top N users producing revoke events; requires `user` label on `auth_revoke_count` metric.
- **Revokes by Team / Service**: aggregate by `team` and `service` labels to spot which teams/services generate most revokes.
- **Redis Latency**: example panel using `redis_command_duration_seconds` histogram; adjust based on your Redis metrics.

Tips:
- Ensure your services emit labels (`env`, `service`, `team`, `region`, `user`) on auth metrics for these panels to work effectively.
- You can edit the `${topk}` variable after import to show Top 5/10/20.

- `alerts-auth.rules.yml` — Example Prometheus alerting rules to add to your Prometheus server (or Alertmanager).

Key metrics expected (emitted by `apps/api`):
- `auth_issue_count` (counter)
- `auth_rotate_count` (counter)
- `auth_rotate_failures` (counter)
- `auth_revoke_count` (counter)
- `auth_revoke_failures` (counter)
- `auth_revoke_rate_allowed` (counter)
- `auth_revoke_rate_denied` (counter)
- `auth_revoke_rate_redis_errors` (counter)

How to import dashboard:
1. Open Grafana UI, go to Dashboards -> Import
2. Paste the contents of `auth-dashboard.json` or upload the file
3. Select Prometheus data source

Notes:
- Tune alert thresholds to your traffic.
- Consider scoping dashboards by instance or service tags when running multiple services.

Demo: run Prometheus + Pushgateway + Grafana locally
1. Start services: `docker compose -f docs/grafana/demo-docker-compose.yml up -d`
2. Push sample metrics: `node docs/grafana/push-sample-metrics.js`
3. Open Prometheus: http://localhost:9090 and Grafana: http://localhost:3000 (admin/admin)
4. Import `docs/grafana/auth-dashboard.json` into Grafana and set the Prometheus data source to `http://host.docker.internal:9090` (on Mac/Windows) or `http://localhost:9090` if running natively.

Tips:
- The demo script pushes grouped metrics with labels (service, env, team, user, instance) so the dashboard panels (Top N, team aggregation) will show example data immediately.
- You can re-run the push script to update metrics. To simulate time-series increases, modify the counters or push different values over time.
