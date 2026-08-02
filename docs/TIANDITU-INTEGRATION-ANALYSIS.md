# Coordinate Toolkit V1 天地图接入前分析

> 文档状态：接入前方案确认  
> 分析日期：2026-07-29  
> 范围：天地图 JavaScript API、坐标契约、V1 模块边界和风险  
> 限制：本文不实现地图、不修改源码、不引入依赖

## 0. 结论摘要

V1 建议采用以下最小接入方案：

- 使用天地图 JavaScript API 4.0；
- 使用浏览器端 Token，通过 `tk` 查询参数加载 SDK；
- SDK 入口为 `window.T`，使用 `T.Map`、`T.LngLat`、`T.Marker` 和 `T.InfoWindow`；
- 页面只展示明确可用的 WGS84 经纬度；
- WGS84 原始坐标可以直接作为 V1 Marker 输入；
- GCJ02、BD09 不得直接用于天地图，必须先取得 WGS84 转换结果；
- CGCS2000 与 WGS84 不在代码中静默视为相同坐标系；
- CGCS2000 暂不作为 V1 用户入口，待官方契约、真实样本和精度要求确认后再决定是否启用；
- 保持简单调用链：`TiandituPage → TiandituMapService → PointService → TiandituMap`；
- 不建设 `MapAdapter`、`ProviderRegistry`、Capability 或通用 GIS 框架。

推荐的 V1 展示坐标契约为：

> 天地图页面接收 WGS84 geographic coordinate（经度、纬度、角度）。这是 V1 的显式产品契约，不代表 WGS84 与 CGCS2000 在测地学上等价。

该方案能直接复用当前已经基线化的 WGS84/GCJ02/BD09 转换能力，同时避免迁移旧项目中未经验证的 `CGCS2000 ≈ WGS84` 隐式近似。

---

## 1. 分析依据

### 1.1 旧项目代码

重点检查：

- `reference/map-tools/src/hooks/useTianditu.ts`
- `reference/map-tools/src/hooks/useCoordTransform.ts`
- `reference/map-tools/src/utils/mapLoader.ts`
- `reference/map-tools/src/utils/mapUtils.ts`
- `reference/map-tools/src/pages/MapVisual.tsx`
- `reference/map-tools/src/types/map.ts`
- `reference/map-tools/docs/PRD.md`
- `reference/map-tools/README.md`

### 1.2 当前项目文档

重点检查：

