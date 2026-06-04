---
name: datax-json-generator
description: 根据用户提供的建表语句和数据库信息，自动生成符合DataX语义的JSON配置文件，支持解析上游表名和业务线映射。当用户需要生成DataX配置时使用此技能。
---

# DataX JSON 生成器

根据建表语句和数据库信息生成 DataX JSON 配置。

## When to Use

Use when user needs to generate DataX JSON configuration from table creation statements and database information.

## Business Line Mapping

| Business Line | dolphin_ds |
|---------------|------------|
| forecast      | forecast   |
| quickapp      | quickapp   |
| shortplay_starrocks | shortplay_starrocks |
| mysql_mb_nativeend | mysql_mb_nativeend |
| aigc          | aigc       |
| mysql_pre     | mysql_pre  |
| mb_third_data | mb_third_data |
| Finance       | Finance    |

## Table Name Parsing Rules

Downstream table format: {database}_{business_line}_{original_table_name}_{partitioned}_{update_frequency}_{table_type}

Parsing method: Remove database, business line, update frequency, partitioned, and table type prefixes/suffixes to get upstream table name.

## Workflow

1. Map dolphin_ds based on data source and target business line
2. Parse upstream table name from downstream table creation statement
3. Extract all field names from table creation statement
4. Generate WHERE condition: if table contains update_time, generate WHERE update_time >= chr(39) chr(39) AND update_time <= chr(39) chr(39), otherwise leave empty and prompt user
5. Configure writer to use mysqlwriter
6. Only configure dolphin_ds for data source, do not configure jdbcUrl/username/password
7. writer.connection.database should be string format, not array
8. writer.connection.table should include database prefix

## Constraints

- Must follow business line mapping rules
- Must parse table names correctly according to format
- Must extract all fields from table creation statement
- Must handle update_time condition appropriately
- Must use correct writer configuration

## Examples

Input: Table creation statement + data source (e.g., crawler/quickapp)
Output: Complete DataX JSON with reader using mysql_mb_nativeend, writer using quickapp