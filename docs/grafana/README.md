# Grafana: Auth Dashboard & Alerts

This directory contains a Grafana dashboard JSON template and Prometheus alert rules for Auth-related metrics (revoke/rotate/issue, and rate limiter errors).

Files:
- `auth-dashboard.json` — Grafana dashboard export; import into Grafana (Dashboards -> Import) and choose a Prometheus data source (or select the `${DS_PROMETHEUS}` variable after import). The dashboard includes template variables:
  - **${DS_PROMETHEUS}** (datasource)
  - **${env}** (environment label)
  - **${service}** (service name)
  - **${instance}** (instance/host)

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
