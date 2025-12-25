# 角色需求映射与公共能力清单

本文档从四个视角（**平台方 / 农户商户 / 普通消费者 / 运维与安全**）列出多端商城需要的公共能力，并将能力映射到仓库内的包与**验收标准**（最低可上线要求）。

---

## 1. 总原则
- 公共能力应“与业务解耦”、可复用、可替换（provider 抽象）。
- 支持多租户与多角色模型；考虑小程序与 Web 的接入差异（Token、存储、回话）。
- 注重运维与安全：审计、日志、P0 告警、依赖审计与密钥管理。

---

## 2. 能力清单（高优先级）
- 身份与鉴权（Auth）
- 配置与远程配置（Config）
- 日志与审计（Logger & Audit）
- 错误规范与监控（Errors / Telemetry）
- API 契约与类型（Shared API）
- HTTP 客户端抽象（重试/超时/断路）
- 事件与消息（异步通知、WebHook、事件总线）
- 限流/降级/熔断（防雪崩）
- 支付/结算抽象（接口与幂等）
- 安全与密钥管理（KMS/Secrets）

---

## 3. 角色视角需求与映射

### 平台方（商城运营） ✅
- 需求：中心化商品管理、商户入驻/审核、配置灰度、运营数据与告警
- 关注点：强鉴权（RBAC）、审计链、配置灰度、系统级监控与日志追踪
- 推荐能力映射：
  - 身份鉴权：`libs/auth`（多角色、SSO 支持）
  - 配置：`libs/config`（远程配置、灰度）
  - 审计/日志：`libs/logger` + 审计扩展（不可篡改记录）
  - API 契约：`packages/shared-api`（OpenAPI）
- 验收标准：
  - 管理端操作都有审计记录且可导出（CSV/JSON）
  - 配置灰度可按 `tenantId`/`role` 分配，配置回滚可追溯

### 农户 / 商户 ✅
- 需求：商品发布、库存管理、订单处理、结算与门店多租户支持
- 关注点：移动端性能、离线能力、商户角色隔离、支付与退款幂等
- 推荐能力映射：
  - Auth：`libs/auth`（merchant role、tenantId）
  - HTTP 客户端：`libs/http-client`（重试、签名、幂等）
  - 配置：`libs/config`（门店配置）
  - 支付抽象：`libs/payment`（建议单独包，幂等、账务对账）
- 验收标准：
  - 商户端关键操作（订单、发货）在 99% 情况下成功并有重试策略
  - 支付回调具备幂等处理与对账日志

### 普通消费者 ✅
- 需求：浏览、下单、支付、评价、售后；关注体验与隐私
- 关注点：请求耗时、缓存、支付安全、数据脱敏、退货流程
- 推荐能力映射：
  - SDK / 公共类型：`packages/common`（types、utils）
  - Shared API：`packages/shared-api`（契约）
  - Auth（短期 token / refresh）：`libs/auth`
  - Logger（匿名/脱敏）：`libs/logger` + 运维策略
- 验收标准：
  - 关键路径（商品页→下单→支付）平均延迟满足 SLO（例如 < 1s）
  - 用户敏感数据在日志中被脱敏

### 运维与安全 ✅
- 需求：可观测性、告警、备份、审计、依赖与漏洞管理、密钥生命周期管理
- 关注点：日志落地/索引、追踪（trace）、紧急回滚与演练、合规需求
- 推荐能力映射：
  - 配置/Secret: `libs/config` + KMS（`libs/auth` 的 keyProvider）
  - 日志/审计: `libs/logger` + 外部 ELK / Cloud Logging 集成点
  - CI/安全: `.github/workflows`（依赖审计） + `ops/` 文档和脚本
- 验收标准：
  - 关键告警（支付失败率突增/下单失败率）触达并有响应 SLA
  - 依赖审计每周运行并生成报告

---

## 4. 包职责快速对照（建议）
- `libs/auth`：鉴权、Token 管理、KeyProvider（KMS）
- `libs/config`：配置加载与合并（env > remote > default）
- `libs/logger`：结构化日志、traceId、采样、后端适配
- `libs/http-client`：请求封装（超时/重试/幂等/token 注入）
- `packages/shared-api`：OpenAPI、类型生成、契约测试
- `packages/common`：前端/小程序共用类型、SDK、工具
- `libs/payment`（建议新增）：支付抽象与幂等/对账
- `ops/`：CI、安全、备份与应急流程

---

## 5. 最低可上线（MVP）能力与验收（建议优先级）
1. Auth（必需）：JWT、角色、租户支持；单元测试、示例集成（管理端/小程序）
2. Config（必需）：Env 优先 + Remote provider；支持灰度
3. Logger（必需）：结构化日志、traceId 支持、Console/JSON 后端
4. Shared API（必需）：OpenAPI 示例 + types 生成
5. HTTP client（优先）：超时/重试/幂等/注入 token
6. CI 安全（优先）：lint/test/build + 依赖审计

---

## 6. 后续演进建议
- 引入分布式追踪（OpenTelemetry）并把 traceId 与日志关联
- 支付/结算包引入外部对账流程与审计支持
- 引入真正的 KMS（Azure Key Vault / AWS KMS / GCP KMS）并实现 Key rotation hooks
- 为 `packages/*` 添加 SDK 模板并在 `packages/common` 发布轻量 SDK（微信小程序支持）

---

如需，我可以把上述内容拆成更细化的验收清单（每个能力 3-5 个验收项）并在每项对应文件中创建 TODO/issue 模板。