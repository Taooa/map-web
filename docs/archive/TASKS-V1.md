# Spatial Data Toolkit V2 开发任务

> 文档状态：Draft  
> 对应 PRD：`docs/Spatial-Data-Toolkit-V2-PRD.md`  
> 更新日期：2026-07-28

## 0. 执行说明

### 0.1 当前代码基线

当前工作区未发现目标产品的根级应用源码，仅发现 `reference/gisviewer-react` 参考工程。该工程是较重的 GIS 组件/演示项目，不包含本次 Point Manager 产品闭环。

因此，下文“修改文件”使用建议目录结构表达预期落点。正式开发前应先确认：

1. 目标产品是否需要在工作区根目录新建；
2. 是否另有未提供的现有应用仓库；
3. UI 组件库、状态管理和测试框架的最终选择。

若实际代码结构不同，保持模块边界与验收标准，按真实目录映射文件，不应机械创建重复模块。

### 0.2 开发原则

- 严格按 Phase 顺序推进；
- 先建立数据契约和存储，再建设页面；
- 地图 SDK 必须延迟加载并相互隔离；
- 页面不得直接访问 IndexedDB；
- 原始坐标不得被转换覆盖；
- 不实施自动坐标识别、异常点判断、区域校验、GeoJSON、用户系统或后端；
- 每个 Phase 完成后执行类型检查、单元测试和对应验收流程。

### 0.3 建议目录

```text
src/
  app/
    App.tsx
    router.tsx
  components/
  features/
    points/
    import/
    coordinate-transform/
    maps/
    settings/
    home/
  db/
  lib/
  types/
  styles/
tests/
```

## Phase 1：基础架构调整

### P1-01 建立 V2 应用入口与目录边界

**目标**

建立轻量的 V2 应用骨架，将参考 GIS 工程与产品业务代码隔离，确保后续功能有清晰归属。