- `docs/REFERENCE-ANALYSIS.md`
- `docs/Coordinate-Toolkit-PRD-V2.md`
- `docs/Coordinate-Toolkit-TASKS-V2.md`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT-STRUCTURE.md`
- `docs/OPEN-QUESTIONS.md`
- `docs/V1-DEVELOPMENT-ROADMAP.md`
- `docs/decisions/ADR-002-coordinate-system.md`

### 1.3 官方资料

本次复核的官方入口：

- 天地图 JavaScript API 4.0 加载地址：<https://api.tianditu.gov.cn/api?v=4.0&tk=TOKEN>
- 天地图开发资源入口：<https://lbs.tianditu.gov.cn/>
- 天地图控制台：<https://console.tianditu.gov.cn/>
- 天地图国家平台：<https://www.tianditu.gov.cn/>

截至分析日期，官方开发文档页面在自动抓取环境中存在超时，因此 API 类名和调用方式同时使用旧项目实际代码进行交叉确认。接入开发时仍需使用有效测试 Token，在浏览器中完成一次官方 SDK 真实加载验证。

---

## 2. SDK 信息

### 2.1 JavaScript API 版本

旧项目明确使用天地图 JavaScript API 4.0：

```text
https://api.tianditu.gov.cn/api?v=4.0&tk={token}
```

`reference/map-tools/src/utils/mapLoader.ts` 通过动态 `<script>` 加载该地址，并在加载后检查：

```text
window.T
window.T.Map
```

V1 建议继续使用 4.0，不在本阶段升级、包装第三方类型库或切换到其他地图渲染方案。正式实现前应使用控制台创建的有效 Token 再确认该 URL 和 API 版本仍可用。

### 2.2 Token 方式

天地图使用 Token，加载 SDK 时通过 `tk` 参数传入。

V1 建议：

- 配置名称统一显示为“天地图 Token”；
- 使用独立 localStorage 键，例如 `coordinate-toolkit.tianditu-token`；
- 无 Token 时不创建 `<script>`，页面显示配置提示；
- Token 只保存在当前浏览器，不进入 IndexedDB points；
- Token 不写入日志、InfoWindow、错误上报或导出文件；
- 变更 Token 时销毁旧地图状态，再重新加载；
- 上线前在天地图控制台核对应用类型、允许域名、调用配额和 Token 状态。

旧项目从 `VITE_TIANDITU_KEY` 读取 Token，适合固定部署配置，但不符合当前工具允许用户在浏览器配置凭据的产品方式，因此只参考加载逻辑，不迁移配置方式。

### 2.3 SDK初始化

旧项目初始化过程：

```text
加载 API 4.0 脚本
→ 等待 window.T.Map 可用
→ new T.Map(container)
→ new T.LngLat(lng, lat)
→ map.centerAndZoom(center, zoom)
→ map.enableScrollWheelZoom()
→ map.enableDoubleClickZoom()
```

V1 建议的最小初始化能力：

1. 校验 Token 非空；
2. 复用同一 Token 对应的加载 Promise，避免重复插入脚本；
3. 脚本加载后验证 `window.T`、`T.Map`、`T.LngLat`、`T.Marker`；
4. 创建地图并设置默认中心和缩放级别；
5. 开启滚轮缩放；
6. 返回明确的加载成功或失败结果。

旧项目在 `script.onload` 后分别等待 500 ms 和 1,000 ms 检查 `T.Map`。这说明天地图脚本的 `load` 事件不一定等于 API 已完成初始化。新实现可以保留“加载后能力检查”的行为，但应使用：

- 有上限的轮询或超时；
- 单一 pending Promise；
- 明确的超时错误；
- Token 变化和页面卸载时的过期请求隔离。

不要无期限 `setTimeout`，也不要让多个页面同时创建多个 SDK 脚本。

### 2.4 Marker创建

旧项目使用：

```text
const position = new T.LngLat(lng, lat)
const marker = new T.Marker(position)
map.addOverLay(marker)
```

清理使用：

```text
map.removeOverLay(marker)
```

注意天地图 API 的旧项目调用名为 `addOverLay` / `removeOverLay`，其中 `Lay` 的大小写与常见的 `Overlay` 拼写不同。实现时应以 API 4.0 运行结果为准，不自行“修正”方法名。

V1 Marker 数据建议只包含：

- Point id；
- 点位名称；
- WGS84 Marker 经度、纬度；
- 原始坐标文本；
- 展示坐标系 `WGS84`。

页面不能直接创建 `T.Marker`。

### 2.5 InfoWindow

旧项目方式：

```text
marker.addEventListener('click', handler)
new T.InfoWindow({ content })
map.openInfoWindow(infoWindow, position)
```

V1 InfoWindow 展示：

- 点位名称；
- 原始坐标及原始坐标系；
- 展示坐标系 WGS84；
- 当前 Marker 经度、纬度。

InfoWindow HTML 必须通过安全 DOM 文本节点或统一转义生成，不能把用户输入的点位名称直接拼接到 HTML。

---

## 3. 坐标体系分析

## 3.1 必须区分的两个问题

天地图底图采用什么大地坐标基准，与 JavaScript API 接收怎样的经纬度参数，是两个相关但不完全相同的问题。

旧项目配置把天地图目标定义为 `CGCS2000`，但转换实现又把：

```text
CGCS2000 → gcoord.WGS84
```

映射为同一个库枚举，实际上没有执行经过验证的基准转换。因此旧代码证明了“页面曾按普通经纬度撒点”，不能证明 WGS84 与 CGCS2000 完全等价，也不能证明其精度满足设备点位验证要求。

当前 ADR 已明确：

- CGCS2000 与 WGS84 是不同坐标基准体系；
- 不注册未经验证的等价转换；
- 天地图模块不得自行决定二者的转换关系；
- CGCS2000 默认不向普通用户开放。

### 3.2 各坐标系处理结论

| 坐标系 | V1是否可直接作为Marker输入 | 处理结论 |
|-|-|-|
| WGS84 | 是，有条件 | 作为V1显式展示契约；使用真实样本完成底图落点验证，不改名为CGCS2000 |
| CGCS2000 | 暂不开放 | 理论上与天地图国家底图基准关系最直接，但当前产品没有已验证的输入、转换和精度链，不能静默使用 |
| GCJ02 | 否 | 存在互联网地图加密偏移，必须先取得WGS84转换结果 |
| BD09 | 否 | 含百度坐标偏移，必须先取得WGS84转换结果 |
| 上海2000 | 否 | 是投影坐标，必须经过已验证的投影转换；当前不属于天地图V1接入范围 |

### 3.3 WGS84

V1 推荐直接读取：

```text
Point.coordinates.original
```

当 original 本身是 WGS84 geographic coordinate 时直接展示；否则读取：

```text
Point.coordinates.converted.WGS84.coordinate
```

必须同时满足：

- `kind === 'geographic'`；
- `system === 'WGS84'`；
- 经度、纬度是有限数值；
- 经度和纬度范围合法。

这里的“直接使用”是产品接入决策，不是声明 WGS84 和 CGCS2000 测地学等价。WGS84 与 CGCS2000 的实际差异与基准实现、历元、数据采集方式和精度要求有关，V1 不承诺零偏差。

### 3.4 CGCS2000

CGCS2000 更符合天地图国家基础地理数据的基准语义，但当前存在以下缺口：

- CGCS2000 默认不在用户入口；
- 现有 `CoordinateService` 不支持 CGCS2000；
- 没有权威转换样本；
- 没有 WGS84/CGCS2000 关系的算法版本；
- 没有设备点位业务精度标准；
- 旧项目只是把 CGCS2000 映射到 `gcoord.WGS84`，不是有效验证。

因此 V1 天地图页面不得：

- 把 WGS84 对象的 `system` 改成 CGCS2000；
- 创建隐式 `CGCS2000 ≈ WGS84` 转换结果；
- 在 Point 的 converted 缓存中伪造 CGCS2000；
- 为接入地图而提前开放 CGCS2000 用户选项。

后续如要正式支持，至少需要：

1. 官方或权威坐标契约；
2. 数据来源和历元说明；
3. WGS84、CGCS2000对照样本；
4. 可接受误差；
5. 算法或“不转换直接展示”的明确版本化决策；
6. 独立测试和产品提示。

### 3.5 GCJ02

GCJ02 不能直接用于天地图。否则点位相对天地图底图会产生明显偏移。

处理规则：

```text
original.GCJ02
→ Point Manager / CoordinateService
→ converted.WGS84
→ 天地图Marker
```

天地图页面不负责临时转换；如果没有 WGS84 缓存，应提示“请先转换为 WGS84”。

### 3.6 BD09

BD09 不能直接用于天地图。

处理规则：

```text
original.BD09
→ Point Manager / CoordinateService
→ converted.WGS84
→ 天地图Marker
```

当前 CoordinateService 已有 BD09 → GCJ02 → WGS84 的基线能力，可供 PointService 生成 WGS84 converted 缓存。地图页面仍然只读取结果，不直接调用转换算法。

### 3.7 V1坐标验收样本

实现前应准备至少以下样本：

|样本|目的|
|-|-|
|上海人民广场或其他可明确识别点的WGS84坐标|验证WGS84 Marker与天地图底图的视觉落点|
|同一点的GCJ02坐标|验证GCJ02直接展示会偏移，转换为WGS84后恢复|
|同一点的BD09坐标|验证BD09直接展示会偏移，转换为WGS84后恢复|
|至少一个项目真实设备点|验证真实业务数据精度，而不只验证地标|

每个样本记录：

- 坐标来源；
- 原始坐标系；
- 转换算法版本；
- Marker截图或观测结果；
- 允许误差；
- 测试日期和底图版本。

---

## 4. 与现有架构的关系

### 4.1 推荐调用链

```text
TiandituPage
↓
TiandituMapService
↓
PointService
↓
读取 Point original.WGS84 或 converted.WGS84
↓
TiandituMap
↓
T.Marker / T.InfoWindow
```

职责划分：

### TiandituPage

- Token 配置入口；
- 无 Token、加载中、加载失败和就绪状态；
- 打开点位选择弹窗；
- 单选、全选、移除；
- 展示缺少 WGS84 的提示；
- 不直接访问 `window.T`；
- 不调用 CoordinateService。

### TiandituMapService

- 通过 PointService 获取 Point；
- 只选择 original.WGS84 或 converted.WGS84；
- 把 Point 转为 `TiandituMarkerData`；
- 分离可展示点位和缺少 WGS84 的点位；
- 调用 TiandituMap；
- 返回简单 Result。

服务无需依赖 Repository，因为 PointService 已经提供稳定的数据入口。

### TiandituLoader

- Token 校验；
- 动态加载 API 4.0；
- SDK 能力检查；
- 复用 pending Promise；
- 处理网络、Token、域名限制和超时错误；
- 防止脚本重复加载。

### TiandituMap

- 创建 `T.Map`；
- 创建、替换和清理 Marker；
- 创建 InfoWindow；
- 根据 Marker 调整视野；
- 页面离开时清除 Overlay、事件引用和容器；
- 不访问 PointRepository 和 CoordinateService。

### 4.2 建议目录

```text
src/
├── adapters/maps/tianditu/
│   ├── tianditu-loader.ts
│   └── tianditu-map.ts
├── features/map-validation/
│   └── tianditu-map-service.ts
└── pages/maps/
    └── TiandituPage.tsx
