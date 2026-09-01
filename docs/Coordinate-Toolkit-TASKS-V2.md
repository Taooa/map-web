# Coordinate Toolkit 产品化重构任务 V2

> 对应 PRD：[`Coordinate-Toolkit-PRD-V2.md`](./Coordinate-Toolkit-PRD-V2.md)  
> 设计规范：[`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)  
> 参考分析：[`REFERENCE-ANALYSIS.md`](./REFERENCE-ANALYSIS.md)  
> 状态：执行中（按当前代码同步）
> 更新日期：2026-07-31

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

## 0.5 当前执行看板（2026-07-31）

本看板覆盖后文最初的“从迁移到实现”任务顺序，是当前继续开发时的优先依据。

### 已完成

| 模块 | 当前结果 |
| --- | --- |
| 工程与UI | React/TypeScript/Vite、中文界面、PeachTools风格、首页与点位页面 |
| Point | 真实新增、分页列表、搜索、名称编辑、单删/批删，`original/converted`分离 |
| 点位选择 | `Set<PointId>`跨页选择、当前页全选、删除同步和批量导出 |
| 坐标展示 | WGS84/GCJ02/BD09/SH2000独立列、精度格式化、缺失占位和完整坐标复制 |
| 坐标转换 | gcoord 0.3.2基线，WGS84/GCJ02/BD09单点及选中点位批量转换和缓存 |
| 文件导入 | Excel/CSV/JSON文件与JSON粘贴、字段映射、坐标系选择和结果统计 |
| 来源显示 | 文件显示原始文件名；非文件来源显示“手动新增”或“JSON 粘贴” |
| 存储 | IndexedDB points store，失败时降级MemoryPointRepository |
| 地图工作台 | `/map?platform=`单页切换高德、百度、天地图 |
| 地图平台 | 独立Loader、Adapter、Toolbar、Marker、InfoWindow和销毁流程 |
| 地图安全 | 异步失效Adapter阻止幽灵实例，Marker事件显式解绑 |
| 自动化 | 104项测试通过，覆盖分页、跨页选择、批量操作、坐标复制及地图生命周期 |

### 本轮产品调整

- 对外名称统一为“地图工具”；
- `Point Manager`统一为“点位管理”；
- 主导航和首页主文案由“地图验证”调整为“地图展示”；
- 首页删除重复的地图平台入口模块；
- GIS资源区删除与地图平台区重复的天地图资源卡；
- 地图不再拆成三个产品页面，改为一个工作台切换三个独立平台实现。

### 本轮新增完成

- 用户可见文案统一使用“地图展示”“点位管理”；
- 首页、Smoke和旧地图地址路由测试已同步；
- CSV支持中文表头、引号、转义引号、空值和字段映射；
- JSON文件与JSON粘贴只接受顶层对象数组；
- Excel、CSV、JSON复用坐标系选择、字段映射、行校验和Point批量创建；
- 导入来源可区分Excel、CSV、JSON文件和JSON粘贴；
- 无关JSON字段不会进入Point数据模型。
- 点位列表默认每页20条，支持20/50/100条和有效页码自动修正；
- 表头全选限定当前页，跨页选择只保存PointId；
- 顶部坐标转换只处理已选择点位，并只补齐缺失结果；
- 行操作精简为编辑和删除，导出、转换、批删集中到批量工具栏；
- 文件来源列只显示原始文件名，不显示内部导入信息；
- 点位管理页删除重复眉题、常驻存储实现提示和未实现的快捷键提示。

### 接下来必须完成（P0）

#### N-01 完成中文文案和测试同步

**状态：已完成**

**目标**

消除“地图验证/地图展示”和旧英文名称混用，保证当前用户改动可以稳定合入。

**输入**

- 当前 Git 改动；
- PRD V2；
- 页面与路由测试。

**输出**

- 页面、导航、测试和文档统一使用“地图展示”“点位管理”；
- 首页不再出现重复地图入口；
- 旧路由兼容行为保持。

**修改文件**

- `src/pages/HomePage.tsx`
- `src/pages/PointsPage.tsx`
- `src/app/layouts/AppLayout.tsx`
- `src/config/routes.ts`
- `tests/pages/prototype-pages.test.tsx`
- `tests/smoke/app.test.tsx`

**验收标准**

- 用户可见页面不再出现无必要英文；
- 不存在产品层面的“地图验证/地图展示”混用；
- 更新首页测试，不再要求已删除的独立地图平台入口；
- 更新地图路由测试，以平台切换标签和当前平台状态作为断言，不依赖已删除的页面标题；
- Build、TypeScript、Lint和测试全部通过。

#### N-02 让平台专属设置真正控制地图

**目标**

当前三个 Toolbar 已保存和恢复轻量设置，但尚未驱动实际 SDK。下一步在各平台目录内完成设置应用，不扩张公共 `MapAdapter`。

**输出**

- 高德：标准/卫星底图、路况开关生效；
- 百度：底图和平台控件开关生效；
- 天地图：矢量/影像/地形及注记设置生效；
- 切换平台或刷新后恢复设置并重新应用。

**修改文件**

- `src/adapters/maps/amap/*`
- `src/adapters/maps/baidu/*`
- `src/adapters/maps/tianditu/*`
- `src/pages/maps/MapWorkspacePage.tsx`
- 对应地图测试。

**验收标准**

- 平台专属能力不进入公共 `MapAdapter`；
- 设置变化立即作用于当前地图；
- `destroy`后不遗留图层、控件和监听器；
- 设置恢复有自动化测试和真实SDK回归。

### 下一步优化顺序

| 优先级 | 任务 | 验收结果 |
| --- | --- | --- |
| P0-00（已完成） | 清理已删除提示的残留状态 | 已删除点位页不再使用的`storageStatus`订阅及相关导入，TypeScript和ESLint恢复通过 |
| P0-02 | 平台设置生效 | 高德、百度、天地图Toolbar设置真正驱动各自SDK并可恢复 |
| P0-03 | 批量操作结果 | 批量删除、导出和转换补充逐项失败反馈，避免部分失败被描述为全部成功 |
| P1-01 | 地图点位列表性能 | 大量点位时避免左侧列表一次渲染全部项目，采用分页或窗口化 |
| P1-02 | 点位编辑边界 | 明确V1只编辑名称；若未来允许修改原始坐标，必须使旧converted缓存失效 |
| P1-03 | 点位表格体验 | 检查移动端固定列、横向滚动、键盘选择、复制反馈和长文件名截断 |
| P1-04 | 搜索与选择回归 | 增加搜索隐藏已选项、清空搜索恢复选择及数据外部删除后的选择清理测试 |

### 上线前任务（P2）

| 优先级 | 任务 | 说明 |
| --- | --- | --- |
| P2-01 | 上海2000验证 | 确认参数、EPSG/投影、轴序、样本和精度后再启用转换 |
| P2-02 | 大量Marker策略 | 根据真实设备规模决定聚合、分片、上限提示或抽样 |
| P2-03 | DevTools内存回归 | 强制GC后检查Detached DOM、SDK内部监听器和闭包 |
| P2-04 | 浏览器导航回归 | 手工验证前进、后退、刷新、旧地址重定向和设置恢复 |
| P2-05 | 凭据管理完善 | 支持清除凭据、重新加载和域名白名单提示 |
| P2-06 | 发布验收 | Chrome/Edge真实闭环、空状态、失败状态、键盘和响应式检查 |

### 暂不进入V1

- CGCS2000普通用户入口；
- GeoJSON；
- 自动识别坐标系；
- 异常点判断与区域校验；
- 通用GIS Layer、Geometry或插件框架；
- 后端、账号和跨设备同步。

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

形成首页、点位管理和单一地图展示工作台的产品信息架构。

**已有输入**

- 旧项目多路由经验；
- PRD V2 页面结构；
- PeachTools 布局规范。

**输出**

- `/`
- `/points`
- `/map?platform=amap`
- `/map?platform=baidu`
- `/map?platform=tianditu`
- 旧地图地址兼容重定向
- 全局导航与 404

**修改文件**

- `src/app/router.tsx`
- `src/components/AppNavigation.tsx`
- `src/pages/*`

**验收标准**

- 首页、点位管理和三个地图查询参数入口可直接访问和刷新；
- 三个平台共用工作台外壳，但保持独立 Adapter、Toolbar 和生命周期；
- 坐标转换不再作为孤立核心页，而进入点位管理；
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
- 搜索、分页、跨页选择和四坐标列。

**修改文件**

- `src/pages/PointsPage.tsx`
- `src/features/points/PointsHeader.tsx`
- `PointsToolbar.tsx`
- `PointsTable.tsx`
- `CoordinateStatus.tsx`

**验收标准**

- 新增、导入和转换入口集中；
- 默认每页20条，支持20/50/100条；
- 搜索回到第一页，删除后页码保持有效；
- 表头全选只影响当前页，跨页选择只保存PointId；
- WGS84/GCJ02/BD09显示6位小数，SH2000显示3位小数；
- 缺失坐标显示`—`，复制使用底层完整精度；
- 刷新恢复数据；
- UI符合 PeachTools Design System。

## P4-02 实现新增、编辑、详情和删除

**目标**

完成点位的基础管理闭环。

**已有输入**

- 旧 PointInput 行为；
- 新 Point 模型；
- Repository。

**输出**

- AddPointDialog；
- EditPointDialog；
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
- V1编辑只修改名称，不改变original或converted；
- 详情区分 original/converted；
- 单删/批删有确认；
- 删除后同步清理选择状态；
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
- 选中PointId批量处理；
- 新增、跳过、失败反馈。

**修改文件**

- `src/features/coordinate-transform/ConvertCoordinatesDialog.tsx`
- `ConversionResult.tsx`
- `useCoordinateConversion.ts`
- Point Manager 集成

**验收标准**

- 单个和批量共用业务服务；
- 用户选择目标坐标系；
- 不重复计算有效缓存；
- 没有选择时转换按钮禁用，不允许隐式转换全部点位；
- 部分失败不阻断成功；
- original永不覆盖；
- 列表目标坐标列即时更新。

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

# Phase 6：地图工作台与平台实现

## P6-01 实现地图工作台公共外壳

**目标**

统一三个平台的页面布局、平台切换、点位选择、搜索、清空、fitView和凭据入口。

**已有输入**

- 旧 MapVisual 左右布局；
- PeachTools Design System；
- 最小 MapAdapter；
- PointRepository。

**输出**

- MapWorkspacePage；
- 平台切换；
- 点位搜索与选择；
- missing-key/loading/error/partial 状态。

**修改文件**

- `src/pages/maps/MapWorkspacePage.tsx`
- `src/features/map-validation/*`
- `src/adapters/maps/map-adapter.ts`

**验收标准**

- 三个平台共用同一工作台外壳；
- 搜索、单选、多选、全选当前结果正确；
- 无 Key 时不加载 SDK；
- Sidebar保留点位文字信息。

## P6-02 实现高德平台组件

**目标**

迁移并产品化高德地图能力。

**已有输入**

- map-tools `useAmap`；
- AMapAdapter；
- GCJ02点位；
- 高德测试 Key。

**输出**

- `/map?platform=amap`；
- Marker、InfoWindow、fit view；
- 支持的有限底图。

**修改文件**

- `src/pages/maps/MapWorkspacePage.tsx`
- `src/adapters/maps/amap/*`
- 集成测试

**验收标准**

- GCJ02显示正确；
- 旧正确Marker行为保持；
- Key缺失/错误有可操作反馈；
- 页面退出释放实例；
- 不自动带入天气、POI、绘制等非V1功能。

## P6-03 实现百度平台组件

**目标**

迁移并产品化百度地图能力。

**已有输入**

- map-tools `useBmap`；
- BaiduAdapter；
- BD09点位；
- 百度测试 AK。

**输出**

- `/map?platform=baidu`；
- Marker、InfoWindow、fit view；
- 有限底图。

**修改文件**

- `src/pages/maps/MapWorkspacePage.tsx`
- `src/adapters/maps/baidu/*`
- 集成测试

**验收标准**

- BD09显示正确；
- 不把旧空绘制/测量视为已实现；
- Marker可替换和清除；
- 退出后Overlay和事件释放；
- 加载失败可重试或打开设置。

## P6-04 实现天地图平台组件

**目标**

基于扩展验证结论迁移天地图能力。

**已有输入**

- map-tools `useTianditu`；
- TiandituAdapter；
- P2-02坐标契约；
- 天地图测试 Token。

**输出**

- `/map?platform=tianditu`；
- Marker、InfoWindow、fit view；
- 矢量/影像/地形等确认后的底图。

**修改文件**

- `src/pages/maps/MapWorkspacePage.tsx`
- `src/adapters/maps/tianditu/*`
- 集成测试

**验收标准**

- 使用已确认坐标契约；
- 所有资源HTTPS；
- 不用固定延时猜测SDK ready；
- 图层和Overlay正确释放；
- CGCS2000未确认时不伪装为用户正式入口。

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

## Phase 4A：点位管理列表版收口（2026-08-02）

### 已完成

- [x] 固定查询区、内部滚动表格和底部分页布局；
- [x] 名称、来源、创建/更新时间范围与显式查询状态；
- [x] 创建/更新时间排序和 20/50/100 分页；
- [x] 固定四坐标列、源坐标标识和浏览器原生文本选择；
- [x] 全字段编辑抽屉及 original/converted 更新规则；
- [x] Form、Upload、JSON 三 Tab 新增入口及切换重置；
- [x] Excel/CSV/JSON 解析复用、字段映射、预览和逐行结果；
- [x] 已选择 > 查询结果 > 全部数据的统一批量范围；
- [x] 指定源坐标转换、目标覆盖和部分失败报告；
- [x] 九字段 Excel/JSON 导出；
- [x] 单条/批量删除确认与部分失败处理；
- [x] 更新 Service、Repository、页面、路由和导出测试。
- [x] 26 个测试文件、112 项自动化测试通过；TypeScript、ESLint 与 Vite build 通过。

### 未完成或需人工验证

- [ ] 真实浏览器下验证 Excel/JSON 下载内容和文件名；
- [ ] 使用真实大文件验证上传性能、错误列表可用性和内存占用；
- [ ] 对窄屏、超长来源名称和横向滚动做人工视觉验收；
- [ ] 上海2000正式转换仍等待权威参数与基线，CGCS2000仍不开放。

## Phase 4B：点位管理全面切换 Ant Design（2026-08-02）

### 已完成

- [x] 安装 `antd`、`@ant-design/icons`；
- [x] 移除 `@tanstack/react-table`、`@radix-ui/react-checkbox`、`@radix-ui/react-alert-dialog`；
- [x] 根节点接入 `ConfigProvider`、Ant Design `App`、中文 locale 和 PeachTools 明暗 token；
- [x] 查询区切换为 Form/Input/Select/RangePicker，并保留草稿/已应用条件；
- [x] 表格切换为 Ant Design Table，固定名称/操作和四类坐标列；
- [x] 实现当前页全选、跨页 Set 选择、受控排序和外部分页；
- [x] 表格按可用页面高度内部滚动；
- [x] 单条删除切换为 Popconfirm；
- [x] 编辑切换为 Drawer；
- [x] 新增切换为 Modal + Tabs + Form.List + Upload.Dragger + JSON 映射；
- [x] 转换、导出和批量删除切换为 Modal；
- [x] 复用 PointService、Repository、ImportService 和坐标规则；
- [x] 保持 original 不被转换覆盖，上海2000仅保存展示，CGCS2000不开放；
- [x] 删除旧点位页面、旧表格组件和对应旧测试；
- [x] 动态加载 Excel parser/xlsx 导出模块；
- [x] 增加 ResizeObserver、matchMedia、scrollTo 等 jsdom 测试适配；
- [x] 新增 5 项 Ant Design 页面行为测试；
- [x] 更新 README、CURRENT-PROJECT-CONTEXT、AI-DEVELOPMENT-STATUS、PRD V2 和 TASKS V2；
- [x] `pnpm install --frozen-lockfile`、build、typecheck、lint 和 test:run 通过；
- [x] `pnpm why` 确认三项旧依赖不在依赖树。

### 验证数据

| 项目 | 迁移前 | 迁移后 |
| --- | ---: | ---: |
| 主入口 JS | 884,644 bytes | 1,332,900 bytes |
| CSS | 56,266 bytes | 59,789 bytes |
| dist 总量 | 3,117,179 bytes | 3,996,250 bytes |
| 自动化测试 | 基线记录 | 25 files / 106 tests |

### 后续任务

- [ ] Chrome/Edge 人工验收上传、下载、横向滚动、暗色主题和键盘操作；
- [ ] 用 10,000 点数据验证导入、转换和导出性能；
- [ ] 评估点位页面级延迟加载，降低入口主包体积；
- [ ] 逐条确认并清理 `globals.css` 中不再使用的点位规则，禁止批量删除地图共享选择器；
- [ ] 在独立工作区或获得确认后处理 17 个既有 Prettier 格式差异。

### 禁止扩大范围

本阶段不得修改地图 Adapter、坐标算法、上海2000转换逻辑、`Point.original` 数据结构或 `reference/`，不得恢复三地图独立页面、通用 Provider Registry、TransformationGraph、AlgorithmRegistry、大型状态管理、后端或用户系统。

## Phase 4C：点位列表紧凑交互收口（2026-08-02）

### 已完成

- [x] 删除点位页重复的“点位管理”标题和功能介绍；
- [x] 查询标签与输入控件调整为同一行；
- [x] 名称输入框收窄至 150px、来源 130px、时间范围 250px；
- [x] 查询、重置、新增、坐标转换、导出和删除合并到同一工具栏；
- [x] “新增点位”显示文案缩短为“新增”；
- [x] “批量删除”显示文案缩短为“删除”；
- [x] 重置按钮增加 `ReloadOutlined` 图标；
- [x] 保留窄屏纵向排列和工具栏自动换行；
- [x] 点位名称、来源保持左对齐；
- [x] 坐标、时间和操作列统一居中；
- [x] 优化表头、数据行间距和悬浮反馈；
- [x] 创建/更新时间排序改为升序、降序连续循环，不再出现取消排序状态；
- [x] 编辑、删除改为纯图标圆形按钮；
- [x] 编辑、删除图标增加 Tooltip 和 aria-label；
- [x] 操作列收窄至 88px，并保留删除 Popconfirm；
- [x] 路由测试改为验证“点位查询与操作”区域，不再依赖已删除标题；
- [x] build、typecheck、lint 和完整测试通过。

### 验证结果

| 检查项 | 结果 |
| --- | --- |
| 生产构建 | 通过；主 JS 1,333,063 bytes，CSS 60,385 bytes |
| TypeScript | 通过 |
| ESLint | 通过，0 warning |
| Vitest | 25 files / 106 tests 通过 |
| Git diff whitespace | 通过 |

### 文档与范围

- [x] PRD V2 已同步本轮最终交互规则；
- [x] TASKS V2 已记录完成项和验证结果；
- [x] 未修改地图 Adapter、坐标算法、上海2000转换逻辑、`Point.original` 结构或 `reference/`。

## Phase 6B：地图工作台点位添加流程（2026-09-01）

### 已完成

- [x] 左侧面板增加“添加点位”入口，默认列表只显示当前地图会话已添加点位；
- [x] 使用 Ant Design Modal、Table 和 Pagination 展示全部点位分页列表；
- [x] 明确拆分 `workspacePointIds`、`visiblePointIds` 与唯一 Point 缓存；
- [x] 候选列表排除已在工作区的 PointId，支持名称查询、来源下拉筛选和真实候选数量；
- [x] 候选表格改为展示 WGS84、GCJ02、BD09 坐标可用性，并移除坐标系、原始坐标列；
- [x] 移除弹窗外层滚动，仅保留表格内容滚动能力并隐藏滚动条；
- [x] 支持当前页全选/取消、跨页保留选择和已选数量反馈；
- [x] 使用 `listPointPage` 返回的完整匹配 ID 实现“全选全部当前查询结果”；
- [x] 添加按钮显示选择数量，零选择时禁用，添加操作不再二次确认；
- [x] 新加入点位默认进入工作区和可见集合；
- [x] 左侧 Checkbox 只控制 Marker 可见集合，单点移除不调用数据库删除；
- [x] 实现全部显示、清空显示以及带 Popconfirm 的清空列表；
- [x] 左侧搜索调整为仅过滤已添加点位，列表继续滚动分批渲染；
- [x] Marker 数据改为仅从 `visiblePointIds` 对应 Point 生成，并在平台切换时保持两个 ID 集合；
- [x] 增加候选排除、分页/查询选择、Marker 显隐、单点移除和清空操作回归测试；
- [x] 补充来源筛选、坐标可用性和 IndexedDB 完整来源选项测试；
- [x] 本轮 `build`、`typecheck`、`lint` 均通过，25 个测试文件、113 项测试通过；
- [x] 未修改 MapAdapter、平台 SDK、坐标转换、Point 数据结构或存储结构。
