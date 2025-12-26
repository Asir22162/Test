const fetch = require('node-fetch')

async function pushMetrics() {
  const pushgateway = process.env.PUSHGATEWAY_URL || 'http://localhost:9091'
  const job = 'auth-demo'
  const service = 'weapp-api'
  const env = 'dev'
  const team = 'payments'
  const instance = 'demo-1'

  // metrics in Prometheus text format with labels
  const metrics = []
  // counters
  metrics.push(`# HELP auth_revoke_count Total number of revoke events`)
  metrics.push(`# TYPE auth_revoke_count counter`)
  metrics.push(`auth_revoke_count{service=\"${service}\",env=\"${env}\",team=\"${team}\",user=\"alice\"} 5`)
  metrics.push(`auth_revoke_count{service=\"${service}\",env=\"${env}\",team=\"${team}\",user=\"bob\"} 3`)

  metrics.push(`# HELP auth_revoke_rate_denied Rate of revoke denied events`)
  metrics.push(`# TYPE auth_revoke_rate_denied counter`)
  metrics.push(`auth_revoke_rate_denied{service=\"${service}\",env=\"${env}\",team=\"${team}\",user=\"bob\"} 2`)

  metrics.push(`# HELP auth_rotate_count Refresh rotations`)
  metrics.push(`# TYPE auth_rotate_count counter`)
  metrics.push(`auth_rotate_count{service=\"${service}\",env=\"${env}\"} 4`)

  metrics.push(`# HELP auth_revoke_rate_redis_errors Redis errors in rate limiter`)
  metrics.push(`# TYPE auth_revoke_rate_redis_errors counter`)
  metrics.push(`auth_revoke_rate_redis_errors{service=\"${service}\",env=\"${env}\"} 0`)

  // tokenbucket remaining as gauge example per user
  metrics.push(`# HELP auth_tokenbucket_remaining Remaining tokens in bucket`)
  metrics.push(`# TYPE auth_tokenbucket_remaining gauge`)
  metrics.push(`auth_tokenbucket_remaining{service=\"${service}\",env=\"${env}\",user=\"alice\"} 3`)
  metrics.push(`auth_tokenbucket_remaining{service=\"${service}\",env=\"${env}\",user=\"bob\"} 0`)

  const body = metrics.join('\n') + '\n'

  const url = `${pushgateway}/metrics/job/${job}/instance/${instance}`
  console.log('Pushing metrics to', url)

  const res = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': 'text/plain' } })
  if (!res.ok) {
    console.error('Push failed', res.status, await res.text())
    process.exit(1)
  }
  console.log('Push success')
}

pushMetrics().catch(e => { console.error(e); process.exit(1) })