```

这是平台专用的最小封装，与当前高德、百度实现保持同一粒度，但不抽取三平台公共框架。

### 4.3 不采用的设计

V1 不设计：

- MapAdapter；
- ProviderRegistry；
- Capability系统；
- 通用Geometry模型；
- 通用Layer系统；
- 插件系统；
- Marker聚合；
- 海量点渲染；
- 绘制和测量；
- 天地图页面内坐标转换；
- CGCS2000动态算法注册。

三个页面可以保留有限重复。当前阶段比抽象复用更重要的是让坐标契约清晰且可验证。

---

## 5. 建议的第一版功能范围

### 5.1 实现

- `/map/tianditu` 独立页面；
- Token 配置和 localStorage 保存；
- 无 Token 不加载 SDK；
- 点位列表读取；
- 点位单选、全选；
- WGS84 Marker；
- Marker InfoWindow；
- 缺少 WGS84 时提示先转换；
- SDK 加载失败提示；
- 页面离开时清理 Marker 和地图引用。

### 5.2 不实现

- CGCS2000用户入口；
- WGS84/CGCS2000隐式转换；
- 上海2000投影转换；
- 底图切换；
- 地理编码；
- 绘制、测量；
- Marker聚合；
- 大量点优化；
- 自动转换缺失坐标；
- 通用地图架构。

底图切换虽然旧项目实现了矢量、影像、地形 TileLayer，但其中使用了 HTTP WMTS URL。在 HTTPS 应用中可能被浏览器作为混合内容阻断，因此不建议纳入首个验证闭环。

---

## 6. 风险分析

## 6.1 坐标偏移风险

**问题**

旧项目把天地图目标写为 CGCS2000，却在算法中直接复用 WGS84 枚举。

**原因**

- WGS84 与 CGCS2000 被简化为近似关系；
- 没有真实业务样本；
- 没有精度标准；
- GCJ02/BD09若误用会产生明显偏移；
- 地图底图、数据采集来源和坐标标签可能不一致。

**V1措施**

- 页面契约明确写 WGS84；
- 只读取 system 明确为 WGS84 的 geographic coordinate；
- GCJ02/BD09缺少WGS84缓存时拒绝展示；
- 不生成伪CGCS2000结果；
- 接入前后使用固定样本和真实设备点进行视觉验证；
- InfoWindow始终显示展示坐标系。

**残余风险**

视觉落点正确不能替代测量级精度验证。若业务要求亚米级或更高精度，必须单独完成 WGS84/CGCS2000 基准、历元及转换验证。

## 6.2 Token配置风险

**问题**

Token错误、过期、配额受限或域名限制时，SDK和瓦片可能无法加载。

**原因**

- 浏览器应用的 Token 会随请求暴露，这是前端地图服务的正常形态；
- 控制台可能配置域名白名单；
- 本地开发地址与生产域名不同；
- SDK脚本加载成功不代表瓦片鉴权成功。

**V1措施**

- 无 Token 不发起请求；
- Token 独立存储，不进入 Point 数据；
- 加载失败返回明确提示；
- 区分 SDK脚本失败、API未初始化和地图资源失败；
- 使用本地开发域名与生产域名分别验证；
- 不在错误消息中回显完整 Token。

## 6.3 SDK生命周期风险

**问题**

重复进入页面或修改 Token 可能产生重复脚本、残留 Marker、事件监听和异步回调竞态。

**旧项目表现**

- loader 缓存 Promise；
- `script.onload` 后延时检查 `window.T`；
- destroy 清除 Overlay 和 Layer；
- 没有明确调用地图实例 dispose；
- `unloadMap` 按脚本 id 删除，但加载脚本没有设置对应 id，存在边界不一致。

**V1措施**

- 给脚本稳定 id；
- 同一 Token 复用加载 Promise；
- Token变化时隔离旧异步结果；
- Marker替换前逐个移除；
- destroy清空Overlay、事件引用和容器；
- 将地图、Marker数组置空；
- 对SDK不存在公开destroy能力的情况，不伪造API调用；
- React effect清理时调用 TiandituMapService.destroy。

## 6.4 API就绪时序风险

**问题**

脚本 `load` 事件触发时，`window.T.Map` 可能尚未就绪。

**V1措施**

- 加载完成后检查必需构造器；
- 使用短周期、有总超时的就绪检测；
- 超时后允许用户重试；
- 测试SDK加载失败和初始化超时；
- 不使用无限递归定时器。

## 6.5 HTTPS混合内容风险

**问题**

旧项目自定义 TileLayer 使用 `http://t{s}.tianditu.gov.cn/...`。

