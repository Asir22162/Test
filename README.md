# 多端商城 — 公共基础能力层

本仓库为多端商城（Web 管理端、商户微信小程序、用户微信小程序）的 monorepo，关注点为 **公共基础能力层**，目标：

- 被所有业务模块复用
- 与具体业务解耦
- 易扩展、满足生产

目录结构（初始）：

- packages/
  - common/         # 通用基础库（类型、工具、SDK）
  - admin-web/      # 管理端（运营/审核/配置）前端应用
  - merchant-miniapp/# 商户侧微信小程序
  - consumer-miniapp/# 用户侧微信小程序
  - shared-api/     # 公共 API 定义（契约、类型）
- libs/              # 基础 infra libs（auth、logger、config、errors）
- infra/             # 部署、基础设施代码（IaC）
- ops/               # 运维与安全相关脚本/手册
- docs/              # 架构与角色映射

后续将加入：monorepo 配置、TypeScript 基线、CI、代码规范、生产化监控与安全检测。

快速修复提示（生成 types）：
如果 CI 报告 `packages/shared-api` 的生成 types 与提交不一致，可按以下步骤在本地生成并提交：

1. 生成 types：

   pnpm --filter packages/shared-api... run generate-types

2. 查看 diff：

   git diff packages/shared-api/src/types.ts

3. 提交并推送：

   git add packages/shared-api/src/types.ts
   git commit -m "chore(shared-api): update generated types"
   git push

---

如需我继续：我可以接着添加 monorepo `package.json`、TypeScript 模板、ESLint/Prettier 配置与 CI 草案。

## 贡献与 PR 检查 🔧
**请在发起 PR 前执行并确认以下项**：

- 阅读并遵循 `CONTRIBUTING.md` 中的说明（包括如何生成并提交 `packages/shared-api/src/types.ts`）。
- 确保已运行：
  - `pnpm --filter packages/shared-api... run generate-types`（如修改 OpenAPI）
  - `pnpm -w -r run lint`
  - `pnpm -w -r run test`

如果 CI 报告 “Generated types differ from committed types”，请参考 `CONTRIBUTING.md` 或在本地运行：

  pnpm --filter packages/shared-api... run generate-types
  git add packages/shared-api/src/types.ts
  git commit -m "chore(shared-api): update generated types"
  git push

（如果你不确定变更是否正确，请在 PR 中 @ 相关维护者进行复核）