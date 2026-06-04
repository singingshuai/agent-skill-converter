---
name: api-designer
description: API接口设计技能，用于设计RESTful API接口，支持OpenAPI规范生成、接口文档、错误码设计。当用户需要设计API、接口文档、RESTful规范时使用此技能。
---

# API Designer

Design RESTful APIs with best practices.

## Trigger Phrases

Use this skill when the user says:

- `帮我设计一个API接口`
- `这个接口怎么设计比较好`
- `生成OpenAPI文档`
- `RESTful接口设计规范`
- `API错误码怎么定义`

## Workflow

1. 了解业务需求和数据模型
2. 设计资源结构和URL路径
3. 定义HTTP方法和状态码
4. 设计请求/响应数据结构
5. 制定错误码规范
6. 生成OpenAPI/Swagger文档
7. 提供示例代码

## Constraints

- 遵循RESTful设计原则
- 使用标准HTTP状态码
- 接口版本化管理
- 幂等性设计考虑
- 安全性要求（认证、授权、限流）

## Resources

- openapi-template.yaml: OpenAPI文档模板
- error-codes.md: 错误码规范文档

## Examples

- 设计用户管理CRUD接口
- 设计订单查询接口（支持分页、过滤）
- 设计文件上传接口
