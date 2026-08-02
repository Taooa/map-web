# 当前项目上下文

> 项目：地图工具（Coordinate Toolkit）
> 快照日期：2026-08-02
> 事实来源：当前工作区源码、依赖、测试和 Git 状态。本文替代此前同名文档中的过期状态。

## 产品定位

Coordinate Toolkit 是一个浏览器本地运行的设备点位管理、坐标转换与地图核验工作台。它围绕 Point 提供录入、文件/JSON 导入、本地持久化、坐标转换、导出和三平台地图展示，不是通用 GIS、企业后台或在线协作系统。

## 当前功能完成情况

已形成可运行主闭环：点位录入或导入 → IndexedDB 保存 → 列表查询/选择 → WGS84、GCJ02、BD09 转换缓存 → 导出或地图展示。

- 点位管理已全面切换为 Ant Design 6；
- 查询条件采用草稿态/已应用态，只有查询或 Enter 才应用；
- 表格支持固定列、内部滚动、创建/更新时间排序、外部分页和跨页选择；
- 新增支持表单、Excel/CSV/JSON 上传及 JSON 粘贴映射；
- 编辑、转换、导出、单条/批量删除已使用 Ant Design Drawer、Modal、Popconfirm；
- 地图仍是单一工作台，通过 `platform` 查询参数切换平台；
- 25 个测试文件、106 项测试通过。

## 当前架构

```text
Page
  ↓
Feature
  ↓
Service
  ↓
Repository
  ↓
Adapter / Storage
```

点位页面只负责编排页面状态和对话框；查询、排序、分页、范围解析在 points feature；业务约束在 PointService；持久化通过 PointRepository 进入 IndexedDB，失败时降级 MemoryRepository；坐标算法与地图平台能力留在各自 Adapter/Service。

Ant Design 在 `src/app/AntdProvider.tsx` 统一接入 `ConfigProvider`、中文 locale、`App` 上下文和 PeachTools 明暗主题。业务通知通过 `App.useApp()` 调用，不使用静态 message API。

## 技术栈

| 类别 | 当前实现 |
| --- | --- |
| 运行时 | React 19.2.8、React DOM 19.2.8 |
| UI | Ant Design 6.5.3、`@ant-design/icons` 6.3.2 |
| 路由 | React Router DOM 7.18.2 |
| 构建 | Vite 8.1.5、TypeScript 6.0.3 |
| 坐标 | gcoord 0.3.2 |
| 文件 | xlsx 0.18.5、项目内 CSV/JSON parser |
| 存储 | IndexedDB + MemoryRepository 降级 |
| 测试 | Vitest 4.1.10、Testing Library、jsdom、fake-indexeddb |
| 规范 | ESLint 10、Prettier 3.9.6 |

项目要求 Node `>=22.17.0`、pnpm `>=11.17.0`，`packageManager` 固定为 `pnpm@11.17.0`。

## 页面列表

| 路由 | 页面 | 状态 |
| --- | --- | --- |
| `/` | 首页 | 已实现 |
| `/points` | Ant Design 点位管理 | 已实现 |
| `/map?platform=amap` | 高德地图工作台 | 已实现 |
| `/map?platform=baidu` | 百度地图工作台 | 已实现 |
| `/map?platform=tianditu` | 天地图工作台 | 已实现 |
| `/map/amap` 等旧地址 | 重定向到统一工作台 | 保留兼容 |
| `*` | 404 | 已实现 |

## 数据流

```text
表单 / Upload / JSON
  → parser + ImportService
  → PointService
  → PointRepository
  → IndexedDB（失败时 MemoryRepository）
  → PointsPageAntd 查询与选择
  → 转换缓存 / Excel 或 JSON 导出 / MapWorkspacePage
```

Point 坐标规则：

- `original` 是原始输入，坐标转换不得覆盖；显式编辑原坐标数值时仍保持其坐标系身份；
- `converted` 是转换缓存，只存派生坐标；
- 正式转换只支持 WGS84、GCJ02、BD09；
- 上海2000只能录入、保存和展示，不能生成正式转换结果；
- CGCS2000 不开放入口；
- 批量范围统一为：已选择点位 > 已执行查询的完整结果 > 全部点位。