**影响**

部署在 HTTPS 的 Coordinate Toolkit 可能阻断 HTTP 瓦片请求。

**V1措施**

- 首版使用 API 默认底图，不迁移旧 TileLayer URL；
- 后续底图切换只使用官方确认的 HTTPS 服务地址；
- 不复制旧项目的 HTTP WMTS 配置。

## 6.6 API名称和类型风险

**问题**

天地图使用 `addOverLay`、`removeOverLay` 等特定命名，当前项目没有官方 TypeScript 类型。

**V1措施**

- 只声明本阶段实际使用的最小 SDK 类型；
- 通过真实 API 4.0 运行验证方法名；
- 不安装大型或过期类型包；
- 不使用 `any` 扩散到 Page 和 Service。

---

## 7. 测试与验收建议

### 7.1 Service测试

至少覆盖：

1. original 为 WGS84 时生成 Marker；
2. converted.WGS84存在时生成 Marker；
3. original 为GCJ02且没有converted.WGS84时拒绝展示；
4. original 为BD09且没有converted.WGS84时拒绝展示；
5. projected coordinate不能作为Marker；
6. Marker数据保留名称、原始坐标和展示坐标系；
7. SDK加载失败返回明确Result；
8. 地图未初始化时不能设置Marker。

### 7.2 Loader测试

