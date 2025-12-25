# Shared API Tasks (可执行 Issue 列表)

目标：建立契约驱动开发（OpenAPI -> types -> 消费者/生产者测试）。

- [x] 添加 OpenAPI 示例（基本商品与订单接口）并在仓库中存放 `packages/shared-api/openapi.yaml`
  - 验收：OpenAPI 文件通过 `swagger-cli validate`（或类似工具）验证
- [x] 添加 `generate-types` 脚本（使用 `openapi-typescript`）并提交生成的 types 示例
  - 验收：运行 `pnpm -w -r run generate-types` 能在 `packages/shared-api/src/types.ts` 生成类型
- [ ] 添加契约测试示例（provider/consumer contract tests skeleton）
  - 验收：提供示例约束测试（例如使用 `pact` 或简单 handshake 测试）

优先级：OpenAPI 示例与类型生成（高） -> 契约测试（中）

Issue 模板建议：
- Title: feat(shared-api): add openapi example and types generation
- Body: 说明、验收标准、CI 集成点（生成 types 是否需在 CI 中检查）
