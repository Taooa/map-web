# Coordinate Toolkit V2 开放问题

## 说明

以下问题来自 PRD V2、TASKS V2、ARCHITECTURE、ADR-001～ADR-005 和 PROJECT-STRUCTURE 的一致性检查。此文档只记录问题，不直接修改已有文档。

| 问题 | 影响 | 建议 |
|-|-|-|
| Point编辑是否属于V1不明确：PRD的核心列表和主流程只明确查看、删除等能力，TASKS中出现“详情和删除”，PROJECT-STRUCTURE则描述新增/编辑/删除 | 决定Feature用例、表格操作、缓存失效和验收范围 | 产品确认后，在下一轮统一PRD、TASKS和结构文档；未确认前不把编辑作为Phase 1数据契约硬要求 |
| settings存储口径存在表面冲突：PRD概述称设置进localStorage，Architecture/ADR-004又定义IndexedDB `settings`和localStorage凭据/小配置 | 影响schema、SettingsRepository和备份范围 | 明确定义：IndexedDB保存产品设置，localStorage只保存地图凭据与启动必需小配置；统一键名和导出策略 |
| PRD将上海2000列为正式支持，同时又要求验证通过后才正式启用 | 影响UI是否展示、验收是否阻塞和用户对结果可信度的理解 | 区分“V1目标支持”与“当前可用状态”；验证前Registry状态为disabled/experimental，验证通过才开放 |
| TASKS Phase 2把“完成上海2000与CGCS2000验证”放在同一任务，但PRD规定CGCS2000默认不开放且场景待确认 | 可能把扩展研究误当成V1发布阻塞 | 上海2000设为V1启用门槛；CGCS2000只要求完成场景/天地图契约结论，不要求对用户开放 |
| 天地图目标坐标存在CGCS2000与WGS84兼容显示两种表述 | 直接影响转换路径和地图落点正确性 | 以官方SDK契约和真实样本验证；结论写入Provider配置和验证文档，禁止Adapter隐式近似 |
| 地图聚合/海量点在PRD非功能要求中接近默认能力，但ADR-003的Capability允许平台差异 | 影响三平台验收一致性和性能承诺 | 定义平台级最低验收：普通Marker必须；聚合/海量点按Capability和数据上限声明，不要求三个SDK实现完全相同 |
| 有限底图切换在PRD/Architecture中被保留，但各平台具体底图集合和V1最低要求未定 | 影响Capability、设置UI和地图页验收 | 为高德、百度、天地图分别列出允许的底图枚举；未验证的类型不显示 |
| API Key在PRD中保存到localStorage，IndexedDB又包含settings；凭据是否参与设置导出未完全统一 | 可能意外导出Key或导致迁移重复 | 按ADR-004将凭据从普通settings和导出中排除；独立命名空间和清除操作 |
| PRD要求Excel选择工作表，而旧实现只读第一个工作表；“复用Excel能力”的成熟度表述可能被误读 | 影响迁移等级和验收预期 | 定义为M2：复用SheetJS经验和读取行为，工作表选择、错误处理重新设计 |
| “已有测试”与“已验证可用”没有统一门槛；参考项目测试本次未执行，且坐标精度样本不足 | 容易把静态测试文件误当成生产基线 | Phase 1前确定基线测试执行环境、金样本来源和通过标准；未经执行统一标记“有测试资产、未验证” |
| PROJECT-STRUCTURE顺序先Storage后Coordinate Engine，而TASKS V2先核心业务模块再本地数据层 | 影响里程碑排期，但不构成架构冲突 | 采用结构文档的实现顺序：Domain后先稳定Repository接口，再并行推进Storage与Coordinate Core；同步更新正式执行计划时说明依赖 |
| 是否把浏览器定位作为V1地图基础控件不明确：旧高德实现有定位，PRD未列入核心范围 | 影响权限提示、跨平台一致性和隐私说明 | 默认M4不迁移；若产品需要，另立小型决策并按Capability逐平台验收 |

## 关闭规则

- 每个问题必须有产品或架构责任人；
- 影响数据模型、坐标精度或安全的事项必须在对应实现前关闭；
- 关闭时记录决策文档和日期；
- 不通过直接修改reference项目来解决开放问题。

