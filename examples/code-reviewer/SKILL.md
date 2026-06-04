---
name: code-reviewer
description: 代码审查技能，用于检查提交代码中的常见问题，避免部署任务时报错。检查工作流配置、SQL语法、字段映射、测试库引用等问题。当用户请求代码审查、检查提交、或需要验证代码质量时使用此技能。
---

# 代码审查

检查数据仓库项目提交代码中的常见问题。

## When to Use

Use when user requests code review, checks commits, or needs to verify code quality. Also use when user mentions SQL validation, workflow checks, or DataX synchronization issues.

## Workflow

1. 使用 git diff --name-status origin/master 获取变更文件列表
2. 扫描所有新增/修改文件，检测测试库引用（ods_test、dwd_test、ads_test、dim_test、dws_test）
3. 按文件类型分类检查：
   - config/ → 工作流配置检查
   - *_datax.ds → DataX同步代码检查
   - 其他 .ds → SQL代码检查
   - .view → 视图代码检查
4. 生成报告，按严重程度排序

## Constraints

- 只审查变更内容，不审查未修改的代码
- 新增文件：完整审查
- 修改文件：只审查改动部分
- 删除文件：跳过

## Examples

- 审查最近一次提交的代码
- 检查SQL语句中的测试库引用
- 验证GROUP BY与SELECT的一致性
- 检查DataX任务类型是否正确