至少覆盖：

- 空Token失败；
- 无Token页面不插入SDK脚本；
- SDK全局对象缺失；
- 网络加载失败；
- 初始化超时；
- 相同Token不重复加载；
- 页面卸载或Token变化后旧回调不更新新页面。

### 7.3 Map封装测试

至少覆盖：

- `T.LngLat`参数顺序为经度、纬度；
- Marker创建和加入地图；
- Marker点击打开InfoWindow；
- 重设点位前移除旧Marker；
- destroy移除Marker并清理容器。

### 7.4 页面验收

- 无Token显示配置提示且不加载SDK；
- Token保存在localStorage；
- 能选择一个或全部点位；
- WGS84点位可展示；
- 缺少WGS84时提示先转换；
- InfoWindow展示正确坐标；
- 重新进入页面不重复叠加Marker；
- 刷新后仍能读取Token和IndexedDB Point；
- 高德、百度页面行为不受影响。

---

## 8. 推荐实施顺序

```text
Step 1  获取测试Token并验证API 4.0最小示例
↓
Step 2  用固定样本确认WGS84 Marker契约
↓
Step 3  实现 TiandituLoader
↓
Step 4  实现 TiandituMap
↓
Step 5  实现 TiandituMapService
↓
Step 6  接入 TiandituPage
↓
Step 7  完成单元测试和三坐标样本验证
```

在 Step 2 未完成前，可以编写模块接口和测试替身，但不应宣称坐标精度已经验证。

---

## 9. 最终决策

### 已确认

- SDK候选版本：JavaScript API 4.0；
- 鉴权方式：浏览器端 Token，`tk`参数；
- SDK全局对象：`window.T`；
- 初始化：`new T.Map(container)`；
- 经纬度对象：`new T.LngLat(lng, lat)`；
- Marker：`new T.Marker(position)` + `map.addOverLay(marker)`；
- V1架构：平台专用 Page、Service、Map封装；
- V1坐标输入：明确标记的WGS84 geographic coordinate；
- GCJ02、BD09不得直接展示；
- CGCS2000暂不开放，也不与WGS84静默等同。

### 开发开始前仍需确认

1. 有效测试Token；
2. 当前控制台的域名限制和配额；
3. API 4.0在目标浏览器中的实际加载；
4. `T.InfoWindow`构造参数的当前有效形式；
5. `setViewport`或等效视野适配API；
6. 至少一个固定地标和一个真实设备点的WGS84落点；
7. 项目可接受的视觉验证误差。

### Go / No-Go

结论为：

> 可以进入“天地图最小验证闭环”开发，但必须把 WGS84 作为显式 V1 展示契约，并把有效 Token + 真实样本验证作为上线验收条件。当前不应实现或开放 CGCS2000。

