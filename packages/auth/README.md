# packages/auth

认证与授权抽象（平台方与商户）：

- 提供 token 解析、权限检查接口
- 支持多种 token 策略：JWT、OAuth、Session
- 不实现具体存储，提供接口以适配现有 IAM/数据库