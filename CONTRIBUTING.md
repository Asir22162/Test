# Contributing

感谢你为本仓库贡献代码！在提交 PR 之前，请确保以下检查项完成，以保持契约与生成文件的同步，减少 CI 失败：

必做项（在本地运行并验证）：

- 生成并检查 `shared-api` 的 types：

  pnpm --filter packages/shared-api... run generate-types
  git diff packages/shared-api/src/types.ts

  如果生成的 types 有更改：提交并推送这些更改。

- 运行 lint：

  pnpm -w -r run lint

- 运行测试：

  pnpm -w -r run test

可选项：
- 如果不确定是否需要更新 types，请在 PR 中 @ 相关负责人进行复核。

常见问题：
- CI 报告“Generated types differ from committed types”：说明 OpenAPI 有变更，请按照上文步骤本地生成并提交类型。
- 我们采用 fail-only 策略：CI 不会自动生成并提交类型，需开发者自行修复并提交。

感谢你的配合！