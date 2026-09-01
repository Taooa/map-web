# AI Development Status

> 项目：地图工具（Coordinate Toolkit）
> 检查日期：2026-09-01
> 状态依据：当前工作区，不以历史计划中的过期描述代替源码事实。

## 项目状态

项目处于真实功能维护阶段。点位管理已全面切换到 Ant Design 6；地图展示页已完成全尺寸地图、悬浮工具区和当前地图点位工作区。本轮继续沿用既有坐标、仓储、Service、Repository 与地图 Adapter 架构。

## 当前版本

- 应用版本：`0.1.0`
- Node：桌面工作区运行时 `v24.19.0`，满足 `>=22.17.0`
- pnpm：当前命令版本 `11.19.0`，满足 `>=11.17.0`；项目声明仍为 `pnpm@11.17.0`
- React：`19.2.8`
- Ant Design：`6.5.3`
- `@ant-design/icons`：`6.3.2`

## 当前 Git Commit

- 分支：`dev`
- Commit：`eb5def37a9e1d0ff3c6e98e415d17a5833266396`
- 时间：`2026-09-01T18:37:16+08:00`
- 说明：`fix(map): stabilize floating controls on layer changes`

## 当前未提交修改

工作区不干净，当前未提交内容属于地图点位工作区、添加弹窗优化、IndexedDB 来源选项修正及对应文档和测试。本轮没有执行 reset、clean、checkout 覆盖，也没有删除未跟踪文件。

当前修改文件：

- `src/pages/maps/MapWorkspacePage.tsx`；
- `src/styles/globals.css`；
- `src/adapters/storage/indexeddb/indexeddb-point-repository.ts`；
- `tests/pages/prototype-pages.test.tsx`；
- `tests/repository/indexeddb-point-repository.test.ts`；
- `docs/Coordinate-Toolkit-PRD-V2.md`、`docs/Coordinate-Toolkit-TASKS-V2.md`；
- `docs/CURRENT-PROJECT-CONTEXT.md`、`docs/AI-DEVELOPMENT-STATUS.md`。
- `README.md`。

## 当前已完成能力

- Ant Design 根 Provider、中文 locale、PeachTools 明暗主题和 App 消息上下文；
- 显式查询/重置、固定查询区、表格内部滚动、外部分页；
- 创建/更新时间排序、受控跨页选择、当前页全选；
- Form/Upload/JSON 三种新增方式、字段映射和预览；
- Drawer 编辑，Modal 转换/导出/批量删除，Popconfirm 单条删除；
- 已选择 > 查询结果 > 全部数据的统一操作范围；
- WGS84、GCJ02、BD09 正式转换，上海2000仅保存展示，CGCS2000不开放；
- Excel 代码动态加载，避免把 xlsx 合并进主入口包；
- 全尺寸地图主体、可收起左侧点位 Overlay、右上工具区和右下基础控制区；
- 三平台 Key 合并配置、平台切换和当前平台 Toolbar Popover；
- `workspacePointIds`、`visiblePointIds`、`pointCache` 三层地图工作区状态；
- 添加点位候选排除、名称/来源筛选、分页、跨页选择和全选全部查询结果；
- 候选表格展示 WGS84、GCJ02、BD09 坐标“有/无”，仅表格内容可滚动且隐藏滚动条；
- 左侧 Marker 显隐、单点移出、全部显示、清空显示和清空列表；
- 25 个测试文件、113 项测试通过。

## 当前开发中的功能

地图工作区 V1 和添加点位弹窗优化已完成并通过自动化门禁，当前剩余工作主要是人工验收和后续地图能力分阶段开发：

- 真实地图凭据下验证三平台 Marker、Popup、fitView 和浮层稳定性；
- 大数据量全选、工作区缓存和 Marker 渲染测试；
- 平台真实图层能力和 POI 搜索尚未进入当前实现；
- 主包拆分评估与历史 CSS 安全清理。

## 当前风险

- 当前主 JS 约 1,352.57 kB，Vite 构建成功但仍产生大分块警告。
- “全选全部”只保存 PointId，但超大查询结果仍会产生 O(N) ID 内存；全部显示大量 Marker 时性能主要受各地图 SDK 限制。
- IndexedDB 为生成完整来源下拉选项需要扫描点位来源；当前不物化全部 Point 到页面，但大数据量下仍需建立耗时基线。
- `globals.css` 中历史点位样式与地图共享选择器存在交叉，不能用宽泛正则整段删除。
- 上海2000缺少权威转换基线，不得误标为正式转换能力。
- 当前地图状态仅保存在页面会话中，刷新后不会恢复工作区点位，这是 V1 当前行为。

## 下一步建议

1. 使用真实三平台凭据验收工作区添加、显隐、Popup、fitView、平台切换和浮层稳定性。
2. 使用 1,000/10,000 点样本建立候选查询、全选、缓存和 Marker 渲染基线。
3. 后续按独立阶段实现真实图层能力和 POI 搜索，不修改公共 MapAdapter。
4. 评估页面级代码拆分，保持现有业务和架构不变。
5. 提交前复核当前十个修改文件，不自动丢弃任何内容。

## 禁止修改范围

- `reference/`；
- 坐标算法和上海2000转换逻辑；
- `Point.original` 数据结构及不可覆盖规则；
- 地图统一工作台和最小 MapAdapter 契约；
- 当前未提交/未跟踪文件，除非已确认归属；
- TransformationGraph、AlgorithmRegistry、Map Provider Registry、大型状态管理、后端、用户系统和通用 GIS 能力。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| Node | `v24.19.0`，通过 |
| pnpm | `11.19.0`，满足项目最低版本；项目声明为 `pnpm@11.17.0` |
| `pnpm build` | 通过，存在主包体积警告 |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过，0 warning |
| `pnpm test:run` | 25 files / 113 tests 通过 |
| 本轮文件 Prettier | 通过 |
| `git diff --check` | 通过，仅有 LF/CRLF 转换提示 |
