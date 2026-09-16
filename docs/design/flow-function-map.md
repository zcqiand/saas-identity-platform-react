# Function Flow Map — saas-identity-platform-react （已废段镜像豁免，9/7 迁移前快照）

> 本仓流程图与豁免清单。L5 alignment 脚本 `orphan_whitelist()` 读取 `### 孤儿功能` 段作为白名单锚点。
>
> **依据**：[ADR-0020 §2 子集约束](../../../docs/adr/0020-base-tree-collects-i-level.md)（消费仓 ⊆ BASE = 合法；少镜像 = DECLARED_GAP 声明豁免）+ [`docs/conventions/sync-architecture.md` §11.5](../../../docs/conventions/sync-architecture.md#115-同步流程补充字段值变更)。

## 1. 流程图（占位）

> 本仓是 SaaS 家族消费仓，跨仓流程锚点在 shared 仓 [docs/design/flow-function-map.md](../../saas-identity-platform-shared/docs/design/flow-function-map.md)。本仓无独立流程图。

## 2. 孤儿功能（declared_gap 豁免清单）

> 镜像豁免：本仓不参与以下 BASE I ID 的实现，按 ADR-0020 §2 DECLARED_GAP 声明豁免。

| I ID | 名称 | 豁免理由 |
|---|---|---|
| **M01.F04.I01** | 密码登录 API | react/vue 是前端仓，不实现后端 op；saas-shared M01.F04.I01 由 saas-aspnetcore / saas-springboot / saas-msw 提供 |
| **M04.F03.I01** | 授权码签发 | react/vue 是前端仓，不实现 saas IdP；saas-shared M04.F03 由 saas-aspnetcore / saas-springboot / saas-msw 提供 OAuth 协议实现 |
| **M04.F03.I02** | 令牌交换 | 同上 |
| **M04.F03.I03** | 令牌刷新 | 同上 |

> 豁免类别：**前端仓不实现纯后端 op**（按 [spec §2 子项表交付列判定](https://example.com/spec) + [iid-binding-rules.md §7 R5](../../saas-identity-platform-shared/docs/design/iid-binding-rules.md#7-例外清单rule-based)）。
>
> - react/vue 不实现纯后端 API（密码登录 / OAuth 协议签发）—— 由 saas 后端仓 + msw 提供
> - 镜像行已删除（不在 function-tree.md 中）
> - L5 matrix 不报这 7 个 I ID 的 react/vue delivery 错位（不再参与镜像比对）

# Function Flow Map — saas-identity-platform-react

> 本仓流程图与豁免清单。L5 alignment 脚本 `orphan_whitelist()` 读取 `### 孤儿功能` 段作为白名单锚点。
>
> **依据**：[ADR-0020 §2 子集约束](../../../docs/adr/0020-base-tree-collects-i-level.md)（消费仓 ⊆ BASE = 合法；少镜像 = DECLARED_GAP 声明豁免）+ [`docs/conventions/sync-architecture.md` §11.5](../../../docs/conventions/sync-architecture.md#115-同步流程补充字段值变更)。

## § 1. 纯后端 op declared_gap 豁免清单（M01.F04 + M04.F03）


| I ID | 名称 | 豁免理由 |
|---|---|---|
| **M01.F04.I01** | 密码登录 API | react/vue 是前端仓，不实现后端 op；saas-shared M01.F04.I01 由 saas-aspnetcore / saas-springboot / saas-msw 提供 |
| **M04.F03.I01** | 授权码签发 | react/vue 是前端仓，不实现 saas IdP；saas-shared M04.F03 由 saas-aspnetcore / saas-springboot / saas-msw 提供 OAuth 协议实现 |
| **M04.F03.I02** | 令牌交换 | 同上 |
| **M04.F03.I03** | 令牌刷新 | 同上 |


### 1.1 豁免类别

> 豁免类别：**前端仓不实现纯后端 op**（按 [spec §2 子项表交付列判定](https://example.com/spec) + [iid-binding-rules.md §7 R5](../../saas-identity-platform-shared/docs/design/iid-binding-rules.md#7-例外清单rule-based)）。
>
> - react/vue 不实现纯后端 API（密码登录 / OAuth 协议签发）—— 由 saas 后端仓 + msw 提供
> - 镜像行已删除（不在 function-tree.md 中）
> - L5 matrix 不报这 7 个 I ID 的 react/vue delivery 错位（不再参与镜像比对）



## § 3. 已废弃段镜像豁免（2026-09-09 扩展）

> react/vue 仓对 [deprecated-items.md](../../saas-identity-platform-shared/docs/functions/deprecated-items.md) § 1 已废弃 I ID 的镜像全部删除（合计 35 行 / 仓），按 ADR-0020 §2 子集约束声明豁免。
>
> 豁免类别：
> - **前端仓不镜像已迁移段**：react/vue 不实现旧 op（由新 canonical ID 实现）
> - **前端仓不镜像已废段**：react/vue 不实现废弃 op（M05 / M06）


| I ID | 模块 | 豁免理由 |
|---|---|---|
| **M01.F01.I02** | 已迁 | 旧版：在租户下创建用户 → M00.F02.I02（已迁） |
| **M02.F01.I01-I05** | 已迁 | 旧版角色 CRUD → M00.F03（已迁）|
| **M02.F02.I01** | 已迁 | 旧版权限矩阵 → M00.F04.I01（已迁）|
| **M03.F01.I01-I02** | 已迁 | 旧版密码登录 → M01.F04.I01-I02（已迁）|
| **M03.F02.I03-I04** | 已迁 | 旧版 OIDC/refresh → M01.F04.I04-I05（已迁，2026-09-16 I04/I05 再合并到 M04.F03.I02 双 grant）|
| **M03.F03.I05-I06** | 已迁 | 旧版登出 → M01.F04.I06-I07（已迁）|
| **M05.F01.I01-I05** | 已废 | 旧版 API Key（目标 DDL 不再包含 `api_keys`）|
| **M06.F01.I01-I03** | 已废 | 旧版审计事件（目标 DDL 不再包含 `audit_events`）|
| **M06.F02.I04** | 已废 | 旧版留存策略（重复编号）|
| **M08.F01.I01-I05** | 已迁 | 旧版菜单 CRUD → M04.F04.I01-I05（已迁）|
| **M08.F02.I06-I07** | 已迁 | 旧版菜单排序/切父 → M04.F04.I06-I07（已迁）|
| **M09.F01.I01** | 已迁 | 旧版角色菜单查询 → M00.F04.I02（已迁）|
| **M09.F02.I02-I03** | 已迁 | 旧版角色菜单设置/清空 → M00.F04.I03-I04（已迁）|
| **M09.F03.I02-I04** | 已迁 | 旧版角色菜单 ID 查询/装配/client 分组 → M04.F04.I08（已迁）|


### 3.1 变更历史（增量）

- **2026-09-09 § 3**：react/vue 仓删除 35 行已废弃段镜像（M01.F01.I02 + M02/M03/M05/M06/M08/M09 全段），按 ADR-0020 §2 子集约束声明豁免。matrix fork 数从 19 → 7（预期）。



### 4. 变更历史（合并）


- **2026-09-09**：按 sync-architecture.md §11.5 推荐 + ADR-0020 §2 子集约束，react/vue 仓新建本文件，声明 7 个 I ID declared_gap（[iid-binding-rules.md §8](../../saas-identity-platform-shared/docs/design/iid-binding-rules.md) §7 R5 同步记录）。function-tree.md 删除对应 7 行镜像。