## 已完成模块

- 应用壳、路由、明暗主题与 Ant Design 根 Provider；
- Point 领域模型、列表模型、PointService；
- Memory / IndexedDB Repository 与降级机制；
- Excel、CSV、JSON 解析、字段映射和导入；
- 点位查询、固定表格、外部分页、排序、跨页选择；
- 新增、编辑、转换、Excel/JSON 导出、单条与批量删除；
- WGS84、GCJ02、BD09 转换和缓存；
- 高德、百度、天地图单一地图工作台与最小 MapAdapter；
- 点位、仓储、坐标、地图生命周期、页面和路由自动化测试。

## 未完成模块

- 上海2000正式转换：缺少经评审的参数来源、权威样本和误差基线；
- CGCS2000：未开放且不得提前增加入口；
- 真实浏览器中的 Excel/JSON 下载、超大文件和窄屏视觉验收；
- 大数据量导入/转换的 Worker、进度和取消能力；
- 地图真实凭据下的跨平台发布验收；
- 主包体积优化：Ant Design 接入后主 JS 超过 Vite 500 kB 告警阈值；
- `src/styles/globals.css` 中仍有部分历史点位样式，因与地图共享选择器交叉，需先逐条确认归属再安全删除。

## 开发约束

- 不重新设计架构，不按个人偏好替换技术方案；
- 保持 `Page → Feature → Service → Repository → Adapter / Storage`；
- 不引入后端、用户系统、大型状态管理或通用 GIS 能力；
- 不恢复 TransformationGraph、AlgorithmRegistry、Map Provider Registry 或大型插件系统；
- 地图保持统一工作台；公共 `MapAdapter` 只保留 `mount`、`setPoints`、`fitView`、`clear`、`destroy`；
- 平台特殊能力只放在 `src/adapters/maps/{platform}/`；
- 修改后运行 build、typecheck、lint 和 test:run，并判断是否需要同步文档；
- 工作区存在未提交改动，禁止以清理为由覆盖或删除。

## 禁止修改范围

未经明确确认不得：

- 修改 `reference/` 或复制旧项目实现；
- 修改坐标算法、上海2000转换逻辑、`Point.original` 数据结构；
- 恢复三个独立地图页面；
- 扩大公共 MapAdapter；
- 删除当前未提交或未跟踪文件；
- 执行 `git reset`、`git clean` 或 checkout 覆盖；
- 升级框架或依赖版本；
- 引入后端、账号、通用 Geometry/Layer、GeoJSON 编辑或坐标系自动识别。

## 下一步建议

1. 在真实 Chrome/Edge 中逐项验收点位新增、跨页选择、转换、下载和批量删除，并补截图或验收记录。
2. 按路由或页面粒度延迟加载 Ant Design 点位页，评估主包拆分，禁止为减包体重构业务架构。
3. 使用 10,000 点样本验证导入、表格滚动、转换与导出性能，再决定是否引入 Worker。
4. 对 `globals.css` 的历史点位选择器逐条做引用证明，只删除确认无共享使用的规则。
5. 上海2000继续保持“保存/展示但不转换”，待权威资料和基线测试齐备后单独评审。

## 当前验证快照

- `pnpm install --frozen-lockfile`：通过，锁文件无需更新；
- `pnpm build`：通过；主 JS 1,332,900 bytes，CSS 59,789 bytes，dist 总计 3,996,250 bytes；
- `pnpm typecheck`：通过；
- `pnpm lint`：通过；
- `pnpm test:run`：25 个文件、106 项测试全部通过；
- 全仓 `pnpm format:check`：未通过，17 个文件存在既有格式差异；本轮文件已定向格式化；
- `pnpm why` 三个旧依赖无输出：TanStack Table 与两项 Radix UI 依赖已不在依赖树。
