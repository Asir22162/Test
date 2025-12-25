# Auth Tasks (可执行 Issue 列表)

目标：提升 `libs/auth` 到生产级（MVP）能力并补齐验收测试。

- [ ] 完成 RS256 与 KMS 集成 PoC（已完成 PoC，但需文档化与示例）
  - 验收：提供完整的 KMS 使用示例（EnvKeyProvider & StubKmsProvider），并在 README 中说明生产注意事项
- [ ] 实现 Refresh Token 流程与存储（支持短期 access token + refresh token）
  - 验收：能够在 token 过期后安全刷新，包含 tests 覆盖边界情况
- [ ] 增加 JTI 黑名单/撤销机制（支持单点登出）
  - 验收：提供黑名单插入与过期策略，并有单元测试
- [ ] 提供中间件/小程序 SDK 示例（前端/后端）以便接入
  - 验收：管理端与微信小程序的简单示例代码
- [ ] 接入审计日志（登录/登出/刷新/注销事件）
  - 验收：关键事件写入 audit 日志（与 `libs/logger` 对接）

优先级：Refresh Token / JTI（高） -> KMS 集成示例（中） -> SDK 与审计（中）

Issue 模板建议：
- Title: feat(auth): implement refresh token support
- Body: 需求、验收标准、测试要求、文档更新
