# PeachTools 地图工具参考项目分析

> 分析对象：`reference/gisviewer-react`、`reference/map-tools`  
> 分析日期：2026-07-28  
> 用途：Coordinate Toolkit 的产品和技术设计依据  
> 约束：参考项目只用于分析，不迁移代码

## 1. 执行摘要

两个参考项目分别提供不同经验：

- `gisviewer-react` 是实际业务使用的重型地图组件库，主要价值在地图容器、配置驱动、覆盖物、图层和工具模块的架构经验；
- `map-tools` 是纯浏览器地图工具原型，主要价值在文件导入、坐标转换、多地图查看和导出的业务流程。

两者都不适合作为新项目模板：

- `gisviewer-react` 以 ArcGIS 2D/3D 为核心，依赖重、接口大、类型边界弱，并没有高德/百度/天地图三套 SDK Adapter；
- `map-tools` 的产品流程更接近 Coordinate Toolkit，但三地图能力不对称，存在空实现、生命周期、批量渲染、精度和安全问题。

新项目应参考两种思想：

1. 地图公共契约、平台实现、配置驱动和资源释放；
2. 导入 → 字段映射 → 点位管理 → 坐标转换 → 地图验证。

## 2. gisviewer-react 分析

### 2.1 项目定位

一个可构建为 ES/UMD 库的 React GIS Viewer，向业务项目提供统一地图容器和 GIS 命令 API。它不是独立坐标工具，而是面向业务系统的地图能力层。

### 2.2 技术栈

- React 18、TypeScript 4.5、Vite 2.8；
- React Router 6、Ant Design 4；
- ArcGIS JS API，通过 `esri-loader` 动态加载；
- Mapbox GL、SuperMap iClient；
- ECharts/ECharts GL、Three.js、heatmap.js；
- Axios、MQTT、Pako；
- Monaco Editor、PWA。

技术跨度覆盖 2D、3D、图表、轨迹、模型和通信，明显超出 Coordinate Toolkit 所需范围。

### 2.3 目录结构

```text
src/
├── components/                  # Demo、配置、API说明
├── plugin/
│   ├── index.tsx
│   └── gis-viewer/
│       ├── MapContainer.tsx
│       ├── MapAppArcgis2D.ts
│       ├── MapAppArcgis3D.ts
│       ├── MapAppMapbox.ts
│       ├── external/
│       ├── common/
│       └── widgets/
├── router/
├── types/
└── works/
```

Widgets 包含 Cluster、CustomLayer、Draw、ECharts、FindFeature、GeometrySearch、HeatMap、Measurement、Overlays、Three、Tool、Track、WidgetsManager。

### 2.4 核心模块

#### MapContainer

- React 外观组件；
- 创建地图 DOM；
- 根据 `platform` 选择实现类；
- 传入 mapConfig；
- 绑定宿主回调；
- 向外暴露定位、图层、覆盖物、热力、绘制、搜索、轨迹、测量等命令。

#### MapAppArcgis2D / MapAppArcgis3D

- 动态加载 ArcGIS API/CSS；
- 创建 Basemap、Map、MapView/SceneView；
- 解析 token、底图、业务图层、Widget 和 View 配置；
- 注册地图事件；
- 委托 Widgets 实现具体 GIS 能力；
- 销毁 ArcGIS View。

#### MapAppMapbox

有平台类和部分瓦片配置，但主体逻辑被注释，定位、缩放等方法为空，不能视为完整实现。

### 2.5 地图抽象判断

结构上有 Facade 和平台类：

```text
MapContainer
├── MapAppArcgis2D
├── MapAppArcgis3D
└── MapAppMapbox
```

但 `IMapContainer` 只定义少量方法，和外层实际 API 不一致。大量功能依赖运行时检查 `this.mapContainer.someMethod`，因此属于“有抽象意图、没有完整强类型 Adapter 契约”。

### 2.6 高德、百度、天地图情况

- 高德：主要作为瓦片地址或 POI REST 来源；
- 天地图：主要作为 ArcGIS WebTileLayer/WMTS 底图；
- 百度：未发现 SDK 实现。

该项目不能作为三家地图 SDK 初始化、Marker、图层和销毁的直接模板。

### 2.7 数据流和配置

```text
宿主 mapConfig/props
  → MapContainer
  → MapApp
  → Widget/SDK
  → SDK事件
  → 宿主回调
```

配置包含：

- ArcGIS API 地址和主题；
- token；
- baseLayers；
- operationallayers；
- widgets；
- options；
- POI 服务和 Key。

优点是配置驱动；问题是配置缺少严格 schema，并混入硬编码 Key、Token URL、内网地址和大量注释逻辑。

