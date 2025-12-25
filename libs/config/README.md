# libs/config

轻量生产级配置服务 PoC。

特性：
- 环境变量优先（支持前缀）
- 支持远程配置 provider（钩子式 fetch）
- 支持自定义 schema 校验/解析（类型安全由调用方负责）

示例：

```ts
import { ConfigService } from '@weixin/config';
import { StubRemoteProvider } from '@weixin/config';

const schema = {
  parse(raw: Record<string, any>) {
    return {
      PORT: Number(raw.PORT ?? 3000)
    };
  }
};

const cfg = new ConfigService(schema, { remote: new StubRemoteProvider({ PORT: 8080 }), envPrefix: 'APP' });
await cfg.load();
console.log(cfg.get().PORT);
```

注意：远程 Provider 需实现原子性与可重试逻辑，生产中应加入缓存、回退策略与签名校验。