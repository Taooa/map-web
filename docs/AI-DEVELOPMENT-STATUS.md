# AI Development Status

> 项目：地图工具（Coordinate Toolkit）
> 检查日期：2026-08-02
> 状态依据：当前工作区，不以历史计划中的过期描述代替源码事实。

## 项目状态

项目处于真实功能维护阶段。点位管理已从自定义表格、TanStack Table 和 Radix UI 全面切换到 Ant Design 6；坐标、仓储和地图架构未重构。

## 当前版本

- 应用版本：`0.1.0`
- Node：桌面内置 `v24.14.0`，满足 `>=22.17.0`
- pnpm：`11.17.0`，满足项目要求
- React：`19.2.8`
- Ant Design：`6.5.3`
- `@ant-design/icons`：`6.3.2`

## 当前 Git Commit

- 分支：`main`
- Commit：`4dd874456d6e65f9586679ac887729420f46be71`
- 时间：`2026-07-31T14:18:57+08:00`
- 说明：`✨ feat(0.0.8：点位管理): 功能优化`

## 当前未提交修改

工作区不干净，且本轮开始前已经存在领域、Repository、PointService、列表模型、文档和测试改动。本轮保留并继续集成，没有执行 reset、clean、checkout 覆盖，也没有删除无关未跟踪文件。

本轮 Ant Design 迁移的主要文件：

- `src/app/AntdProvider.tsx`、`src/app/App.tsx`、`src/app/router.tsx`；
- `src/pages/PointsPageAntd.tsx`；
- `src/features/points/components/antd/*`；
- `src/features/points/point-export.ts`、`points-antd.css`；
- `src/test/render.tsx`、`src/test/setup.ts`、`tests/pages/points-antd.test.tsx`；
- `package.json`、`pnpm-lock.yaml`、README 与 V2 文档。

已删除的旧点位 UI 包括旧 `PointsPage.tsx`、`PointTable.tsx`、旧列表控制测试，以及 points/components 下旧的 TanStack/Radix 表格、分页、复选框和删除弹窗实现。

## 当前已完成能力

- Ant Design 根 Provider、中文 locale、PeachTools 明暗主题和 App 消息上下文；
- 显式查询/重置、固定查询区、表格内部滚动、外部分页；
- 创建/更新时间排序、受控跨页选择、当前页全选；
- Form/Upload/JSON 三种新增方式、字段映射和预览；
- Drawer 编辑，Modal 转换/导出/批量删除，Popconfirm 单条删除；
- 已选择 > 查询结果 > 全部数据的统一操作范围；
- WGS84、GCJ02、BD09 正式转换，上海2000仅保存展示，CGCS2000不开放；
- Excel 代码动态加载，避免把 xlsx 合并进主入口包；
- 25 个测试文件、106 项测试通过。

## 当前开发中的功能

Ant Design 代码迁移已完成并通过自动化门禁，当前剩余工作主要是人工验收和性能收口：

- 真实浏览器下载、上传和无障碍操作验证；
- 大数据量测试；
- 主包拆分评估；
- 安全清理全局 CSS 中有共享风险的历史点位规则。

## 当前风险

- 主 JS 从迁移前 884,644 bytes 增至 1,332,900 bytes，增加 448,256 bytes（约 50.7%）；dist 总量从 3,117,179 增至 3,996,250 bytes，增加 879,071 bytes（约 28.2%）。Vite 构建成功但产生大分块警告。
- 全仓 Prettier 检查仍有 17 个既有格式差异，主要位于地图、坐标服务和旧测试；为保护未提交代码，本轮未执行全仓写入格式化。
- `globals.css` 中历史点位样式与地图共享选择器存在交叉，不能用宽泛正则整段删除。
- 上海2000缺少权威转换基线，不得误标为正式转换能力。
- 工作区改动范围较大，提交前需要人工复核哪些属于迁移前在途代码。

## 下一步建议

1. 真实浏览器验收 `/points` 全流程，重点检查跨页选择、横向滚动、弹窗重置和下载文件。
2. 对点位页进行页面级延迟加载实验并对比包体，保持业务与架构不变。
3. 建立 10,000 点导入/转换/导出性能基线。
4. 单独安排全仓格式化或逐文件清理，避免与当前脏工作区混在同一提交。
5. 提交前按迁移前/本轮改动来源拆分审阅，不自动丢弃任何文件。

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
| Node | `v24.14.0`，通过 |
| pnpm | `11.17.0`，通过 |
| `pnpm install --frozen-lockfile` | 通过，Already up to date |
| `pnpm build` | 通过，存在主包体积警告 |
| `pnpm typecheck` | 通过 |
| `pnpm lint` | 通过，0 warning |
| `pnpm test:run` | 25 files / 106 tests 通过 |
| 迁移文件定向 Prettier | 通过 |
| 全仓 `pnpm format:check` | 未通过：17 个既有格式差异 |
| 旧依赖 `pnpm why` | 无输出，已移除 |