### 2.8 优点

- 地图容器与具体实现有分层；
- 图层、覆盖物和工具模块化；
- 底图和 Widget 配置驱动；
- 有普通点、聚合、海量点等实际项目经验；
- 事件可转换为宿主回调；
- View 有明确销毁入口；
- 覆盖物和工具参数有较丰富类型。

### 2.9 缺点

- 巨型 MapContainer API；
- 公共接口不完整；
- 大量 `any` 和公开可变实例；
- 平台分支写死；
- Mapbox 未完成；
- React 卸载和 Widget 静态缓存清理不足；
- 配置存在硬编码凭据和内网信息；
- 依赖老旧且过重；
- 业务数据、地图实例和 React UI 边界不清。

### 2.10 值得参考

- React 容器 + 地图实现 + 独立能力模块的思想；
- 配置驱动地图初始化；
- 地图事件转产品事件；
- 覆盖物的公共参数模型；
- 大量点需要独立渲染策略；
- 地图实例必须可销毁。

## 3. map-tools 分析

### 3.1 项目定位

纯前端地图坐标工具原型，支持坐标转换、文件导入、高德/百度/天地图查看和结果导出。

### 3.2 技术栈

- React 18、TypeScript 5.3、Vite；
- React Router、Tailwind CSS；
- gcoord、proj4；
- SheetJS/xlsx；
- Jest、ts-jest、jsdom；
- 高德 JS API 2.0、百度 JS API 3.0、天地图 API 4.0。

### 3.3 页面结构

```text
/
├── /amap
├── /bmap
├── /tianditu
└── /convert
```

地图页采用左侧 320px 操作面板 + 右侧地图；转换页包含单点转换、批量文件转换、字段选择、结果预览和导出。

### 3.4 已有功能

- 手动添加点位；
- Excel/CSV/JSON 导入；
- 字段自动匹配和手动选择；
- WGS84、GCJ02、BD09、CGCS2000、SH2000转换；
- 单点、批量、全部目标转换；
- CSV/JSON 导出；
- 三地图动态 SDK；
- Marker 和信息窗；
- 底图切换；
- 高德绘制、测距、测面积；
- 高德正逆地理编码、搜索、天气；
- 高德普通点、LabelMarker、MassMarks、Cluster 分级尝试；
- 加载、错误、进度和 ErrorBoundary。

### 3.5 未真正完成的能力

- 百度绘制和测量仅警告；
- 天地图绘制和测量为空；
- 三平台 `getSelectedPoints()` 都返回空数组；
- 框选导出不可用；
- LocaLayer、MapRenderer、MapContainer 与主 Hook 架构未完整统一。

自带 PRD/TASKS 把部分能力写为已完成，但当前源码并不支持。分析应以代码为准。

### 3.6 核心数据流程

```mermaid
flowchart LR
    A["上传 Excel/CSV/JSON"] --> B["解析 data/headers"]
    B --> C["自动匹配字段"]
    C --> D["构造 Point"]
    D --> E["选择源坐标系"]
    E --> F["坐标转换"]
    F --> G["地图 Marker / 表格预览"]
    G --> H["导出"]
```

存在的问题：

- CSV 用 split 解析，无法正确处理带引号的逗号和换行；
- 只从第一行决定 headers；
- `parseFloat` 失败后使用 0，可能制造假点；
- Point 保留整行 `rawData`；
- 没有 IndexedDB，刷新丢失；
- 自动字段匹配可能误判；
- 解析、规范化和 UI 状态耦合。

### 3.7 地图抽象

```text
MapHookReturn
├── useAmap
├── useBmap
└── useTianditu
```

三个 Hook API 同形，包含 initMap、addMarkers、clearMarkers、setLayer、绘制、测量、选择、destroy。

优点：

- 有统一调用形态；
- 地图生命周期被放入 Hook；
- SDK Promise 做加载去重。

问题：

- `MapVisual` 同时创建三个 Hook，再选择当前 Hook；
- 公共接口假设能力完全一致；
- 不支持的平台使用空实现；
- Hook 同时负责 SDK、坐标转换、Marker、图层、工具和地理编码，职责过大。

### 3.8 三地图实现

#### 高德

- 动态 script + 全局 callback；
- `AMap.Map` 初始化；
- 普通 Marker、LabelsLayer、MassMarks、MarkerCluster；
- 标准/卫星/交通图层；
- MouseTool 绘制和测量；
- destroy 清除工具、点位并调用 map.destroy。

#### 百度

