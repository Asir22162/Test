# packages/config

负责环境配置、运行时配置加载与验证（支持 dotenv、Vault、环境变量、配置覆盖策略）。

Features:
- Typed schema validation (zod / io-ts)
- Support multi-environment & secrets injection
- Support runtime reload for certain features