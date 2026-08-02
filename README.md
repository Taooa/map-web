# Coordinate Toolkit（地图工具）

Coordinate Toolkit 是一个浏览器本地运行的设备点位管理、坐标转换与地图核验工作台。当前应用已具备点位录入/导入、本地持久化、WGS84/GCJ02/BD09 转换缓存，以及高德、百度、天地图统一工作台。

## 环境要求

- Node.js `>=22.17.0`
- pnpm `>=11.17.0`（项目固定为 `pnpm@11.17.0`）

```bash
pnpm install
pnpm dev
```

## 页面

- `/`：工具首页
- `/points`：点位管理（Ant Design 查询、表格、分页、录入、导入、转换、导出和删除）
- `/map?platform=amap`：高德地图工作台
- `/map?platform=baidu`：百度地图工作台
- `/map?platform=tianditu`：天地图工作台

旧的 `/map/amap`、`/map/baidu`、`/map/tianditu` 地址会重定向到统一地图工作台。

## 核心规则

- Point 的 `original` 保存原始输入，不允许被坐标转换覆盖；转换结果写入 `converted` 缓存。
- 正式转换仅支持 WGS84、GCJ02、BD09。
- 上海2000只能录入、保存和展示，当前不能生成正式转换结果。
- CGCS2000 不开放用户入口。
- 数据默认保存在浏览器 IndexedDB；初始化失败时降级为当前会话内存。
- 项目不包含后端、账号系统、通用 GIS 框架或大型插件系统。

## 目录边界

```text
src/
├── app/        应用入口、Ant Design Provider、路由和布局
├── pages/      页面组合层
├── features/   点位、导入和地图展示用例
├── services/   坐标服务
├── domain/     Point、Coordinate 与共享领域类型
├── adapters/   文件、存储、坐标和地图平台适配
├── components/ 跨功能展示组件
├── styles/     全局样式与设计 Token
└── test/       测试初始化和渲染帮助
```

主要调用链保持为：`Page → Feature → Service → Repository → Adapter / Storage`。

## 质量检查

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
```

## 开发约束

- 不修改 `reference/`，也不把旧项目代码直接复制回运行时工程。
- 不恢复 TransformationGraph、AlgorithmRegistry、Map Provider Registry 或三个独立地图页面。
- 公共 `MapAdapter` 只保留 `mount`、`setPoints`、`fitView`、`clear`、`destroy`；平台能力留在各自目录。
- 不修改坐标算法、上海2000转换逻辑或 `Point.original` 数据结构，除非另行评审确认。
- 设计与当前状态以 [docs/CURRENT-PROJECT-CONTEXT.md](docs/CURRENT-PROJECT-CONTEXT.md) 为准。
