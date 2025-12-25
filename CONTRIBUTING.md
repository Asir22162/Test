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


本地开发环境（Node 版本）:

- 推荐使用 **Node 20.x** 作为本地开发基线。为避免版本不一致导致的 CI/构建差异，请在本地切换到 Node 20。
- 推荐方式（跨平台、用户级）: **Volta**。
  - 安装（Windows 示例）：`winget install Volta.Volta -e --silent` 或参见 https://volta.sh
  - 切换到 Node 20：`volta install node@20`
- Windows 可选：使用 **nvm-windows**（CoreyButler.NVMforWindows）：`nvm install 20.19.6 && nvm use 20.19.6`。
- 我们在仓库根目录提供 `.nvmrc`（内容为 `20`），多数工具会读取此文件以选取合适的 Node 版本。
- 验证：`node -v` 应显示 `v20.x.x`，之后请运行上面的 lint/test 命令确认环境正常。

可选项：
- 如果不确定是否需要更新 types，请在 PR 中 @ 相关负责人进行复核。

常见问题：
- CI 报告“Generated types differ from committed types”：说明 OpenAPI 有变更，请按照上文步骤本地生成并提交类型。
- 我们采用 fail-only 策略：CI 不会自动生成并提交类型，需开发者自行修复并提交。

感谢你的配合！