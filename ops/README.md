# ops

运维与安全相关资源：CI/CD 文档、备份策略、应急流程、安全扫描脚本。

职责：
- 明确运维与安全要求
- 提供监控/告警/回滚指导

下一步：添加 CI 工作流示例与依赖审计脚本。

---

## Audit check

`check-audit.sh` 是用于检查 `audit.json`（由 `pnpm audit --json` 或 `npm audit --json` 生成）的轻量脚本。它会：

- 打印 `audit.json` 内容
- 检查是否存在 high 或 critical 级别的漏洞（多种输出格式兼容）
- 当检测到高危漏洞时，输出 GitHub 注释 (::error) 并以非 0 退出，便于 CI 阶段阻断

使用示例：

  # 在工作目录或指定路径运行
  bash ops/check-audit.sh audit.json

在 CI 中建议把 `audit.json` 上传为 artifact（`dependency-audit`），并在需要时查看详细报告。

### 可选告警（Slack / Microsoft Teams）

`check-audit.sh` 支持在发现 high/critical 漏洞时向外部告警系统发送 Webhook：

- 环境变量：
  - `AUDIT_ALERT_WEBHOOK`：Webhook URL（建议设置为 GitHub Secret）
  - `AUDIT_ALERT_TYPE`：`slack`（默认）或 `teams`，影响消息格式
  - CI 环境下可使用 `GITHUB_RUN_ID` / `GITHUB_REPOSITORY` 等环境变量生成上下文链接
  - 可选：`AUDIT_TOP_N`（默认 5），在告警摘要中包含 top N 条高/严重漏洞

示例：在 GitHub Actions Secrets 中设置 `AUDIT_ALERT_WEBHOOK`，并在 CI 的检查步骤中把该 Secret 传入：

  AUDIT_ALERT_WEBHOOK: ${{ secrets.AUDIT_ALERT_WEBHOOK }}
  AUDIT_ALERT_TYPE: slack
  AUDIT_TOP_N: 5

告警信息中会包含 top N 个高危漏洞的摘要与（若能解析出）建议的修复版本或说明；若能解析出明确补丁版本，告警会同时包含一条可执行的 `npm install` 建议命令（例如 `npm i pkg@1.2.3 --save`）。脚本会尝试使用 `curl` 发送简短的文本告警，若 `curl` 不存在则跳过告警并在日志中提示。

附加自动化：CI 现在支持在检测到 high/critical 级别漏洞时自动创建一个 GitHub Issue（使用 `ops/create-issue.js`），Issue 会包含 Top-N 摘要、`audit.json` 的摘要片段以及生成的 `ops/suggested-fixes.sh` 内容，方便人工审查与审批。默认行为是由工作流触发并以非破坏性方式运行（生成脚本与上传 artifact），实际应用修复仍然应由人工审核后合并。

Trigger helper:

仓库包含一个小脚本 `ops/trigger-workflow.sh`，可用于触发指定 workflow（例如 `suggest-fixes-dry-run.yml`）的 `workflow_dispatch`:

  GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN=ghp_xxx bash ops/trigger-workflow.sh suggest-fixes-dry-run.yml main

该脚本会调用 GitHub Actions Dispatch API 触发一次运行，适合在需要手动触发或调试时使用。请确保 `GITHUB_TOKEN` 有足够权限（触发 workflow 的最小权限即可）。

---

## Suggest fixes (自动修复建议 & PR)

仓库新增了 `ops/suggest-fixes.sh`，用于把 `check-audit.js`（或 `audit.json`）中解析出的 `suggestedCommand` 自动收集并生成可执行脚本，支持三种模式：

- 仅生成建议脚本（默认）：会在 `ops/suggested-fixes.sh` 中写入建议命令供人工审核。
- 自动执行修复并在本地创建分支：传入 `--run` 参数会执行建议命令，并在当前仓库创建一个分支（默认 `auto/dep-fix-<timestamp>`），提交发生的 `package.json` / lockfile 变更。
- 自动推送并创建 PR：在 `--run --push` 且设置了 `GITHUB_TOKEN` 的情况下，会把修复分支推送到远程并通过 GitHub API 创建一个 PR（需要 `GITHUB_REPOSITORY` 环境变量）。

Usage examples:

- 生成脚本（不执行）：

```
bash ops/suggest-fixes.sh audit.json
```

- 执行修复并在本地创建分支：

```
bash ops/suggest-fixes.sh audit.json --run --branch auto/dep-fix-20251224-1234
```

- 执行修复、推送并创建 PR（CI 环境使用，需配置 `GITHUB_TOKEN`）：

```
bash ops/suggest-fixes.sh audit.json --run --push
```

安全注意事项：

- 强烈建议先生成并审查 `ops/suggested-fixes.sh`，再决定是否执行 `--run`。
- 自动推送与 PR 创建需要谨慎，默认不会在未显式传入 `--push` 的情况下推送。
- 在 CI 中使用自动推送前，请确保有合适的保护策略（例如 `require review`）、最小权限的 token，以及对自动化分支的审查流程。


