# libs/logger

轻量生产级结构化日志 PoC。

功能：
- 支持 Console / JSON 后端
- 支持 traceId 自动注入、service 标识与采样率
- 可扩展为发送到 Elastic, Cloud Logging, 或自定义后端

示例：

```ts
import { Logger } from '@weixin/logger';
const logger = new Logger({ service: 'admin', sampleRate: 0.5 });
logger.info('started', { env: 'prod' });
```

生产注意事项：
- 建议在入口处注入 traceId（例如通过中间件）以保证调用链一致
- 日志落地与索引策略、采样、敏感数据脱敏需与运维/安全方对齐