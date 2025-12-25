<!-- PR 模板 -->

## 变更说明
简要描述本次变更。

## Checklist
- [ ] 我已运行并通过 lint（`pnpm -w -r run lint`）
- [ ] 我已运行并通过测试（`pnpm -w -r run test`）
- [ ] 如果修改了 OpenAPI，已生成并提交 `packages/shared-api/src/types.ts`（运行：`pnpm --filter packages/shared-api... run generate-types` 并提交更改）
- [ ] 我已更新相关文档（如有必要）

> 如果 CI 报告生成 types 有差异，请在本地生成并提交后重新推送 PR。