- 动态加载百度 JS API；
- `BMap.Map` 初始化；
- `BMap.Marker` 和 InfoWindow；
- 标准/卫星；
- 绘制和测量未实现；
- 销毁主要依赖清空 Overlay 和容器。

#### 天地图

- 动态加载 API 4.0；
- 延时检查 `window.T.Map`；
- Marker、InfoWindow；
- 矢量/影像/地形 TileLayer；
- 绘制和测量为空；
- 清除 Overlay 和 Layer，但没有明确实例 dispose。

### 3.9 坐标转换

- gcoord：WGS84/GCJ02/BD09；
- proj4：SH2000/CGCS2000；
- TRANSFORM_PATHS 定义转换路径；
- 地图目标映射：高德 GCJ02、百度 BD09、天地图 CGCS2000；
- 转换前执行坐标范围校验。

风险：

- CGCS2000 被近似当作 WGS84经纬度；
- SH2000参数没有权威来源和误差样本；
- 多段转换可能累计误差；
- 错误结果仍携带 `(0, 0)`；
- 坐标系“推测”证据不足，容易误导。

### 3.10 大量点问题

高德 Hook 按 1,000/10,000 阈值选择不同策略，但页面在超过 50 点时又分批调用 addMarkers。由于 addMarkers 每次先 clearMarkers，前一批会被后一批清除，最终结果不可靠。

MassMarks 大量点路径又创建 MarkerCluster Marker，可能造成双份对象和内存开销。

### 3.11 生命周期和安全问题

- script 没设置 ID，但 unloadMap 按 ID 删除，实际无效；
- 全局 callback 未清理；
- Promise 缓存不区分 Key 和版本；
- 失败 script 可能残留；
- InfoWindow 拼接未转义名称，存在 HTML 注入风险；
- 天地图瓦片使用 HTTP，HTTPS 页面可能阻断；
- Key 只来自构建环境，缺少用户本地设置。

### 3.12 值得参考

- 导入、字段确认、转换、展示、导出流程；
- 三地图独立路由；
- SDK Promise 去重；
- 地图与目标坐标系显式映射；
- 转换路径表；
- 原始坐标与转换坐标区分；
- 地图左侧操作、右侧地图；
- 普通点/轻量点/海量点分层思路；
- 加载、错误和进度反馈。

## 4. 功能能力表

| 功能 | 来源项目 | 建议新项目 | 说明 |
| --- | --- | --- | --- |
| 坐标转换 | map-tools | P0 | 算法和上海2000需重新验证 |
| 地图展示 | 两者 | P0 | 三个独立 Adapter |
| 点位展示 | 两者 | P0 | Marker、信息窗、fit view |
| 点位管理 | 均不足 | P0 | 新建 Point Manager + IndexedDB |
| Excel导入 | map-tools | P0 | 增加工作表选择和严格映射 |
| CSV导入 | map-tools | P0 | 使用成熟解析器 |
| JSON导入 | map-tools | P0 | V1仅对象数组 |
| JSON粘贴 | 均无 | P0 | 新建 |
| 图层切换 | 两者 | P1 | 只做有限底图 |
| 大量点 | 两者 | P1 | 性能测试驱动策略 |
| 聚合 | 两者 | P1 | 按平台能力 |
| 导出 | map-tools | P1 | 后续可加入 |
| 绘制 | 两者 | P2 | 非V1核心 |
| 测量 | 两者 | P2 | 非V1核心 |
| 地址解析 | map-tools | P2 | 受配额影响 |
| GeoJSON | map-tools部分 | 非V1 | 明确排除 |
| 热力图 | gisviewer-react | 不建议V1 | 偏GIS分析 |
| 轨迹/3D | gisviewer-react | 不建议 | 偏离定位 |
| 天气 | map-tools | 不建议 | 与核心无关 |

## 5. 新地图架构建议

```text
MapCore
├── MapProviderRegistry
├── MapSdkLoader
├── MapCapability
├── AMapAdapter
├── BMapAdapter
└── TiandituAdapter
```

基础契约只包含：

- initialize；
- setPoints；
- clearPoints；
- fitToPoints；
- setBaseLayer；
- on event；
- destroy。

绘制、测量等作为可选 Capability，页面只显示当前平台真实支持的能力。

设计原则：

- 页面只创建当前 Adapter；
- 坐标转换在进入 Adapter 前完成；
- Adapter 只接收目标平台坐标；
- Loader 与地图实例分离；
- destroy 幂等；
- 事件订阅有 unsubscribe；
- 无 Key 时不加载 SDK；
- 不使用空函数冒充能力。

## 6. 推荐数据模型

