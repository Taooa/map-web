# Coordinate Toolkit 产品化重构任务 V2

> 对应 PRD：[`Coordinate-Toolkit-PRD-V2.md`](./Coordinate-Toolkit-PRD-V2.md)  
> 设计规范：[`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)  
> 参考分析：[`REFERENCE-ANALYSIS.md`](./REFERENCE-ANALYSIS.md)  
> 状态：Draft  
> 更新日期：2026-07-28

## 0. 任务定位

本计划不是从零实现地图工具，而是对已有 `map-tools` 业务能力进行产品化迁移和重构，并参考 `gisviewer-react` 重建地图架构。

执行策略：

> 功能复用，架构重构，UI 重做。

### 0.1 能力来源

| 来源 | 主要价值 |
| --- | --- |
| `reference/map-tools` | 坐标转换、文件解析、字段处理、点位流程、三地图展示、Marker、SDK加载 |
| `reference/gisviewer-react` | 地图容器、配置驱动、能力模块、生命周期和大量点经验 |
| PeachTools Design System | 主题、组件、页面布局、状态和交互规范 |

### 0.2 开发约束

不要：

- 删除尚未完成评估的成熟逻辑；
- 重新发明 WGS84、GCJ02、BD09、上海2000转换算法；
- 因目录调整而改变已经验证的业务结果；
- 直接复制整个参考项目或照搬旧页面结构；
- 用空函数声明平台能力已支持；
- 为了架构抽象牺牲简单性；
- 提前实现 GeoJSON、自动坐标识别、异常点判断、区域校验、用户系统和后端。

优先：

- 验证已有能力和边界条件；
- 为旧逻辑补回归测试；
- 用适配层包裹稳定逻辑；
- 模块化封装；
- 修复已确认的问题；
- 提升可维护性、可测试性和生命周期安全；
- 保持用户流程连续。

### 0.3 迁移分类

每个旧模块必须先归入以下类别之一：

| 分类 | 含义 |
| --- | --- |
| M1 迁移并封装 | 逻辑正确，只需适配新类型和模块边界 |
| M2 保留思路并重构 | 业务行为可用，但结构或生命周期需要调整 |
| M3 重新实现 | 已确认存在正确性、安全或兼容问题 |
| M4 不迁移 | 超出 V1 或偏离产品定位 |

### 0.4 阶段结构

| Phase | 内容 |
| --- | --- |
| Phase 0 | 参考代码分析与能力迁移规划 |
| Phase 1 | 项目架构初始化 |
| Phase 2 | 核心业务模块重构 |
| Phase 3 | 本地数据层 |
| Phase 4 | 点位管理页面 |
| Phase 5 | 地图核心架构 |
| Phase 6 | 地图页面实现 |
| Phase 7 | UI优化和性能优化 |

---

# Phase 0：参考代码分析与能力迁移规划

## P0-01 建立 map-tools 模块清单

**目标**

逐文件确认 `map-tools` 已有业务能力、依赖关系、输入输出和已知问题。

**已有输入**

- `src/hooks/useCoordTransform.ts`
- `src/utils/file.ts`
- `src/utils/mapUtils.ts`
- `src/utils/mapLoader.ts`
- 三个地图 Hook
- `MapVisual.tsx`、`CoordConvert.tsx`
- components、types、tests 和自带文档

**输出**

- 模块能力清单；
- 调用关系图；
- 每个模块的 M1–M4 分类；
- 未覆盖边界条件。

**修改文件**

- `docs/migration/MAP-TOOLS-INVENTORY.md`
- `docs/migration/MIGRATION-MATRIX.md`

**验收标准**

- 坐标、文件、点位、地图、Marker、SDK、工具能力均有归类；
- 文档声称完成但代码为空的能力被标记；
- 未经分析的旧模块不能直接删除或替换；
- 每项迁移有负责人和验证方式。

## P0-02 建立 gisviewer-react 架构参考清单

**目标**

提取适用于 V2 的地图架构经验，明确不应带入的重型能力。

**已有输入**

- `MapContainer.tsx`
- `MapAppArcgis2D.ts`
- `MapAppArcgis3D.ts`
- Widgets、配置和类型

**输出**

- 可参考的生命周期、配置和模块模式；
- 不迁移依赖与功能清单；
- MapAdapter 设计约束。

**修改文件**

- `docs/migration/GISVIEWER-ARCHITECTURE-NOTES.md`
- `docs/ARCHITECTURE.md`

**验收标准**

- 明确 Facade、Adapter、Widget、配置驱动各自可参考部分；
- ArcGIS、3D、轨迹、热力等不进入 V1；
- 不把 gisviewer-react 误写成高德/百度/天地图现成 Adapter；
- 生命周期建议包含初始化、事件、覆盖物和销毁。

## P0-03 为成熟业务逻辑建立基线测试

**目标**

先固定旧项目正确行为，再进行迁移。

**已有输入**

- map-tools 现有测试；
- 真实或权威坐标样本；
- Excel/CSV/JSON 样例；
- 三地图基本展示行为。

**输出**

- 坐标转换基线 fixture；
- 文件解析 fixture；
- 字段映射用例；
- Point 处理快照；
- 已知缺陷清单。

**修改文件**

- `tests/legacy-baseline/coordinate-transform.*`
- `tests/legacy-baseline/file-parsing.*`
- `tests/legacy-baseline/field-mapping.*`
- `tests/fixtures/*`
- `docs/migration/KNOWN-ISSUES.md`

**验收标准**

- 已验证逻辑有可重复测试；
- 错误行为不被当成新系统标准；
- CSV split、无效坐标变 0、批量 Marker 清空等问题标为需修复；
- 基线测试不依赖真实地图凭据。

## P0-04 确认坐标体系迁移方案

**目标**

确定正式坐标系、扩展坐标系和上海2000验证计划。

**已有输入**

- map-tools 的 gcoord/proj4 和 TRANSFORM_PATHS；
- SH2000 投影参数；
- PRD V2 坐标体系状态。

**输出**

- WGS84/GCJ02/BD09迁移结论；
- 上海2000验证计划；
- CGCS2000扩展验证计划；
- 天地图坐标契约待办；
- 算法版本策略。

**修改文件**

- `docs/ARCHITECTURE.md`
- `docs/migration/COORDINATE-MIGRATION.md`
- `tests/fixtures/coordinate-transform.json`

**验收标准**

- 不重新发明已有转换算法；
- 上海2000被定义为已有基础、待验证；
- 参数、投影、EPSG、XY轴序、样本和精度均有责任项；
- CGCS2000不默认进入用户入口；
- 未验证假设不会静默进入生产结果。

## P0-05 评审迁移计划

**目标**

在开始编码前确认哪些逻辑迁移、重构、重写或舍弃。

**已有输入**

- P0-01 至 P0-04 产出；
- PRD V2；
- 设计系统。

**输出**

- 经评审的 Migration Matrix；
- 架构决策记录；
- Phase 1–7 调整项。

**修改文件**

- `docs/migration/MIGRATION-MATRIX.md`
- `docs/decisions/ADR-001-productization-strategy.md`

**验收标准**

- 每个核心能力都有 M1–M4 结论；
- “重新实现”必须有明确原因；
- “复用”必须有测试或验证计划；
- 产品、架构和 UI 责任边界已确认。

---

# Phase 1：项目架构初始化

## P1-01 建立 V2 工程骨架

**目标**

建立承载迁移模块的轻量工程结构，不复制参考项目。

**已有输入**

- 迁移矩阵；
- 目标仓库位置；
- React + TypeScript + Vite 技术基线。

**输出**

- 可运行、可测试、可构建的应用；
- app/pages/features/domain/core/adapters 分层；
- 统一脚本和路径别名。

**修改文件**

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/main.tsx`
- `src/app/App.tsx`
- 基础目录

**验收标准**

- TypeScript 严格模式；
- typecheck/test/build 通过；
- 不带入旧项目无关依赖；
- 工程结构与迁移矩阵相符；
- 旧逻辑有明确落点而非散落复制。

## P1-02 建立路由和基础布局

**目标**

形成首页、Point Manager 和三个地图页的产品信息架构。

**已有输入**

- 旧项目四路由经验；
- PRD V2 页面结构；
- PeachTools 布局规范。

**输出**

- `/`
- `/points`
- `/map/amap`
- `/map/baidu`
- `/map/tianditu`
- 全局导航与 404

**修改文件**

- `src/app/router.tsx`
- `src/components/AppNavigation.tsx`
- `src/pages/*`

**验收标准**

- 五个路由可直接访问和刷新；
- 三地图保持独立页面；
- 坐标转换不再作为孤立核心页，而进入 Point Manager；
- 首页不是后台 Dashboard。

## P1-03 接入 PeachTools Design System

**目标**

统一主题、Token、组件和状态反馈。

**已有输入**

- `docs/DESIGN-SYSTEM.md`
- PeachTools 现有组件/Token包（如有）
- map-tools 现有交互流程

**输出**

- 深浅主题；
- 公共 Button/Form/Dialog/Drawer/Table/State 组件使用规范；
- 主题本地保存。

**修改文件**

- `src/styles/*`
- `src/app/ThemeProvider.tsx`
- `src/components/*`
- `src/features/settings/themeStorage.ts`

**验收标准**

- 不沿用旧页面不一致的硬编码样式；
- 业务流程和操作名称保持连续；
- 状态不只依赖颜色；
- 关键 Dialog 可键盘操作；
- 页面使用语义 Token。

## P1-04 建立领域类型系统

**目标**

为旧逻辑迁移提供统一 Point、Coordinate、Source 和结果类型。

**已有输入**

- map-tools Point/TransformResult；
- PRD V2 数据模型；
- 迁移矩阵。

**输出**

- 新领域类型；
- legacy-to-domain 映射边界；
- 判别式错误结果。

**修改文件**

- `src/domain/point/*`
- `src/domain/coordinate/*`
- `src/domain/import/*`
- `src/adapters/legacy/*`

**验收标准**

- Point 只含 id/name/source/coordinates；
- original 与 converted 分离；
- 不保留 rawData；
- 失败不返回伪 `(0,0)`；
- 旧模型只存在于迁移适配边界。

---

# Phase 2：核心业务模块重构

## P2-01 迁移坐标转换核心

**目标**

将 map-tools 已有转换逻辑从 React Hook 中分离为纯业务模块。

**已有输入**

- `useCoordTransform.ts`
- `coordParams.ts`
- P0 基线测试
- gcoord/proj4

**输出**

- CoordinateTransformer；
- 显式转换路径；
- 算法版本；
- 兼容旧结果的回归测试。

**修改文件**

- `src/core/coordinate/*`
- `src/adapters/coordinates/*`
- `src/adapters/coordinates/__tests__/*`

**验收标准**

- 已验证结果与旧基线一致；
- React 页面不再持有算法；
- 同系转换无损；
- 错误结果明确；
- 上海2000保留现有基础并挂接验证开关；
- 未无理由替换成熟算法。

## P2-02 完成上海2000与CGCS2000验证

**目标**

验证已有 proj4 参数和扩展坐标关系，形成启用结论。

**已有输入**

- 旧 SH2000/CGCS2000 定义；
- EPSG/地方投影资料；
- 权威样本；
- 天地图契约。

**输出**

- 参数确认记录；
- 投影定义和轴序；
- 精度报告；
- 上海2000启用状态；
- CGCS2000扩展状态。

**修改文件**

- `docs/ARCHITECTURE.md`
- `docs/validation/SHANGHAI2000.md`
- `docs/validation/CGCS2000.md`
- `tests/fixtures/coordinate-transform.json`

**验收标准**

- 参数来源、EPSG信息、X/Y轴序和单位明确；
- 双向样本满足精度标准；
- 上海2000验证通过后正式启用；
- CGCS2000不经产品确认不显示为普通入口；
- 失败不是“无法实现”，而是有明确待办或限制。

## P2-03 重构文件解析边界

**目标**

保留旧项目浏览器端文件处理能力，统一为 Parser 接口。

**已有输入**

- map-tools `file.ts`
- SheetJS经验；
- Excel/CSV/JSON 基线 fixture。

**输出**

- ExcelParser；
- CsvParser；
- JsonParser；
- ParsedDataset；
- 统一错误。

**修改文件**

- `src/adapters/files/*`
- `src/adapters/files/__tests__/*`

**验收标准**

- Excel 复用旧项目已验证的 SheetJS 处理思路；
- CSV 替换不完整 split，但保持用户流程；
- JSON V1 只接受对象数组；
- 不支持 GeoJSON；
- 无效数据不自动变 0；
- Parser 不写数据库。

## P2-04 重构字段映射和点位规范化

**目标**

保留字段映射流程，将自动匹配降为可确认的预填建议。

**已有输入**

- `matchCoordinateFields`
- 旧批量导入页面；
- 新 Point/Source。

**输出**

- FieldSuggestion；
- ImportMapping；
- normalizeRows；
- skipped 统计。

**修改文件**

- `src/features/import/fieldSuggestion.ts`
- `src/features/import/normalizeRows.ts`
- `src/domain/import/*`
- 对应测试

**验收标准**

- 用户必须确认 name/x/y；
- 不自动识别坐标系；
- 旧字段匹配规则有回归测试；
- 误匹配不会自动提交；
- 规范化后不含无关业务字段。

## P2-05 重构单个/批量业务用例

**目标**

把旧页面中的新增、批量转换、地图坐标准备流程拆为可复用用例。

**已有输入**

- `MapVisual.tsx`
- `CoordConvert.tsx`
- Point/Coordinate 模型；
- CoordinateTransformer。

**输出**

- addPoint；
- transformPoint/transformPoints；
- prepareMapPoints；
- 结构化进度和部分失败结果。

**修改文件**

- `src/features/points/addPoint.ts`
- `src/features/coordinate-transform/*`
- `src/features/map-validation/prepareMapPoints.ts`
- 对应测试

**验收标准**

- 业务用例不依赖页面组件；
- 单点失败不阻断整批；
- 成功结果可缓存；
- 原始坐标不被覆盖；
- 与旧正确流程保持一致。

---

# Phase 3：本地数据层

## P3-01 设计 IndexedDB schema

**目标**

让迁移后的 Point、ImportRecord 和转换缓存可本地持久化。

**已有输入**

- 新领域模型；
- 点位/导入/转换用例；
- PRD 存储要求。

**输出**

- `points` store；
- `imports` store；
- schema version 和 migration。

**修改文件**

- `src/adapters/storage/database.ts`
- `src/adapters/storage/schema.ts`
- `src/adapters/storage/migrations.ts`
- 数据库测试

**验收标准**

- 刷新后数据保留；
- schema 可升级；
- converted 随 Point 保存；
- 导入记录不保存原始文件；
- 存储失败有结构化错误。

## P3-02 实现 Repository

**目标**

让业务用例通过接口访问本地数据，而不是直接操作 IndexedDB。

**已有输入**

- PointRepository/ImportRepository 接口；
- IndexedDB schema；
- 旧页面的数据操作语义。

**输出**

- IndexedDbPointRepository；
- IndexedDbImportRepository；
- 批量事务。

**修改文件**

- `src/domain/*/*Repository.ts`
- `src/adapters/storage/IndexedDb*Repository.ts`
- Repository 测试

**验收标准**

- CRUD 和批量操作通过；
- 坐标更新不覆盖 original；
- 并发目标坐标更新不丢数据；
- 失败不产生成功导入记录；
- 页面不接触原生 IDB API。

## P3-03 实现设置存储

**目标**

保存地图凭据、主题和基础设置。

**已有输入**

- 旧项目环境变量配置经验；
- 新的用户本地配置需求。

**输出**

- LocalSettingsStorage；
- 凭据脱敏；
- 损坏数据回退。

**修改文件**

- `src/adapters/storage/LocalSettingsStorage.ts`
- `src/features/settings/*`
- 设置测试

**验收标准**

- 支持高德 Key、百度 AK、天地图 Token；
- 刷新后恢复；
- 无效 JSON 不崩溃；
- 日志和 URL 不出现完整凭据；
- 无 Key 时地图 Loader 不运行。

## P3-04 设计旧数据迁移策略

**目标**

若旧工具存在可导出的数据或浏览器状态，明确是否以及如何导入新模型。

**已有输入**

- map-tools 当前内存模型和导出格式；
- 新 Point/ImportRecord；
- 产品数据迁移需求。

**输出**

- 数据兼容结论；
- 可选 legacy importer；
- 不兼容说明。

**修改文件**

- `docs/migration/DATA-MIGRATION.md`
- `src/adapters/legacy/legacyPointImporter.ts`（如需要）
- 对应测试

**验收标准**

- 不假设旧项目已有 IndexedDB；
- 可迁移字段映射明确；
- rawData 不进入新 Point；
- 不需要迁移时有书面结论。

---

# Phase 4：点位管理页面

## P4-01 实现 Point Manager 工作台

**目标**

把旧地图页和转换页分散的数据操作集中到 Point Manager。

**已有输入**

- 旧 PointInput、TablePreview、CoordSelect 交互；
- 新业务用例和 Repository；
- PeachTools 组件。

**输出**

- Header；
- Toolbar；
- 点位表格；
- 搜索、选择和坐标状态。

**修改文件**

- `src/pages/PointsPage.tsx`
- `src/features/points/PointsHeader.tsx`
- `PointsToolbar.tsx`
- `PointsTable.tsx`
- `CoordinateStatus.tsx`

**验收标准**

- 新增、导入、转换、地图查看入口集中；
- 默认不展开所有坐标；
- 搜索和全选当前结果正确；
- 刷新恢复数据；
- UI符合 PeachTools Design System。

## P4-02 实现新增、详情和删除

**目标**

完成点位的基础管理闭环。

**已有输入**

- 旧 PointInput 行为；
- 新 Point 模型；
- Repository。

**输出**

- AddPointDialog；
- PointDetailsDrawer；
- DeletePointsDialog。

**修改文件**

- `src/features/points/AddPointDialog.tsx`
- `PointDetailsDrawer.tsx`
- `DeletePointsDialog.tsx`
- 对应测试

**验收标准**

- 默认 WGS84；
- 新增成功清空输入；
- 详情区分 original/converted；
- 单删/批删有确认；
- 不增加自动识别和异常判断。

## P4-03 实现统一导入 UI

**目标**

将旧文件上传和字段下拉重做为分步导入流程。

**已有输入**

- 旧 FileUpload 和批量页面；
- 新 Parser、FieldSuggestion、normalizeRows；
- PeachTools Dialog/Drawer。

**输出**

- 文件/JSON粘贴入口；
- 数据预览；
- 字段映射；
- 坐标系选择；
- 导入结果。

**修改文件**

- `src/features/import/ImportDialog.tsx`
- `DataSourceStep.tsx`
- `FieldMappingStep.tsx`
- `ImportPreview.tsx`
- `ImportResult.tsx`

**验收标准**

- Excel/CSV/JSON文件和JSON粘贴完整；
- 一个批次一个坐标系；
- 用户确认字段；
- 确认前不写数据库；
- imported/skipped 与实际一致。

## P4-04 实现转换交互

**目标**

迁移旧单点/批量转换能力到 Point Manager。

**已有输入**

- 旧 CoordConvert 流程；
- transformPoint/transformPoints；
- 转换缓存。

**输出**

- ConvertCoordinatesDialog；
- 批量进度；
- 成功、失败、缓存命中反馈。

**修改文件**

- `src/features/coordinate-transform/ConvertCoordinatesDialog.tsx`
- `ConversionResult.tsx`
- `useCoordinateConversion.ts`
- Point Manager 集成

**验收标准**

- 单个和批量共用业务服务；
- 用户选择目标坐标系；
- 不重复计算有效缓存；
- 部分失败不阻断成功；
- 列表坐标状态即时更新。

## P4-05 实现首页

**目标**

用 PeachTools UI 建立产品入口，而不是后台首页。

**已有输入**

- PRD 首页；
- Design System；
- 工具入口和平台资源。

**输出**

- Hero；
- 功能介绍；
- 导入→管理→转换→验证流程；
- 工具和平台资源入口。

**修改文件**

- `src/pages/HomePage.tsx`
- `src/features/home/*`
- `src/config/mapPlatformLinks.ts`

**验收标准**

- 定位显示“设备点位坐标转换与地图验证工作台”；
- 主 CTA 进入 Point Manager；
- 不展示后台统计卡；
- 外链安全且标记第三方。

---

# Phase 5：地图核心架构

## P5-01 设计 MapCore 与 MapAdapter

**目标**

参考 gisviewer-react 的分层思想，为三家地图建立最小公共契约。

**已有输入**

- gisviewer-react MapContainer/MapApp/Widgets；
- map-tools MapHookReturn 和三个 Hook；
- P0 架构结论。

**输出**

```text
MapCore
├── AMapAdapter
├── BaiduAdapter
└── TiandituAdapter
```

- MapAdapter；
- MapCapability；
- MapEvent；
- MapPointView；
- ProviderRegistry。

**修改文件**

- `src/core/map/*`
- `docs/ARCHITECTURE.md`
- Adapter contract tests

**验收标准**

- 基础接口只含共同且真实支持的能力；
- 绘制/测量是可选 Capability；
- Adapter不做坐标转换；
- 页面只创建当前平台 Adapter；
- 抽象层比旧 MapContainer 更小、更强类型。

## P5-02 重构地图 SDK Loader

**目标**

保留旧项目动态加载和 Promise 去重思路，修复脚本与回调生命周期。

**已有输入**

- map-tools `mapLoader.ts`；
- 三平台 SDK；
- 本地凭据设置。

**输出**

- MapSdkLoader；
- ScriptRegistry；
- 三平台 Loader。

**修改文件**

- `src/adapters/maps/shared/*`
- `src/adapters/maps/*/*Loader.ts`
- Loader tests

**验收标准**

- 无 Key 不加载；
- 并发加载去重；
- 失败清理 script/callback；
- 可重试；
- Key或版本变化行为明确；
- 不暴露完整凭据。

## P5-03 重构 Marker 和图层能力

**目标**

迁移三地图 Marker/InfoWindow/底图行为到 Adapter。

**已有输入**

- map-tools 三地图 addMarkers/setLayer；
- gisviewer-react Overlay/Layer 模块经验；
- MapPointView。

**输出**

- 平台 PointRenderer；
- Marker替换/清空；
- InfoWindow；
- fit view；
- 有限底图切换。

**修改文件**

- `src/adapters/maps/amap/*`
- `src/adapters/maps/baidu/*`
- `src/adapters/maps/tianditu/*`
- Adapter tests

**验收标准**

- 行为与旧正确实现一致；
- InfoWindow内容安全转义；
- setPoints不泄漏旧Marker；
- 不把平台原生对象传入业务层；
- 底图切换不误删业务状态。

## P5-04 建立统一生命周期和资源管理

**目标**

解决旧项目事件、Overlay、全局 callback 和实例释放问题。

**已有输入**

- gisviewer-react remove/destroy经验；
- map-tools Hook cleanup；
- 三平台官方生命周期。

**输出**

- ResourceBag；
- 幂等 destroy；
- 事件 unsubscribe；
- 快速切页测试。

**修改文件**

- `src/core/map/ResourceBag.ts`
- 三个 Adapter
- 生命周期测试

**验收标准**

- destroy可重复调用；
- 异步初始化不会回写已销毁页面；
- Marker/Layer/InfoWindow/事件均释放；
- 快速切换三地图无实例冲突；
- 不保留无界静态缓存。

## P5-05 重构大量点策略

**目标**

保留旧项目分层渲染思路，修复批次清空和重复对象问题。

**已有输入**

- map-tools AMap Marker/LabelsLayer/MassMarks/Cluster；
- gisviewer-react MassiveLayer/Cluster；
- 性能样本。

**输出**

- PointRenderStrategy；
- 普通点/聚合/海量点策略；
- 平台能力降级。

**修改文件**

- `src/core/map/PointRenderStrategy.ts`
- 三平台 PointRenderer
- 性能测试

**验收标准**

- 同时只启用一种主策略；
- 不分批清除前一批；
- 不创建重复数据集合；
- 阈值由测试决定；
- 不支持海量点的平台有明确降级。

---

# Phase 6：地图页面实现

## P6-01 实现通用地图页面壳

**目标**

统一三地图的 Sidebar、点位选择、设置和状态。

**已有输入**

- 旧 MapVisual 左右布局；
- PeachTools Design System；
- MapAdapterFactory；
- PointRepository。

**输出**

- MapPageShell；
- MapSidebar；
- PointPickerDialog；
- missing-key/loading/error/partial 状态。

**修改文件**

- `src/features/map-validation/*`
- 三个地图页面壳

**验收标准**

- 三地图布局一致；
- 搜索、单选、多选、全选当前结果正确；
- 取消弹窗不提交临时选择；
- 无 Key 时不加载 SDK；
- Sidebar保留点位文字信息。

## P6-02 实现高德地图页面

**目标**

迁移并产品化高德地图能力。

**已有输入**

- map-tools `useAmap`；
- AMapAdapter；
- GCJ02点位；
- 高德测试 Key。

**输出**

- `/map/amap`；
- Marker、InfoWindow、fit view；
- 支持的有限底图。

**修改文件**

- `src/pages/AMapPage.tsx`
- `src/adapters/maps/amap/*`
- 集成测试

**验收标准**

- GCJ02显示正确；
- 旧正确Marker行为保持；
- Key缺失/错误有可操作反馈；
- 页面退出释放实例；
- 不自动带入天气、POI、绘制等非V1功能。

## P6-03 实现百度地图页面

**目标**

迁移并产品化百度地图能力。

**已有输入**

- map-tools `useBmap`；
- BaiduAdapter；
- BD09点位；
- 百度测试 AK。

**输出**

- `/map/baidu`；
- Marker、InfoWindow、fit view；
- 有限底图。

**修改文件**

- `src/pages/BaiduMapPage.tsx`
- `src/adapters/maps/baidu/*`
- 集成测试

**验收标准**

- BD09显示正确；
- 不把旧空绘制/测量视为已实现；
- Marker可替换和清除；
- 退出后Overlay和事件释放；
- 加载失败可重试或打开设置。

## P6-04 实现天地图页面

**目标**

基于扩展验证结论迁移天地图能力。

**已有输入**

- map-tools `useTianditu`；
- TiandituAdapter；
- P2-02坐标契约；
- 天地图测试 Token。

**输出**

- `/map/tianditu`；
- Marker、InfoWindow、fit view；
- 矢量/影像/地形等确认后的底图。

**修改文件**

- `src/pages/TiandituMapPage.tsx`
- `src/adapters/maps/tianditu/*`
- 集成测试

**验收标准**

- 使用已确认坐标契约；
- 所有资源HTTPS；
- 不用固定延时猜测SDK ready；
- 图层和Overlay正确释放；
- CGCS2000未确认时不伪装为用户正式入口。

## P6-05 打通 Point Manager 到地图

**目标**

完成“导入→管理→转换→多地图验证”闭环。

**已有输入**

- Point Manager选择；
- prepareMapPoints；
- 三地图路由。

**输出**

- 地图平台选择；
- Point ID选择状态；
- 按需坐标转换；
- 部分失败反馈。

**修改文件**

- `src/features/points/MapViewDialog.tsx`
- `src/features/map-validation/mapSelectionStore.ts`
- Point Manager和地图页集成

**验收标准**

- 单点/批量均可进入地图；
- 只传Point ID；
- 缺少目标坐标时按需生成；
- 个别失败不阻断其他点；
- 删除点位自动从选择中剔除。

---

# Phase 7：UI优化和性能优化

## P7-01 完成 PeachTools UI 统一验收

**目标**

确保旧能力在新UI中一致、清晰、可访问。

**已有输入**

- 五个页面；
- Design System；
- 核心流程。

**输出**

- 视觉/交互验收清单；
- 响应式和键盘修复；
- 完整状态组件。

**修改文件**

- `src/styles/*`
- 相关页面和组件
- `tests/accessibility/*`

**验收标准**

- 首页、工作台、地图页各自符合定位；
- 原始/转换坐标不混淆；
- 键盘可完成关键流程；
- 无Key、空、错误、部分成功状态完整；
- 不残留旧项目不一致UI。

## P7-02 执行旧能力回归和新流程E2E

**目标**

证明重构没有破坏成熟业务逻辑。

**已有输入**

- P0 baseline；
- 新模块测试；
- PRD主流程。

**输出**

- legacy-vs-v2对照结果；
- Point Manager E2E；
- 导入/转换/地图 E2E。

**修改文件**

- `tests/regression/*`
- `tests/e2e/*`
- `playwright.config.ts`

**验收标准**

- 已验证坐标结果保持一致；
- Excel/CSV/JSON流程通过；
- 新模型不丢原始坐标；
- 三地图展示正确；
- 已知旧缺陷已修复且有测试。

## P7-03 优化导入、列表和转换性能

**目标**

在不改变业务结果的前提下提升大数据体验。

**已有输入**

- 10,000点导入样本；
- 旧项目批量处理经验；
- 浏览器性能数据。

**输出**

- 解析/转换性能基线；
- 虚拟列表或分页；
- 必要时Worker；
- 进度和取消。

**修改文件**

- `tests/performance/*`
- 相关Parser、转换和列表组件
- `docs/ARCHITECTURE.md`

**验收标准**

- 10,000点导入无长期无响应；
- 列表不一次渲染全部；
- 优化前后转换结果一致；
- 进度准确；
- 不为性能引入不可维护的过度抽象。

## P7-04 优化地图性能和内存

**目标**

验证大量点策略和地图生命周期。

**已有输入**

- 1k/10k/50k点样本；
- PointRenderStrategy；
- 三平台Adapter。

**输出**

- 平台性能报告；
- 策略阈值；
- 内存释放验证。

**修改文件**

- `tests/performance/map-*`
- 三平台PointRenderer
- `docs/ARCHITECTURE.md`

**验收标准**

- V1 1,000点交互基线通过；
- 不出现旧分批清空问题；
- 反复进出地图页内存可回落；
- 不支持能力有合理降级；
- 阈值有测试依据。

## P7-05 安全、兼容和发布检查

**目标**

完成产品化发布前的安全和范围验收。

**已有输入**

- 生产构建；
- 导入边界数据；
- Chrome/Edge；
- PRD V1范围。

**输出**

- 安全检查；
- 兼容报告；
- V1验收报告；
- 已知限制。

**修改文件**

- `tests/security/*`
- `tests/e2e/browser-*`
- `docs/release/V1-ACCEPTANCE.md`
- `docs/release/V1-RELEASE-NOTES.md`
- `README.md`

**验收标准**

- 无真实Key/Token进入仓库和构建；
- 导入文本不能注入HTML；
- 外部资源使用HTTPS；
- Chrome/Edge主流程通过；
- 没有V1排除功能；
- 上海2000和CGCS2000状态准确记录。

---

# 阶段依赖与门槛

| Phase | 前置依赖 | 完成门槛 |
| --- | --- | --- |
| Phase 0 | 参考项目可读 | 迁移矩阵和基线测试获评审 |
| Phase 1 | Phase 0 | 工程、路由、UI基线和领域类型通过 |
| Phase 2 | Phase 0、1 | 核心旧能力迁移后回归通过 |
| Phase 3 | Phase 1、2 | 本地数据和Repository测试通过 |
| Phase 4 | Phase 2、3 | Point Manager完整闭环通过 |
| Phase 5 | Phase 0、2 | MapAdapter、Loader和生命周期契约通过 |
| Phase 6 | Phase 3、4、5 | 三地图和主流程集成通过 |
| Phase 7 | Phase 1–6 | 回归、性能、安全、设计和范围验收通过 |

# 当前阻塞与风险

## R-01 成熟逻辑缺少完整基线

如果未先建立回归样本，重构时无法区分“修复缺陷”和“破坏旧行为”。Phase 0 必须先完成。

## R-02 上海2000验证资料

已有 proj4 转换基础，但仍需参数来源、投影定义、EPSG信息、轴顺序、权威样本和精度标准。风险是错误参数被产品化放大，而不是能力无法实现。

## R-03 CGCS2000与天地图契约

旧项目将 CGCS2000用于天地图，但V1不默认作为用户入口。需要通过真实业务样本和平台契约确认其内部或扩展定位。

## R-04 地图生命周期

旧项目存在全局callback、script清理、空能力和平台销毁不对称问题。迁移时不能只改变目录而保留这些缺陷。

## R-05 复用边界

“优先复用”不代表复制旧页面和全局状态。最大设计风险是在避免重写的同时，把旧耦合带入新架构。迁移矩阵和适配边界必须先于实现。

# Definition of Done

每项任务只有同时满足以下条件才完成：

- 明确对应的旧能力或新增需求；
- 迁移分类和原因可追溯；
- 成熟逻辑有回归测试；
- 已知旧缺陷不被复制；
- 输出符合新领域模型和模块边界；
- UI符合 PeachTools Design System；
- 验收标准逐条通过；
- 未引入V1排除功能；
- 未为了抽象牺牲可读性和简单性；
- 文档与实际行为同步。

