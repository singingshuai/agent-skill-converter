---
name: quickapp-reconciliation-checker
description: 执行快应用代理商对账，覆盖账单导入、账单 vs ODS、ODS vs ADS、应用包维表二次排查、代理商维表二次确认，并支持现金消耗和消耗两种口径。Use when the user asks in Chinese or English for 快应用对账、代理商对账、账单对账、财务账单对账、本地账单导入、DataX同步账单、消耗对账、现金消耗对账、ODS和ADS对不上、cash_cost_finance、cost口径、app_code排查、应用包缺失、agent_name异常、代理商缺失排查.
---

# QuickApp Reconciliation Checker

## Trigger Phrases

Use this skill when the user says natural Chinese requests such as:

- 帮我做快应用对账
- 查一下代理商对账
- 账单和ODS对不上
- ODS和ADS金额不一致
- 本地账单导入数据库
- 用DataX同步账单
- 现金消耗对账
- 消耗口径对账
- 查一下应用包是不是丢了
- pp_code异常排查
- 代理商为空怎么排查
- gent_name缺失

## Warehouse Connection

Use the traffic warehouse connection in this order:

1. Prefer MCP server starrocks.
2. If MCP does not respond, use direct read-only fallback:
   - host: e-c-ca028e83ed81e0a7-internal.starrocks.aliyuncs.com
   - port: 9030
   - database: ods_test
   - user: only_read
   - password_env: qp89a0v1AP@f.
3. Fallback SQL must be read-only only: SELECT, WITH, SHOW, or information_schema reads.
4. Do not run DDL, DML, INSERT, UPDATE, DELETE, TRUNCATE, or CREATE through this fallback.
5. DataX execution is the only allowed write path in this skill, and it still requires explicit user confirmation before execution.

## Required Prelude

1. First ask whether the bill data already exists in the traffic warehouse: 账单是否已经有数据库表？如果有，账单数据表名叫什么？如果没有，请告诉我本地账单文件目录和命名规则。
2. If the bill table already exists, confirm the fully qualified bill table name and inspect its schema through starrocks-query-assistant before building reconciliation SQL.
3. If the bill table does not exist, run the local bill import workflow before reconciliation:
   - confirm the local bill file directory, naming rule, file type, delimiter, header row, and target month
   - derive the target table name under ods_test, usually from the file/month naming convention, and confirm it with the user before writing
   - inspect ods_test.agent_finance_bill_data_all_202604 in the traffic warehouse as the reference schema for field names and types
   - generate a DataX job JSON under D:\DataX\datax\job, using D:\DataX\datax\job\xingyun.json only as a local structure reference for 	xtfilereader -> mysqlwriter
   - never print, paste, or expose credentials from any DataX job file; if credentials are needed, reuse the local reference job pattern silently
   - ask for explicit confirmation before executing DataX, because this writes to ods_test
   - execute DataX from D:\DataX\datax and verify imported row count, min/max dt, account count, and amount totals after sync
4. Then ask or confirm the remaining inputs before querying reconciliation results:
   - reconciliation period: start_dt, end_dt
   - all agents in scope
   - which agents use cash_cost reconciliation and which use cost reconciliation
5. Use the connection order from Warehouse Connection: prefer MCP server starrocks; if MCP does not respond, use the direct read-only fallback. Keep reconciliation SQL read-only, and inspect the confirmed/imported bill table schema before building SQL.
6. Build a small metric configuration from that answer:

| metric_type | agents | ODS amount source | ADS target_id | app package source |
|---|---|---|---|---|
| cash_cost | user confirmed agents | ods.ods_quickapp_shortplay_third_ad_account_daily_stat_i_rt_pk_ex, if(cost_platform='iqyOpen', SUM(cash_cost), SUM(cash_cost)/100) | cash_cost_finance | dim.dim_quickapp_ad_cost_account_snapshot_day_i_min_pk |
| cost | user confirmed agents | platform-routed ODS source, SUM(cost); see Cost Metric ODS Source Routing | cost | dim.dim_quickapp_ad_cost_account_snapshot_day_i_min_pk |

Never use pp_code from ods.ods_pub_third_material_record_day_i_rt_pk_ex to diagnose app package quality; it may be misleading. App package checks always use dim.dim_quickapp_ad_cost_account_snapshot_day_i_min_pk.

## Cost Metric ODS Source Routing

For metric_type = 'cost', never use a single fixed ODS table blindly. Select the ODS source by cost_platform_name before Node 1 and Node 2.

Routing rules:

| cost_platform_name | ODS source | Required filters |
|---|---|---|
| xiaoMiOpen | ods.ods_pub_third_utm_source_cost_record_day_i_rt_pk_ex | dt >=  AND dt <=  AND del_flag = 0 |
| 	engXunOpen | ods.ods_pub_third_material_record_hour_i_rt_pk_ex | dt >=  AND dt <=  AND del_flag = 0 |
| other platforms | ods.ods_pub_third_material_record_day_i_rt_pk_ex | dt >=  AND dt <=  AND del_flag = 0, and exclude 	engXunOpen, juLiangOpen title rows, and xiaoMiOpen |

Other platform filter example:

`sql
WHERE TRUE
  AND (
    cost_platform NOT IN ('tengXunOpen','juLiangOpen','xiaoMiOpen')
    OR (cost_platform = 'juLiangOpen' AND image_mode <> '标题')
  )
  AND del_flag = 0
`

Therefore cost-metric reconciliation must always carry gent_name + cost_platform_name + account_id + dt, not only ccount_id + dt.

## Cost Platform Mapping

Normalize bill-side Chinese platform names before reconciliation:

| bill Chinese platform | mapped English name |
|---|---|
| 腾讯广告 | 	engXunOpen |
| 巨量引擎、头条、巨量广告 | juLiangOpen |
| 爱奇艺 | iqyOpen |
| 快手 | ciLiOpen |
| 趣头条 | quTouTiaoOpen |
| 支付宝 | zhifubaoOpen |
| 汇川 | ucOpen |
| 萤火虫 | ireflyOpen |
| 华为ads | huaWeiOpen |
| 荣耀联盟 | honorOpen |
| sigmob | sigmobOpen |
| other unrecognized | - |

Important rules:

1. If any row maps to -, stop reconciliation, output the unmapped platform details, and ask the user to complete the mapping.
2. Do not auto-merge unknown platforms into other platforms.
3. If one agent maps to multiple platforms, all later reconciliation must be split by platform, not only by agent.

## Workflow

### Node 1: Bill vs ODS

Goal: verify bill ccount_id + dt amounts are present in ODS and roughly aligned.

Rules:
- diff = bill_amount - ods_amount
- anomaly if ODS is missing
- anomaly if ABS(diff) > 1
- -1 <= diff <= 1 is acceptable

Before comparing amounts, run bill data quality checks. Return detail rows for these special cases:
- bill dt is null
- bill dt format is invalid
- bill ccount_id is null or empty
- bill amount is null
- bill date is outside the reconciliation period
- bill has duplicate detail rows for the same ccount_id + dt after expected aggregation
- required bill fields are missing or cannot be mapped

Bill quality output fields:
check_node, quality_type, ccount_id, dt, aw_dt, ill_amount, ow_count, detail_message, suggestion.

Node 1 anomaly output must be repairable detail data, not only summaries. Always return the exact ccount_id + dt, bill amount, ODS amount, diff, and row counts.

Output fields:
check_node, gent_name, metric_type, 	arget_id, bnormal_type, ccount_id, dt, ill_amount, ods_amount, diff, 	hreshold_desc, ill_row_count, ods_row_count, detail_message, suggestion, ill_cost_platform, cost_platform_name.

Anomaly types:
- ODS缺失
- 金额差异超阈值

### Node 2: ODS vs ADS

Goal: verify ODS amounts enter ADS exactly under the metric-specific 	arget_id.

Rules:
- cash_cost agents compare ODS cash amount to ADS 	arget_id = 'cash_cost_finance'
- cost agents compare ODS cost amount to ADS 	arget_id = 'cost'
- no threshold: ODS and ADS should be equal
- anomaly if ADS is missing
- anomaly if ods_amount != ads_amount

For every Node 2 anomaly, run the app package second check against dim.dim_quickapp_ad_cost_account_snapshot_day_i_min_pk by ccount_id + dt.

If ccount_id + dt has no app package snapshot, look up the nearest valid app package for the same account from surrounding dates. A valid app package must have pp_code LIKE 'com.%'. Use the nearest date as a reference recommendation.

For each missing app package, return:
ccount_id, missing_dt, eference_dt, eference_cost_platform, eference_app_code, pp_fix_suggestion.

After all Node 2 app package checks, summarize every missing app package and generate a batch INSERT INTO dim.dim_quickapp_ad_cost_account_snapshot_day_i_min_pk (...) VALUES ... statement for the user to execute manually. Do not execute the INSERT automatically.

Generated INSERT rules:
- dt uses the missing date formatted as yyyy-MM-dd
- cost_platform uses the nearest reference row
- ccount_id uses the missing account
- pp_code uses the nearest reference row
- create_time and update_time are dt + ' 00:00:00'
- skip rows where no valid reference app package is found, and list them separately as 无法自动建议应用包

Output fields:
check_node, gent_name, ill_cost_platform, cost_platform_name, metric_type, 	arget_id, bnormal_type, ccount_id, dt, ods_amount, ds_amount, diff, dim_record_cnt, cost_platform_list, pp_code_list, 
ormal_app_cnt, pp_code_check_status, eference_dt, eference_cost_platform, eference_app_code, detail_message, suggestion.

Node 2 anomaly types:
- ADS缺失
- ODS_ADS金额不一致

App package statuses:
- 应用包快照缺失
- pp_code为空
- pp_code为空字符串
- pp_code为占位符
- pp_code格式异常
- pp_code正常

### Node 3: ADS Agent Dimension Check

Goal: verify ADS rows with reconciled metric amounts have a valid gent_name.

Rules:
- for cash_cost agents, inspect ADS 	arget_id = 'cash_cost_finance'
- for cost agents, inspect ADS 	arget_id = 'cost'
- anomaly if gent_name IS NULL, TRIM(agent_name) = '', or TRIM(agent_name) = '-'

For every Node 3 anomaly, run the agent dimension second check against dim.dim_pub_account_agent_relation_fp_min_pk_ex by ccount_id + dt.

Output fields:
check_node, gent_name, ill_cost_platform, cost_platform_name, metric_type, 	arget_id, bnormal_type, ccount_id, dt, ds_agent_name, ds_amount, dim_record_cnt, dim_agent_name_list, dim_valid_agent_cnt, gent_check_status, suggestion.

Agent second-check statuses:
- 代理商维表快照缺失
- 维表代理商也异常
- 维表代理商正常_ADS关联异常
- 维表存在多个有效代理商

## Reporting

Summarize in Chinese. For each node, report row count, affected accounts, affected dates, top abnormal statuses, and representative rows. If a node has no anomalies, state that clearly. Always mention the confirmed reconciliation period, agent metric split, and that the traffic warehouse was used.

See [SQL_REFERENCE.md](SQL_REFERENCE.md) for query templates.