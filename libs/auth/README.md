# libs/auth

生产级可复用身份鉴权（PoC）模块。

功能（PoC）：
- 支持 JWT 签发与校验（当前 PoC支持 HS256）
- 支持多角色、租户信息（payload 中包含 roles、tenantId）
- 提供轻量错误类型

快速示例：

```ts
import { JWT } from '@weixin/auth';

const jwt = new JWT({ secret: 'replace-with-env-secret', expiresIn: '1h' });
const token = await jwt.sign({ sub: 'user-1', roles: ['consumer'] });
const payload = await jwt.verify(token);

if (payload.roles.includes('merchant')) {
  // ...
}
```

注意：
- 在生产中请把密钥放在安全的密钥管理服务中（KMS/Key Vault）而非环境变量
- 已新增 RS256 支持（需要提供 PKCS#8 私钥 PEM 与 SPKI 公钥 PEM），建议在生产中使用 KMS 并通过 `keyProvider` 注入
- 建议后续扩展：JTI 黑名单、刷新 token、登录审计、单点登出