---
name: sql-optimizer
description: SQL查询优化技能，用于分析和优化SQL查询性能，支持索引建议、查询重写、执行计划分析。当用户提到SQL性能问题、查询慢、索引优化时使用此技能。
---

# SQL Optimizer

Analyze and optimize SQL query performance.

## Trigger Phrases

Use this skill when the user says:

- SQL查询很慢怎么优化
- 帮我看看这个SQL的执行计划
- 怎么给这个表加索引
- 查询性能有问题
- SQL调优

## Workflow

1. 获取用户提供的SQL查询
2. 分析查询结构和表关联
3. 检查现有索引情况
4. 生成执行计划分析
5. 提供优化建议：
   - 索引建议
   - 查询重写建议
   - 分区建议
6. 验证优化效果

## Constraints

- 只提供只读建议，不直接修改数据库
- 必须说明优化的风险和影响
- 大表操作需要特别谨慎
- 必须考虑数据量和并发情况

## Examples

- 优化 SELECT * FROM large_table WHERE date > '2024-01-01'
- 分析多表 JOIN 的性能瓶颈
- 建议合适的索引策略