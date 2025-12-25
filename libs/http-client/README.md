# libs/http-client

轻量 HttpClient PoC。

特性：
- 支持超时（AbortController）
- 重试（500/网络错误）
- 幂等 key 支持（Idempotency-Key header）
- 可插入签名器（Signer，例如 HMAC）

示例：

```ts
import { HttpClient } from '@weixin/http-client';
import { HmacSigner } from '@weixin/http-client';

const client = new HttpClient('https://api.example.com', new HmacSigner(process.env.SIGN_SECRET || 'secret'));
const res = await client.request('/orders', { method: 'POST', body: { productId: 'p1' }, idempotencyKey: 'ik-1' });
```

注记：
- Node 环境使用 `node-fetch`，浏览器端可用原生 `fetch`，若需要浏览器支持请替换或适配 `fetch` 引入方法。
- 幂等性需要服务端配合（`Idempotency-Key` 与幂等处理）。