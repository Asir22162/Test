import Redis from 'ioredis'

let client: Redis | null = null

export function getRedisClient() {
  if (client) return client
  const url = process.env.REDIS_URL
  if (!url) return null
  client = new Redis(url)
  client.on('error', (e) => {
    // Log but don't crash
    console.error('Redis error:', e.message || e)
  })
  return client
}
