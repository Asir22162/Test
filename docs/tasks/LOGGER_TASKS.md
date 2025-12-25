# Logger Tasks (可执行 Issue 列表)

目标：把 `libs/logger` 提升到生产能力，满足索引、采样、敏感数据处理等需求。

- [ ] 增加敏感数据脱敏 hook（配置化）
  - 验收：能够对指定字段进行自动脱敏，包含单元测试
- [ ] 支持拓展后端（Elastic / Cloud Logging）并提供示例
  - 验收：提供至少一份后端 adapter 示例与集成测试
- [ ] 集成 Trace Context（支持 OpenTelemetry context 链接）
  - 验收：traceId 可被外部追踪系统使用，且能在日志中找到
- [ ] 支持批量发送与缓冲策略（节省带宽/成本）
  - 验收：实现批量后端 adapter，并提供参数化策略

优先级：敏感数据脱敏（高） -> Trace Context（高） -> 后端 adapter（中）

Issue 模板建议：
- Title: feat(logger): add sensitive-data mask hook
- Body: 需求、限制、测试、向运维提供配置说明
