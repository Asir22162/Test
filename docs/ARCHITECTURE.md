# 架构与角色需求映射

## 目标
从以下四个视角分析并分配责任：
- 平台方（商城运营）
- 农户 / 商户（商品与订单管理）
- 普通消费者（购买、评价、售后）
- 运维与安全（监控、审计、备份、权限）

## 公共能力清单（示例）
- 身份与权限（SSO、多角色、多租户）
- 审计与日志（不可篡改审计链、行为审计）
- 配置中心（灰度、远程配置）
- API 层契约（OpenAPI/TypeScript types）
- SDK（前端/小程序通用 SDK）
- 错误与异常规范
- 监控与告警（指标、Tracing）
- 安全（依赖扫描、密钥管理、最小权限）

## 包职责示例
- `packages/common`：工具、类型、通用 UI、SDK
- `packages/shared-api`：OpenAPI 定义、类型生成脚本
- `libs`：`auth`、`logger`、`config`、`audit` 等可在服务端/函数中复用的 infra 库
- `ops`：CI/CD 文档、运维脚本、灾备方案

## 下一步
- 为 `auth`、`logger`、`config` 设计最小的生产级 API，并实现 PoC。
- 将能力拆分为可执行 Issue（见 `docs/tasks/*`）并优先实现 Auth/Config/Logger/Shared API 的高优先项。