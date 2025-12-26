# Merchant WeApp

商户端微信小程序占位目录。放置商户操作、小程序云函数适配、上行/下行接口封装等。

- Purpose: 农户/商户使用的订单、结算、商品管理功能
- Tech suggestions: WeChat Mini Program + TypeScript + wx-server-sdk
- Policy: 使用 **原生微信小程序（WXML + WXSS + JS/TypeScript）**；不允许使用 uni-app 等跨编译框架，除非事先获得批准。
- Notes: 建议将 SDK 抽象到 `packages/sdk-weapp` 并通过小程序项目引用。