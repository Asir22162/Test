# packages/shared-api

公共 API 定义与契约（OpenAPI、TypeScript 类型生成、契约测试）。

使用示例：

- OpenAPI 文件位于：`packages/shared-api/openapi.yaml`
- 生成 types：`pnpm -w -r --filter packages/shared-api... run generate-types`

建议：在 CI 中加入一个 step 检查生成的 types 是否与仓库中的 types 文件一致，以防契约漂移。

## 本地修复生成的 types（快速指南）
如果 CI 提示生成的 types 与仓库中不一致，请按下面步骤在本地修复并提交：

1. 在仓库根运行（或在包内运行）生成命令：

   pnpm --filter packages/shared-api... run generate-types

2. 比较并检查更改：

   git diff packages/shared-api/src/types.ts

3. 如果变更正确，提交更新：

   git add packages/shared-api/src/types.ts
   git commit -m "chore(shared-api): update generated types"
   git push

4. 重新触发 CI（或在 PR 中追加 commit）以验证修复。

提示：如果你不确定变更是否正确，请在 PR 中 @ 相关负责人审查。

Pact（契约测试）说明：

- 生成 pact（consumer）：

  pnpm --filter packages/shared-api... run pact:consumer

  该命令会运行 consumer 测试并在 `packages/shared-api/pacts/` 下生成 pact 文件。

- 将 pact 发布到 Pact Broker：

  需要配置环境变量：
  - `PACT_BROKER_BASE_URL`（例如 https://my.pact-broker.example）
  - `PACT_BROKER_TOKEN`（可选，取决于 broker 的认证方式）
  - 可选：`PACT_BROKER_USERNAME` / `PACT_BROKER_PASSWORD`（用 Basic auth 代替 token）
  - 可选：`PACT_BROKER_METADATA`（JSON 字符串，用于记录额外元数据）
  - 可选：`PACT_BROKER_METADATA_STRATEGY`（可选值：`header`（默认）|`body`|`participant_meta`，分别把 metadata 发送为 header / 与 pact 一起 POST / PUT 到 participant metadata endpoint）
  - 可选：`PACT_BROKER_META_ENDPOINT`（可选，覆盖 `body` 策略下的元数据上传 endpoint）
  - 可选：`PACT_BROKER_PARTICIPANT_META_ENDPOINT`（可选，覆盖 participant_meta 策略的 endpoint）
  - 可选：`PACT_BROKER_TAGS`（逗号分隔的标签，例如分支名或环境名；CI 默认为当前分支名）

  在 CI 中，设置仓库 Secrets：`PACT_BROKER_BASE_URL` 与 `PACT_BROKER_TOKEN`（或 `PACT_BROKER_USERNAME` / `PACT_BROKER_PASSWORD`），CI 会在 consumer 测试后自动调用发布脚本：

  pnpm --filter packages/shared-api... run pact:publish

  如果需要，你可以在 CI 中设置 `PACT_BROKER_METADATA`（例如 `{"env":"staging","team":"payments"}`）以便在 Broker 中记录构建元数据。

  发布脚本会将每个 pact 发布到 broker，并在成功后为当前构建（使用 `GITHUB_SHA` / `GITHUB_RUN_ID`）打上 `PACT_BROKER_TAGS` 中指定的标签（例如分支名）。

- Provider 验证（PoC）：

  本仓库提供了 provider 验证的 PoC（`pnpm --filter packages/shared-api... run pact:provider-verify`），该测试会读取 `packages/shared-api/pacts/` 中的 pact 文件或使用 `pactBrokerUrl`（如果设置环境变量 `PACT_BROKER_BASE_URL` 将用于从 Broker 拉取 pacts）。

注：发布 pact 到 broker 会使用 `GITHUB_SHA` 或 CI 的构建标识作为版本标识。