```ts
type CoordinateSystem = 'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000';

interface Coordinate {
  system: CoordinateSystem;
  x: number;
  y: number;
  generatedAt?: string;
  algorithmVersion?: string;
}

interface Source {
  type: 'manual' | 'excel' | 'csv' | 'json-file' | 'json-paste';
  importId?: string;
}

interface Point {
  id: string;
  name: string;
  source: Source;
  coordinates: {
    original: Coordinate;
    converted: Partial<Record<CoordinateSystem, Coordinate>>;
  };
}
```

转换失败使用判别联合，不提供伪坐标；地图 View Model 只含 id、name、x、y。

## 7. 技术风险与建议

### 地图生命周期

**问题：** 重复实例、异步加载回写已卸载页面。  
**建议：** 单 Provider、状态机、Abort/generation token、幂等 destroy、统一 disposer。

### 大量点性能

**问题：** 每点对象和事件、重复渲染策略。  
**建议：** 普通点/聚合/海量点三档，同一时刻一种策略，以 1k/10k/50k 实测确定阈值。

### 坐标精度

**问题：** 算法版本、CGCS2000近似、SH2000参数来源和多段误差。  
**建议：** 权威 fixture、误差阈值、算法版本、缓存失效、上海2000独立验收。

### API限制

**问题：** Key、域名白名单、配额、服务条款。  
**建议：** 用户本地配置，无 Key 不加载；外部服务做超时、取消和限流。

### 文件处理

**问题：** 大文件、错误 CSV、内存峰值。  
**建议：** 成熟解析器、大小限制、Worker、采样预览、只保留 Point 必需字段。

### 内存释放

**问题：** Layer、Marker、React Root、timer、callback 泄漏。  
**建议：** ResourceBag 统一清理，反复进出地图页做 heap 检查。

### 浏览器兼容

**问题：** SDK、IndexedDB、Blob下载和混合内容差异。  
**建议：** V1明确 Chrome/Edge；全部 HTTPS；存储失败有提示。

### 安全

**问题：** 参考配置包含硬编码凭据，InfoWindow可能注入。  
**建议：** 参考凭据视为暴露；不提交真实 Key；导入文本严格转义。

## 8. PeachTools 建议

### 产品定位

浏览器里的专业点位坐标转换与地图验证工具，不是 GIS 平台或企业后台。

### 页面结构

```text
首页
Point Manager
├── 新增
├── 文件/JSON导入
├── 搜索/选择
├── 转换
└── 地图查看
地图验证
├── 高德
├── 百度
└── 天地图
```

### 技术结构

```text
Presentation → Application → Domain → Infrastructure
```

- 页面不直接操作 IndexedDB；
- 页面不直接调用 SDK；
- Adapter 不做坐标转换；
- 文件解析器不写数据库；
- Domain 不依赖 React。

### Design System

- Professional、Minimal、Consistency、Developer First；
- 深色主题参考 `#071018`、`#0B1621`、`#10202D`；
- 浅色主题参考 `#F5F9FC`、`#FFFFFF`、`#F8FBFD`；
- 使用语义 Token，不在页面散落色值；
- 首页产品化，工作台可扫描，地图页保持左侧栏+右地图；
- 坐标状态必须有文字，不只依赖颜色。

## 9. 可以参考 / 不建议采用 / 需要重设

### 可以参考

- gisviewer-react 的地图分层、配置驱动、Widgets、销毁意识；
- map-tools 的导入—转换—验证流程、三地图路由、转换路径和反馈状态。

### 不建议采用

- gisviewer-react 的整体依赖、巨型 Facade、any、硬编码配置和高级 GIS 能力；
- map-tools 的三 Hook 同时实例化、空能力、手写 CSV、0 坐标降级、rawData、自动坐标推测和现有批量渲染。

### 需要重新设计

- MapCore + Adapter + Capability；
- Point/Coordinate/Source；
- 转换服务和权威测试；
- 分步导入；
- IndexedDB；
- 大量点渲染策略；
- API Key 本地设置；
- 首页、Point Manager、三地图的信息架构。

## 10. 扫描文件

### gisviewer-react

扫描了根配置、入口、路由、`MapContainer`、三个 MapApp、Utils、common、types、components/configs、API说明，以及 widgets 下的 Cluster、CustomLayer、Draw、ECharts、FindFeature、GeometrySearch、HeatMap、Measurement、Overlays、Three、Tool、Track、WidgetsManager。

### map-tools

扫描了根配置、README、自带 PRD/TASKS/Design、App、router、两个页面、全部 components、五个 hooks、types、file/mapLoader/mapUtils/coordParams/pointValidate/geocode/weather 工具及测试。

构建产物和二进制素材只做目录识别，没有作为独立设计证据。

