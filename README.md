# Coordinate Toolkit

设备点位坐标转换与地图验证工作台。

当前工程处于 **Phase 1 Batch A**：只包含 React 工程基础、应用布局、空壳路由和测试基础设施，不包含地图、点位、导入、坐标转换或本地存储功能。

## 环境要求

- Node.js 22.17.0 或更高的 Node 22版本
- pnpm 11.17.0 或更高的 pnpm 11版本

项目通过 `packageManager` 和 `.node-version` 固定工具链基线。

如果系统未直接安装pnpm，可以使用Node自带的Corepack：

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
```

也可以在命令前使用 `corepack pnpm`。

## 安装

```bash
pnpm install
```

## 开发

```bash
pnpm dev
```

启动后访问Vite输出的本地地址。

## 可用路由

- `/`：首页空壳
- `/points`：Point Manager空壳
- `/map/amap`：高德地图页面空壳
- `/map/baidu`：百度地图页面空壳
- `/map/tianditu`：天地图页面空壳

地图路由不会加载地图SDK，也不会读取API Key。

## 质量检查

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
```

开发测试监听：

```bash
pnpm test
```

## 当前目录边界

```text
src/
├── app/        应用入口、路由和布局
├── pages/      页面组合与路由空壳
├── components/ 跨Feature展示组件
├── features/   用户用例（当前未实现）
├── domain/     领域类型与规则（后续Batch）
├── core/       坐标与地图核心契约（后续Batch）
├── adapters/   地图、文件和存储适配（后续Phase）
├── config/     路由等静态配置
├── hooks/      通用React Hook
├── styles/     全局基础样式
├── test/       测试初始化和帮助函数
└── utils/      无业务语义的纯工具
```

## 当前明确未实现

- 地图SDK与地图Adapter
- Marker、InfoWindow、fitView、聚合与海量点
- API Key、AK、Token设置与存储
- IndexedDB与localStorage
- Point Domain模型与点位CRUD
- Excel、CSV、JSON导入与字段映射
- WGS84、GCJ02、BD09、上海2000和CGCS2000转换
- 文件上传与导出
- 完整首页、Point Manager和地图业务界面

## 迁移边界

`reference/map-tools` 和 `reference/gisviewer-react` 只用于能力与架构分析。新工程：

- 不在运行时引用reference代码；
- 不复制旧页面、CSS或状态管理；
- 不修改reference项目；
- 后续迁移必须遵守 `docs/decisions/ADR-005-legacy-code-boundary.md`。
