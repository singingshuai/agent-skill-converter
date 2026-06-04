---
name: performance-monitor
description: 性能监控技能，用于监控系统性能指标、分析瓶颈、生成报告。当用户需要性能监控、系统调优、资源分析时使用此技能。
---

# Performance Monitor

Monitor system performance and identify bottlenecks.

## Trigger Phrases

Use this skill when the user says:

- 系统性能怎么监控
- 帮我分析一下性能瓶颈
- 服务器资源使用情况
- 数据库连接池监控
- 接口响应时间分析

## Workflow

1. 收集系统指标（CPU、内存、磁盘、网络）
2. 监控数据库性能（连接数、查询耗时、锁等待）
3. 分析应用日志和错误率
4. 识别性能瓶颈
5. 生成性能报告
6. 提供优化建议

## Constraints

- 监控数据只读，不修改系统配置
- 敏感信息脱敏处理
- 监控频率不能影响系统性能
- 历史数据保留策略

## Examples

- 分析最近1小时的系统负载
- 慢查询Top10分析
- 内存泄漏排查
- 数据库连接池使用率监控