**修改文件**

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/styles/global.css`
- 新建 `src/features/*`、`src/db`、`src/types`

**技术要求**

- 使用 React + TypeScript + Vite；
- 开启 TypeScript 严格模式；
- 配置统一路径别名；
- 参考工程仅作为阅读/迁移来源，不直接把无关 GIS 模块打入主包；
- 增加 `typecheck`、`test`、`build` 脚本；
- 若实际应用已存在，则以整理目录和删除耦合为主，不重复脚手架。

**验收标准**

- 开发服务可启动；
- 空应用可构建；
- 类型检查通过；
- 页面无运行时错误；
- 主包未引入参考工程中的 ArcGIS 3D、轨迹、热力图等无关能力。

### P1-02 建立路由与页面壳

**目标**

创建首页、点位工作台和三个独立地图页面的稳定路由。

**修改文件**

- `src/app/router.tsx`
- `src/app/App.tsx`
- `src/components/AppNavigation.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/points/PointsPage.tsx`
- `src/features/maps/amap/AMapPage.tsx`
- `src/features/maps/baidu/BaiduMapPage.tsx`
- `src/features/maps/tianditu/TiandituMapPage.tsx`
- `src/features/maps/MapPageShell.tsx`

**技术要求**

- 路由为 `/`、`/points`、`/map/amap`、`/map/baidu`、`/map/tianditu`；
- 地图页保持独立组件和 SDK 生命周期；
- 未知路由提供返回首页入口；
- 页面壳提供一致导航，首页与工作台允许不同视觉布局。

**验收标准**

- 五个路由可直接访问和刷新；
- 导航高亮正确；
- 三个地图页面没有共享全局 SDK 对象；
- 未知路由不会出现空白页。

### P1-03 建立 UI 基础规范与反馈组件

**目标**

统一表单、弹窗、空状态、加载、错误和确认交互。

**修改文件**

- `src/components/ConfirmDialog.tsx`
- `src/components/EmptyState.tsx`
- `src/components/ErrorState.tsx`
- `src/components/LoadingState.tsx`
- `src/components/FormField.tsx`
- `src/styles/tokens.css`
- `src/styles/global.css`

**技术要求**

- 复用现有 UI 库时统一封装，不在业务页面混用多套组件；
- 支持键盘焦点、表单标签和错误关联；
- 删除类操作使用二次确认；
- 建立桌面优先和基本响应式断点。

**验收标准**

- 公共状态组件可在 Story/测试页或实际页面复用；
- 键盘可关闭弹窗并恢复焦点；
- 错误信息不只依赖颜色；
- 360px 宽度下无关键操作完全不可访问。

## Phase 2：数据模型和 IndexedDB

### P2-01 定义 Point、Coordinate 与 ImportRecord

**目标**

建立唯一的数据契约，限制点位只保存 `id`、`name`、`source`、`coordinates`。

**修改文件**

- `src/types/coordinate.ts`
- `src/types/point.ts`
- `src/types/import.ts`
- `src/types/index.ts`
- `src/types/__tests__/point.test.ts`

**技术要求**

- `CoordinateSystem` 仅含 WGS84、GCJ02、BD09、SHANGHAI2000；
- `coordinates.original` 保存原始值和原始坐标系；
- `coordinates.converted` 按坐标系存缓存；
- Source 区分 manual、excel、csv、json-file、json-paste；
- 不在 Point 中保存原始业务行、地址、设备编码等字段；
- ID 使用浏览器可用的稳定唯一 ID 方案。

**验收标准**

- 示例点位通过类型检查；
- 无法向 Point 类型添加未声明业务字段；
- 原始坐标与转换缓存结构可明确区分；
- 类型测试覆盖四种坐标系和五种来源。

### P2-02 建立 IndexedDB schema 与升级机制

**目标**

创建点位和导入记录的本地数据库，支持后续 schema 演进。

**修改文件**

- `src/db/database.ts`
- `src/db/schema.ts`
- `src/db/migrations.ts`
- `src/db/__tests__/database.test.ts`

**技术要求**

- 数据库名建议为 `spatial-data-toolkit`；
- 创建 `points`、`imports` 两个对象仓库；
- 为点位名称、来源、导入批次和导入时间建立必要索引；
- 显式维护 schema version 和 upgrade 回调；
- 测试使用隔离数据库或 fake IndexedDB；
- 数据库打开失败时向上返回可展示错误。

**验收标准**

- 首次打开可自动建库；
- 刷新后数据保留；
- schema 升级测试不丢失旧测试数据；
- 数据库失败不会导致页面永久白屏。

### P2-03 实现 Point Repository

**目标**

为点位新增、查询、批量更新和删除提供统一接口。

**修改文件**

- `src/db/pointRepository.ts`
- `src/db/__tests__/pointRepository.test.ts`

**技术要求**

- 提供 `add`、`addMany`、`getById`、`list`、`updateCoordinates`、`delete`、`deleteMany`；
- 批量写入使用事务；
- 搜索语义在 repository/service 层统一；
- 页面组件不得获得原生 IDB transaction；
- 更新转换坐标时不得修改 original。

**验收标准**

- CRUD 与批量事务测试通过；
- 批量失败时不会留下不可解释的半批数据；
- 更新缓存后原始坐标保持不变；
- 删除不存在的 ID 有明确、可预期结果。

### P2-04 实现 Import Repository

**目标**

保存导入批次摘要，并支持 Point 关联导入来源。

**修改文件**

- `src/db/importRepository.ts`
- `src/db/__tests__/importRepository.test.ts`

**技术要求**

- 只保存文件名/工作表、映射、坐标系和统计摘要；
- 不保存原始文件、原始完整行和 JSON 文本；
- 点位批量写入与导入记录写入应置于同一业务事务或提供可恢复策略。

**验收标准**

- 导入记录可创建和查询；
- Point 的 `source.importId` 可关联对应记录；
- 数据库中不存在未映射业务字段或原始文件内容；
- 导入失败时不会产生“成功”记录。

### P2-05 实现设置存储

**目标**

使用 localStorage 保存地图密钥、主题和基础设置。

**修改文件**

- `src/features/settings/settingsStorage.ts`
- `src/features/settings/types.ts`
- `src/features/settings/__tests__/settingsStorage.test.ts`

**技术要求**

- 键名带 `sdt:v2:` 前缀；
- 对损坏 JSON、字段缺失和旧版本提供默认值；
- 不在日志中输出密钥；
- 提供按平台读取密钥的接口。

**验收标准**

- 保存后刷新可读取；
- 清除某个平台密钥不影响其他设置；
- localStorage 中的无效内容不会导致崩溃；
- 测试输出不包含真实或模拟完整密钥。

## Phase 3：点位列表

### P3-01 建立 Points 页面数据状态

**目标**

从 Repository 加载点位并管理搜索、分页和选择状态。

**修改文件**

- `src/features/points/PointsPage.tsx`
- `src/features/points/usePoints.ts`
- `src/features/points/pointSelection.ts`
- `src/features/points/__tests__/pointSelection.test.ts`

**技术要求**

- 支持加载、空、错误、正常四类状态；
- 搜索按点位名称；
- “全选”只作用于当前过滤结果；
- 数据变化后清理已不存在的选中 ID；
- 为万级点位预留分页或虚拟化。

**验收标准**

- 刷新后从 IndexedDB 恢复数据；
- 搜索、单选、全选、取消选择正确；
- 无数据和无搜索结果状态不同；
- 数据读取失败时可重试。

### P3-02 实现 Point Manager Header 与 Toolbar

**目标**

提供新增、导入、搜索和批量操作入口。

**修改文件**

- `src/features/points/PointsHeader.tsx`
- `src/features/points/PointsToolbar.tsx`
- `src/features/points/PointsPage.tsx`

**技术要求**

- Header 标题固定为 `Point Manager`；
- 包含“新增点位”“导入文件”；
- Toolbar 包含搜索、坐标转换、地图查看、删除；
- 未选择点位时批量操作不可误触；
- 导入入口可进入文件和 JSON 粘贴两种模式。

**验收标准**

- 所有入口可键盘访问；
- 已选数量实时更新；
- 搜索不会清空仍在结果中的选择；
- 无选择时批量删除不会执行。

### P3-03 实现点位表格与详情

**目标**

展示点位核心信息，按需查看坐标详情。

**修改文件**

- `src/features/points/PointsTable.tsx`
- `src/features/points/CoordinateStatus.tsx`
- `src/features/points/PointDetailsDrawer.tsx`
- `src/features/points/__tests__/PointsTable.test.tsx`

**技术要求**

- 默认列为选择框、名称、来源、坐标状态、操作；
- 默认不展开四套坐标数值；
- 详情展示 original 和 converted；
- 来源文案对用户可读；
- 坐标值使用一致精度展示，但不得修改存储精度。

**验收标准**

- 表格列符合 PRD；
- 坐标状态准确反映缓存；
- 详情可区分原始和转换坐标；
- 关闭详情后列表选择状态保留。

### P3-04 实现手动新增

**目标**

允许用户录入单个点位并立即持久化。

**修改文件**

- `src/features/points/AddPointDialog.tsx`
- `src/features/points/pointFormSchema.ts`
- `src/features/points/__tests__/AddPointDialog.test.tsx`

**技术要求**

- 字段为名称、经度/X、纬度/Y、坐标系；
- 默认 WGS84；
- 名称去首尾空白后不能为空；
- 坐标输入必须为有限数值；
- 不做区域范围、异常或坐标系推断；
- 保存成功后重置输入并刷新列表。

**验收标准**

- 合法点位可新增并在刷新后存在；
- 空名称、空坐标、NaN、Infinity 无法提交；
- 添加后表单清空；
- 保存失败时表单值保留并显示错误；
- 新增 Point 只包含允许字段。

### P3-05 实现删除

**目标**

支持单个和批量删除点位。

**修改文件**

- `src/features/points/DeletePointsDialog.tsx`
- `src/features/points/PointsPage.tsx`
- `src/features/points/__tests__/DeletePointsDialog.test.tsx`

**技术要求**

- 删除前显示数量和不可撤销提示；
- 使用 Repository 批量事务；
- 成功后清理选择；
- 失败时保留未确认删除状态并允许重试。

**验收标准**

- 取消确认不会删除；
- 单删和批删刷新后均不再出现；
- 删除成功后已选数量正确；
- 批量删除不会误删未选点位。

## Phase 4：导入功能

### P4-01 建立统一导入中间模型

**目标**

让 Excel、CSV、JSON 文件和 JSON 粘贴共用字段映射与提交逻辑。

**修改文件**

- `src/features/import/types.ts`
- `src/features/import/importSession.ts`
- `src/features/import/normalizeRows.ts`
- `src/features/import/__tests__/normalizeRows.test.ts`

**技术要求**

- 解析器统一输出字段列表和 `Record<string, unknown>[]` 预览/数据；
- 导入会话包含来源、文件信息、字段映射、坐标系；
- 规范化后只输出 Point 所需字段；
- 不自动识别坐标系；
- 区分解析错误与不可导入行。

**验收标准**

- 四类来源可进入同一规范化函数；
- 未映射字段不会进入 Point；
- 缺失/非数值坐标行计入 skipped；
- 输入数据在用户确认前不写数据库。

### P4-02 实现 Excel/CSV 解析

**目标**

在浏览器端读取 Excel 和 CSV，并输出工作表、字段与数据行。

**修改文件**

- `src/features/import/parsers/excelParser.ts`
- `src/features/import/parsers/csvParser.ts`
- `src/features/import/parsers/__tests__/excelParser.test.ts`
- `src/features/import/parsers/__tests__/csvParser.test.ts`
- `tests/fixtures/import/*`
- `package.json`

**技术要求**

- 选用维护中的浏览器端解析库；
- 支持 `.xlsx`、`.xls`、`.csv`；
- Excel 支持选择一个工作表，默认首个可见表；
- 正确处理 UTF-8 BOM、中文表头、空行和 CSV 引号；
- 文件大小上限和行数上限必须集中配置并在 UI 提示；
- 大文件解析评估 Web Worker，不能长时间冻结界面。

**验收标准**

- 固定样例文件解析结果与预期一致；
- 中文字段不乱码；
- 含逗号/换行的引号 CSV 正确；
- 不支持或损坏文件显示错误且不写数据库；
- 多 Sheet 文件可选择目标 Sheet。

### P4-03 实现 JSON 文件与粘贴解析

**目标**

支持 JSON 顶层对象数组的文件和文本导入。

**修改文件**

- `src/features/import/parsers/jsonParser.ts`
- `src/features/import/JsonPasteInput.tsx`
- `src/features/import/parsers/__tests__/jsonParser.test.ts`

**技术要求**

- V1 仅接受顶层对象数组；
- 空数组、非数组、数组元素非对象时给出明确错误；
- 不执行 JSON 中的任何内容；
- 粘贴成功后才允许进入字段映射；
- 导入成功后清空文本。

**验收标准**

- PRD 示例可成功解析；
- 非法 JSON 显示语法错误；
- 标量、对象或混合数组不进入导入；
- 解析失败不改变已有点位。

### P4-04 实现字段映射和预览

**目标**

让用户明确指定名称、经度、纬度和整批坐标系。

**修改文件**

- `src/features/import/ImportDialog.tsx`
- `src/features/import/FieldMappingStep.tsx`
- `src/features/import/DataPreview.tsx`
- `src/features/import/CoordinateSystemStep.tsx`
- `src/features/import/__tests__/FieldMappingStep.test.tsx`

**技术要求**

- 三个字段必选且不可重复；
- 坐标系必选，不提供自动识别按钮；
- 预览展示有限行，不能一次渲染全部；
- 确认前展示 total/imported/skipped 预估；
- 切换 Sheet 或数据源时清理失效映射。

**验收标准**

- 任一映射缺失时不能确认；
- 同一字段被重复选择时有明确提示；
- 修改映射后统计即时更新；
- 一个文件无法为不同行选择不同坐标系。

### P4-05 实现导入提交与结果

**目标**

将规范化点位和导入记录可靠写入 IndexedDB。

**修改文件**

- `src/features/import/importService.ts`
- `src/features/import/ImportResult.tsx`
- `src/features/import/__tests__/importService.test.ts`

**技术要求**

- 生成 ImportRecord 和 Point ID；
- 批量事务写入；
- 只保存规范化 Point 和导入摘要；
- 防止双击产生重复批次；
- 导入结束展示成功、跳过、失败数量；
- V1 不实施业务去重，文案不得暗示已去重。

**验收标准**

- 成功数量与新增点位数量一致；
- 跳过行不进入数据库；
- 导入记录统计与实际一致；
- 重复点击确认只产生一次提交；
- 数据库失败不会显示成功。

## Phase 5：坐标转换

### P5-01 固定坐标定义、算法和测试基准

**目标**

在编码前确认四种坐标系的语义、轴顺序、单位、转换路径和允许误差。

**修改文件**

- `docs/coordinate-systems.md`
- `tests/fixtures/coordinate-transform.json`
- `src/features/coordinate-transform/coordinateDefinitions.ts`

**技术要求**

- 记录 WGS84、GCJ02、BD09 的约定；
- 对上海2000记录正式定义、参数来源、轴顺序、单位和适用范围；
- 每种受支持转换至少提供权威正向/反向样本；
- 定义按坐标系分别适用的误差阈值；
- 若上海2000资料未确认，将其标记为 UI 不可用并说明原因，不使用猜测参数。

**验收标准**

- 评审人可从文档复现坐标含义；
- 测试夹具包含来源和期望值；
- 上海2000不存在未说明的 magic numbers；
- 未确认上海2000时产品不会宣称该转换可用。

### P5-02 实现统一转换服务

**目标**

为任意受支持源/目标组合提供一致接口。

**修改文件**

- `src/features/coordinate-transform/coordinateTransformer.ts`
- `src/features/coordinate-transform/strategies/wgsGcjBd.ts`
- `src/features/coordinate-transform/strategies/shanghai2000.ts`
- `src/features/coordinate-transform/errors.ts`
- `src/features/coordinate-transform/__tests__/coordinateTransformer.test.ts`
- `package.json`

**技术要求**

- 转换策略与 UI 解耦；
- 明确定义中间转换路径；
- 目标与源相同时不做有损计算；
- 使用经过评估的转换库或有来源的算法；
- 所有结果必须为有限数值；
- 上海2000实现必须基于 P5-01 已确认资料；
- 禁止在转换服务中自动判断输入坐标系或业务异常。

**验收标准**

- 测试夹具全部在误差阈值内；
- 所有声明支持的源/目标组合有测试；
- 同系转换保持输入值；
- 无效数值返回结构化错误；
- 转换服务不修改传入对象。

### P5-03 实现坐标缓存服务

**目标**

按需生成目标坐标并写回 Point，重复请求使用缓存。

**修改文件**

- `src/features/coordinate-transform/pointCoordinateService.ts`
- `src/features/coordinate-transform/cachePolicy.ts`
- `src/features/coordinate-transform/__tests__/pointCoordinateService.test.ts`

**技术要求**

- 优先返回 original 或 converted 缓存；
- 缓存缺失时调用转换服务；
- 写入时只更新 `coordinates.converted[target]`；
- 为算法版本升级预留缓存版本/失效策略；
- 并发请求同一目标时避免重复写入或数据覆盖。

**验收标准**

- 第二次相同请求不重复计算；
- 转换后 original 完全不变；
- 刷新后缓存仍可用；
- 两种目标坐标并发生成后都存在。

### P5-04 实现单点/批量转换交互

**目标**

在 Point Manager 内完成目标坐标选择和转换反馈。

**修改文件**

- `src/features/coordinate-transform/ConvertCoordinatesDialog.tsx`
- `src/features/coordinate-transform/useCoordinateConversion.ts`
- `src/features/points/PointsToolbar.tsx`
- `src/features/points/PointsTable.tsx`
- `src/features/coordinate-transform/__tests__/ConvertCoordinatesDialog.test.tsx`

**技术要求**

- 单点和已选点位复用同一弹窗；
- 用户明确选择目标坐标系；
- 显示处理进度与成功/失败数；
- 单点失败不阻断其他点；
- 转换过程中防止重复提交；
- 不新增独立坐标转换一级页面。

**验收标准**

- 单点和批量均可生成目标坐标；
- 已缓存点位被快速复用；
- 部分失败时成功点仍保存；
- 完成后列表坐标状态更新；
- 页面不存在自动识别或异常判断入口。

## Phase 6：地图页面

### P6-01 实现地图设置

**目标**

让用户在浏览器本地配置三家地图密钥。

**修改文件**

- `src/features/settings/MapSettingsDialog.tsx`
- `src/features/settings/MapCredentialField.tsx`
- `src/features/maps/MapPageShell.tsx`
- `src/features/settings/__tests__/MapSettingsDialog.test.tsx`

**技术要求**

- 支持高德 Key、百度 AK、天地图 Token；
- 输入默认遮罩，可临时显示；
- 保存到 `sdt:v2:map-credentials`；
- 明示 localStorage 风险和第三方 SDK 请求；
- 地图设置按钮在各地图页常驻。

**验收标准**

- 分别保存和读取三种密钥；
- 刷新后保留；
- 清空当前密钥后当前地图停止加载；
- UI 和日志均不意外显示完整密钥。

### P6-02 建立 SDK 延迟加载器与平台适配器

**目标**

统一地图页使用方式，同时隔离三个 SDK 的加载和销毁。

**修改文件**

- `src/features/maps/types.ts`
- `src/features/maps/MapAdapter.ts`
- `src/features/maps/sdk/loadScript.ts`
- `src/features/maps/amap/amapLoader.ts`
- `src/features/maps/baidu/baiduLoader.ts`
- `src/features/maps/tianditu/tiandituLoader.ts`
- `src/features/maps/__tests__/sdkLoaders.test.ts`

**技术要求**

- 没有当前平台密钥时绝不注入 SDK script；
- 防止同一 SDK 重复注入；
- 加载失败可重试；
- Adapter 至少提供 init、setMarkers、fitView、destroy；
- 页面卸载时清理实例和事件；
- 不把密钥放入日志或应用内跳转 URL。

**验收标准**

- 无 Key 测试中 DOM 不存在对应 SDK script；
- 有 Key 时只加载当前平台 SDK；
- 从高德切百度不会复用错误的全局对象；
- 重复进入页面不会重复创建不可回收实例；
- 网络失败显示可操作错误。

### P6-03 实现通用点位选择器

**目标**

在地图 Sidebar 中搜索和选择本地点位。

**修改文件**

- `src/features/maps/PointPickerDialog.tsx`
- `src/features/maps/useMapPointSelection.ts`
- `src/features/maps/MapSidebar.tsx`
- `src/features/maps/__tests__/PointPickerDialog.test.tsx`

**技术要求**

- 支持搜索、单选/多选、全选当前结果；
- 取消时不提交临时修改；
- 确认后更新 Sidebar 和 Marker；
- 大数据量使用分页/虚拟化；
- 选择状态只保存 Point ID，不复制完整 Point。

**验收标准**

- 取消后原选择不变；
- 全选范围符合当前搜索结果；
- 删除的 Point 不再出现在已选列表；
- 无点位时提供前往 Point Manager 的入口。

### P6-04 实现地图坐标准备流程

**目标**

在展示前按平台取得正确坐标，并将新转换结果缓存。

**修改文件**

- `src/features/maps/mapCoordinateService.ts`
- `src/features/maps/useMapMarkers.ts`
- `src/features/maps/__tests__/mapCoordinateService.test.ts`

**技术要求**

- 高德请求 GCJ02；
- 百度请求 BD09；
- 天地图请求 WGS84；
- 复用 P5 缓存服务；
- 个别转换失败不阻塞其余 Marker；
- Marker view model 只包含 id、name、x、y。

**验收标准**

- 三个平台分别消费正确坐标系；
- 缺失坐标会按需生成并持久化；
- 已缓存坐标不重复计算；
- 部分失败时页面准确显示成功和失败数量。

### P6-05 实现高德地图页面

**目标**

在 `/map/amap` 使用 GCJ02 展示所选点位。

**修改文件**

- `src/features/maps/amap/AMapPage.tsx`
- `src/features/maps/amap/AMapAdapter.ts`
- `src/features/maps/amap/__tests__/AMapAdapter.test.ts`

**技术要求**

- 使用官方浏览器 SDK；
- Key 缺失时只展示配置引导；
- Marker 点击展示点位名称和 GCJ02；
- 多点 fit view，单点合理缩放；
- 保持平台实现局部化。

**验收标准**

- 配置有效 Key 后地图正常加载；
- 所选点位均以 GCJ02 展示；
- 清空选择后 Marker 清空；
- 切换页面时实例正确销毁。

### P6-06 实现百度地图页面

**目标**

在 `/map/baidu` 使用 BD09 展示所选点位。

**修改文件**

- `src/features/maps/baidu/BaiduMapPage.tsx`
- `src/features/maps/baidu/BaiduMapAdapter.ts`
- `src/features/maps/baidu/__tests__/BaiduMapAdapter.test.ts`

**技术要求**

- 使用官方浏览器 SDK；
- AK 缺失时不加载 SDK；
- Marker 点击展示点位名称和 BD09；
- 不复用高德坐标或实例。

**验收标准**

- 配置有效 AK 后地图正常加载；
- 所选点位均以 BD09 展示；
- 多点视野覆盖正确；
- 加载失败可重试或打开设置。

### P6-07 实现天地图页面

**目标**

在 `/map/tianditu` 使用 WGS84 展示所选点位。

**修改文件**

- `src/features/maps/tianditu/TiandituMapPage.tsx`
- `src/features/maps/tianditu/TiandituMapAdapter.ts`
- `src/features/maps/tianditu/__tests__/TiandituMapAdapter.test.ts`

**技术要求**

- 使用官方浏览器 API；
- Token 缺失时不加载地图；
- Marker 点击展示点位名称和 WGS84；
- 不直接复制参考工程中硬编码 Token 的配置。

**验收标准**

- 配置有效 Token 后地图正常加载；
- 所选点位均以 WGS84 展示；
- 源为 WGS84 时不产生重复 converted 缓存；
- 源为其他坐标系时按需生成 WGS84。

### P6-08 地图页集成与性能验收

**目标**

验证三平台生命周期、错误状态和批量 Marker 表现。

**修改文件**

- `tests/e2e/maps.spec.ts`
- `tests/fixtures/points.ts`
- `src/features/maps/MapPageShell.tsx`
- 各平台 Adapter（按测试结果调整）

**技术要求**

- SDK 网络请求可在自动化测试中 mock；
- 覆盖无 Key、有 Key、加载失败、空选择、多点选择；
- 建立 1,000 Marker 性能基线；
- 若普通 Marker 不满足基线，使用平台聚合/海量点实现，但不扩张产品功能。

**验收标准**

- 三个平台核心 E2E 场景通过；
- 页面切换无明显全局对象冲突；
- 1,000 点场景达到项目确认的交互性能指标；
- Marker 数量和转换失败提示准确。

## Phase 7：首页

### P7-01 实现首页内容结构

**目标**

建设介绍型首页，清晰表达价值、流程和工具入口。

**修改文件**

- `src/features/home/HomePage.tsx`
- `src/features/home/HeroSection.tsx`
- `src/features/home/FeatureSection.tsx`
- `src/features/home/WorkflowSection.tsx`
- `src/features/home/ToolEntrySection.tsx`
- `src/features/home/home.css`

**技术要求**

- Hero 聚焦“空间数据转换和地图验证”；
- 三个功能模块为点位管理、坐标转换、地图验证；
- 流程为导入数据 → 转换坐标 → 地图查看；
- 提供四个内部入口；
- 首页不使用后台统计卡和点位表格。

**验收标准**

- 用户可从首页进入 Point Manager 和三个地图页；
- 首屏清晰说明工具用途；
- 流程与 PRD 一致；
- 桌面和小屏布局均无横向溢出。

### P7-02 实现地图平台资源卡片

**目标**

提供三家平台官网和 API 文档入口。

**修改文件**

- `src/features/home/MapPlatformResources.tsx`
- `src/features/home/mapPlatformLinks.ts`
- `src/features/home/__tests__/MapPlatformResources.test.tsx`

**技术要求**

- 链接集中配置；
- 提供高德、百度、天地图官网和 API 文档；
- 外链新窗口打开并使用安全的 `rel`；
- 标记为第三方资源；
- 发布前人工校验链接有效性。

**验收标准**

- 三张资源卡内容完整；
- 六个链接目标正确；
- 外链不替换当前应用页面；
- 链接文字可理解，不使用裸 URL。

### P7-03 完成全流程回归与发布检查

**目标**

确认首页到数据管理、转换和地图验证的完整闭环。

**修改文件**

- `tests/e2e/core-flow.spec.ts`
- `tests/e2e/import.spec.ts`
- `tests/e2e/points.spec.ts`
- `README.md`
- `.env.example`（仅在确有非密钥配置需要时）

**技术要求**

- 自动化覆盖手动添加、CSV 导入、JSON 粘贴、批量转换、地图选择；
- 测试不得提交真实平台密钥；
- README 说明数据本地存储、浏览器兼容性和地图密钥配置；
- 检查构建产物不含硬编码 Key/AK/Token；
- 检查 V1 禁止功能没有入口或暗示。

**验收标准**

- PRD 第 8 节主流程全部通过；
- 类型检查、单元测试、E2E、生产构建通过；
- 构建产物扫描不含真实密钥；
- 刷新后点位和转换缓存仍存在；
- 无后端接口、用户系统、GeoJSON、自动坐标识别、异常/区域校验实现。

## 8. 阶段依赖与交付门槛

| Phase | 依赖 | 完成门槛 |
| --- | --- | --- |
| Phase 1 | 确认真实源码位置 | 路由、页面壳、构建与类型检查通过 |
| Phase 2 | Phase 1 | 数据模型、数据库和设置存储测试通过 |
| Phase 3 | Phase 2 | 手动点位 CRUD 与刷新持久化通过 |
| Phase 4 | Phase 2、3 | 四类来源导入和统计一致 |
| Phase 5 | Phase 2、3；上海2000定义 | 算法夹具通过，缓存不覆盖原始坐标 |
| Phase 6 | Phase 5；三平台测试密钥 | 三独立页面按正确坐标显示 |
| Phase 7 | Phase 1、3、6 | 首页完成且核心 E2E 全通过 |

## 9. 开发前必须解决的阻塞项

### B-01 确认目标应用源码

当前只看到参考工程。必须明确是在根目录新建产品，还是补充现有产品仓库。此项决定所有实际文件路径和迁移策略。

### B-02 确认“上海2000”

必须提供：

- 正式坐标系名称和定义；
- 轴顺序与单位；
- 投影/转换参数及来源；
- 至少 3 组权威对照坐标；
- 可接受误差。

该信息缺失时，P5 中上海2000只能保留类型和 UI 占位，不得完成算法验收。

### B-03 准备地图平台测试配置

为开发/测试域名准备高德 Key、百度 AK、天地图 Token，并确认各平台控制台白名单、配额和 SDK 版本。真实密钥不得提交到仓库。

## 10. Definition of Done

任一任务只有同时满足以下条件才可标记完成：

- 实现与 PRD 范围一致；
- 目标、修改文件、技术要求已落实；
- 验收标准逐条验证；
- 新增逻辑有相称的自动化测试；
- 类型检查和构建通过；
- 无真实密钥或设备业务数据进入仓库；
- 未引入 V1 明确排除的功能；
- 文档与实际行为同步。
