# packages/core

公共基础能力层的核心包：包含通用类型、错误类型、工具函数和跨模块共享的契约接口。

职责：
- 提供稳定的 Typescript 类型与 contract
- 提供跨模块的错误处理与标准化响应类型
- 尽量保持无状态，依赖注入扩展点（logger, metrics, config）