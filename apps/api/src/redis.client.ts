import Redis from 'ioredis'
import path from 'path'
import fs from 'fs'

let client: Redis | null = null
let tokenBucketSha: string | null = null

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

// Load token bucket lua script into Redis and cache SHA for evalsha
export async function ensureTokenBucketScriptLoaded(redis?: Redis) {
  const r = redis ?? getRedisClient()
  if (!r) return null
  if (tokenBucketSha) return tokenBucketSha
  const scriptPath = path.resolve(__dirname, 'tokenbucket.lua')
  const script = fs.readFileSync(scriptPath, 'utf8')
  try {
    tokenBucketSha = await r.script('LOAD', script)
    return tokenBucketSha
  } catch (e) {
    // fallback: attempt EVAL later
    console.error('Failed to load tokenbucket script:', e?.message || e)
    return null
  }
}

export async function runTokenBucket(redis: any, key: string, maxTokens: number, windowSeconds: number) {
  // refill rate = maxTokens / windowSeconds
  const refill = Number(maxTokens) / Number(windowSeconds || 60)
  const now = Math.floor(Date.now() / 1000)
  try {
    let sha = tokenBucketSha
    if (!sha) {
      sha = await ensureTokenBucketScriptLoaded(redis)
    }
    if (sha) {
      const res = await redis.evalsha(sha, 1, key, String(maxTokens), String(refill), String(now))
      return res
    }
    // fallback to eval small script read-on-the-fly
    const scriptPath = path.resolve(__dirname, 'tokenbucket.lua')
    const script = fs.readFileSync(scriptPath, 'utf8')
    const res = await redis.eval(script, 1, key, String(maxTokens), String(refill), String(now))
    return res
  } catch (e) {
    // bubble up error to caller
    throw e
  }
}

