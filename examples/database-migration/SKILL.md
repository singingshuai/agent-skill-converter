---
name: database-migration
description: 数据库迁移技能，用于设计和执行数据库schema迁移，支持版本管理、回滚策略、数据迁移。当用户需要数据库迁移、schema变更、数据迁移时使用此技能。
---

# Database Migration

Design and execute database schema migrations safely.

## Trigger Phrases

Use this skill when the user says:

- `数据库表结构怎么迁移`
- `怎么安全地修改表结构`
- `数据迁移方案设计`
- `数据库版本管理`
- `schema变更流程`

## Workflow

1. 分析现有schema结构
2. 设计迁移脚本（up/down）
3. 评估迁移风险和影响
4. 制定回滚策略
5. 执行迁移（dry-run first）
6. 验证迁移结果
7. 更新版本记录

## Constraints

- 迁移脚本必须可逆（支持回滚）
- 大表迁移需要分批执行
- 生产环境必须有审批流程
- 迁移前必须备份数据
- 避免在业务高峰期执行

## Resources

- migration-template.sql: 迁移脚本模板
- rollback-strategy.md: 回滚策略文档

## Examples

- 添加新列并设置默认值
- 修改列类型（需要数据转换）
- 分区表迁移
- 跨库数据迁移
