-- Token Bucket Lua script
-- KEYS[1] = key
-- ARGV[1] = max_tokens (number)
-- ARGV[2] = refill_per_second (number)
-- ARGV[3] = now (unix seconds)

local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- get stored tokens and last timestamp
local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if tokens == nil then tokens = max_tokens end
if last == nil then last = now end

local elapsed = math.max(0, now - last)
local add = elapsed * refill
tokens = math.min(max_tokens, tokens + add)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

-- compute reset seconds until next token available (if not allowed)
local reset = 0
if allowed == 0 then
  if refill > 0 then
    reset = math.ceil((1 - tokens) / refill)
  else
    reset = 3600
  end
end

redis.call('HMSET', key, 'tokens', tostring(tokens), 'last', tostring(now))
redis.call('EXPIRE', key, math.ceil(max_tokens / math.max(refill, 0.0001)) + 5)

return {allowed, tostring(tokens), tostring(reset)}
