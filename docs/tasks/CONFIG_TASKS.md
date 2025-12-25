# Config Tasks (可执行 Issue 列表)

目标：把 `libs/config` 打造成生产可用的配置层。

- [ ] 增加缓存与重试策略（fetch 远程配置时）
  - 验收：在远程失败时自动回退到本地缓存或默认配置，包含 unit tests
- [ ] 支持配置版本与回滚（audit of changes）
  - 验收：保存配置变更记录并能回滚到历史版本
- [ ] 支持签名校验（远程配置的完整性验证）
  - 验收：当签名不匹配时拒绝加载远程配置并报警
- [ ] 提供 CLI / Admin 工具示例（查看/回滚/发布）
  - 验收：简单脚本或 UI 示例用于调试与发布操作

优先级：缓存与回退（高） -> 签名校验（中） -> 版本与回滚（中）

Issue 模板建议：
- Title: feat(config): add remote cache and retry
- Body: 说明、验收标准、测试场景、回退策略
