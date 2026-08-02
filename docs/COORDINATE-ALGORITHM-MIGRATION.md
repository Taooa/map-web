# Coordinate Toolkit V1 坐标算法迁移分析

> 阶段：V1 Phase 2-A 前置分析  
> 分析对象：`reference/map-tools`  
> 结论用途：指导后续 `CoordinateService` 实现  
> 边界：本文只分析能力与迁移方式，不复制旧代码，不修改参考项目

## 1. 结论摘要

`map-tools` 已具备 WGS84、GCJ02、BD09、上海 2000 之间的转换入口，但成熟度并不一致：

- WGS84、GCJ02、BD09 的实际计算委托给 `gcoord`，转换链路清晰，可作为 V1 第一批迁移能力。
- 上海 2000 使用 `proj4` 和一组项目内定义的投影参数，已有转换基础，但缺少参数来源、权威样本和精度测试，不能直接作为正式能力启用。
- CGCS2000 在旧实现中既是上海 2000 的地理坐标中间层，又被近似映射成 WGS84；这一近似没有测试或精度说明，不应直接继承为产品承诺。
- 旧实现把转换路径、React Hook、地图目标坐标和错误处理放在同一模块中。V1 应继承已验证的转换行为，不继承这套耦合结构。
- 旧项目没有坐标算法数值单元测试。现有测试只验证坐标选项、地图坐标映射和静态转换路径，不能作为精度迁移基线。

因此，V1 推荐先实现一个纯 TypeScript、显式分支的 `CoordinateService`，只开放 WGS84、GCJ02、BD09；上海 2000 保留类型和 UI 状态，完成专项验证后再启用。

## 2. 旧项目已有坐标转换能力

### 2.1 能力总览

| 能力 | 旧实现 | 主要依赖 | 当前状态 | V1 结论 |
|---|---|---|---|---|
| WGS84 ↔ GCJ02 | `gcoord.transform` | `gcoord` | 已有调用能力 | 可迁移行为，需建立数值基线 |
| GCJ02 ↔ BD09 | `gcoord.transform` | `gcoord` | 已有调用能力 | 可迁移行为，需建立数值基线 |
| WGS84 ↔ BD09 | 经 GCJ02 组合转换 | `gcoord` | 已有调用能力 | 保留显式组合，不迁移路径图 |
| 上海 2000 ↔ CGCS2000 | `proj4` 正反投影 | `proj4` | 有实现基础 | 暂不正式启用，先验证参数和精度 |
| 上海 2000 ↔ WGS84/GCJ02/BD09 | 经 CGCS2000/WGS84 组合 | `proj4`、`gcoord` | 有调用链 | 受上海 2000 与 CGCS2000 假设影响，暂缓 |
| CGCS2000 ↔ 其他地理坐标 | 将 CGCS2000 近似映射为 WGS84 | `gcoord` | 有实现但无精度证明 | 不作为 V1 用户入口 |
| 地图目标坐标转换 | 高德→GCJ02，百度→BD09，天地图→CGCS2000 | 上述转换能力 | 地图 Hook 直接调用 | 映射规则可参考，调用边界需重做 |

### 2.2 实现文件

| 文件 | 作用 |
|---|---|
| `reference/map-tools/src/hooks/useCoordTransform.ts` | 坐标转换主实现；注册投影、调用依赖库、执行路径、批量转换及地图目标转换 |
| `reference/map-tools/src/utils/coordParams.ts` | 坐标选项、名称、上海 2000/CGCS2000 参数、地图坐标映射和静态转换路径 |
| `reference/map-tools/src/utils/pointValidate.ts` | 数值解析、经纬度及上海 2000 范围校验、坐标系自动识别 |
| `reference/map-tools/src/types/index.ts` | `CoordinateType`、旧 `Point`、`TransformResult` 等类型 |
| `reference/map-tools/src/pages/CoordConvert.tsx` | 单点、全坐标系和文件点位转换的页面调用方 |
| `reference/map-tools/src/hooks/useAmap.ts` | Marker 添加前转换为 GCJ02 |
| `reference/map-tools/src/hooks/useBmap.ts` | Marker 添加前转换为 BD09 |
| `reference/map-tools/src/hooks/useTianditu.ts` | Marker 添加前转换为 CGCS2000 |
| `reference/map-tools/src/pages/MapVisual.tsx` | 地图展示及旧坐标识别流程中的转换调用 |

## 3. 各算法实现分析

### 3.1 WGS84 与 GCJ02

**来源文件**

- 主实现：`reference/map-tools/src/hooks/useCoordTransform.ts`
- 转换路径：`reference/map-tools/src/utils/coordParams.ts`
- 输入校验：`reference/map-tools/src/utils/pointValidate.ts`

**依赖库**

- `gcoord`
- `reference/map-tools/package.json` 声明版本为 `^0.3.2`

**输入输出格式**

- 旧输入：`lng: number`、`lat: number`、`source: CoordinateType`、`target: CoordinateType`
- 传给 `gcoord`：`[lng, lat]`
- 旧输出：`TransformResult`，形如 `{ lng, lat, coord, error? }`

**当前调用方式**

页面或地图 Hook 先调用 `useCoordTransform()`，再调用 `transformSingle` 或 `transformToMapCoord`。`transformSingle` 根据静态路径调用内部 `directTransform`，最终委托 `gcoord.transform`。

**迁移判断**

转换依赖和行为可以保留，但 React Hook、旧类型和静态路径机制需要适配。迁移前必须用固定样本锁定旧版本的实际输出，避免依赖升级造成无感知变化。

### 3.2 GCJ02 与 BD09

**来源文件**

- 主实现：`reference/map-tools/src/hooks/useCoordTransform.ts`
- 转换路径：`reference/map-tools/src/utils/coordParams.ts`

**依赖库**

- `gcoord`

**输入输出格式**

与 WGS84/GCJ02 相同，均使用经纬度数组 `[lng, lat]`，并包装为旧 `TransformResult`。

**当前调用方式**

`transformSingle` 根据源和目标坐标系选择路径，`directTransform` 调用 `gcoord.transform`。百度地图 Hook 通过 `transformToMapCoord` 将点位转换为 BD09。

**迁移判断**

可保留转换行为，改由纯 TypeScript 服务调用。不要把百度地图 SDK 或 React 生命周期带入坐标服务。

### 3.3 WGS84 与 BD09

**来源文件**

- `reference/map-tools/src/utils/coordParams.ts`
- `reference/map-tools/src/hooks/useCoordTransform.ts`

**依赖库**

- `gcoord`

**输入输出格式**

输入和输出仍为经纬度；旧实现不暴露中间结果。

**当前调用方式**

旧项目显式使用以下组合：

```text
WGS84 → GCJ02 → BD09
BD09 → GCJ02 → WGS84
```

`transformSingle` 读取 `TRANSFORM_PATHS` 后逐步执行。

**迁移判断**

V1 可保留这两条明确的组合规则，但不应迁移完整的 `TRANSFORM_PATHS` 矩阵，也不需要重建 `TransformationGraph`。组合过程可以由 `CoordinateService` 内部两个私有转换步骤完成。

### 3.4 上海 2000

**来源文件**

- 投影注册及正反转换：`reference/map-tools/src/hooks/useCoordTransform.ts`
- 参数对象与路径：`reference/map-tools/src/utils/coordParams.ts`
- 范围校验：`reference/map-tools/src/utils/pointValidate.ts`

**依赖库**

- `proj4`
- `reference/map-tools/package.json` 声明版本为 `^2.11.0`

**投影参数现状**

旧实现使用横轴墨卡托投影和 GRS80 椭球，主要参数包括：

- 中央经线：`121.46444444444445`
- 比例因子：`1`
- 假东：`350000`
- 假北：`310000`
- 单位：米

同一套概念在 `useCoordTransform.ts` 的 WKT 和 `coordParams.ts` 的参数对象中分别定义，存在两处配置漂移的风险。WKT 中使用 `D_unknown`，没有给出可追溯的 EPSG 标识或参数来源。

**输入输出格式**

- 上海 2000 → CGCS2000：输入 `[x, y]`，输出 `{ lng, lat }`
- CGCS2000 → 上海 2000：输入 `[lng, lat]`，输出 `{ x, y }`
- 但进入通用 `transformSingle` 后，上海 2000 的 `x/y` 仍被放入 `lng/lat` 参数和 `TransformResult.lng/lat` 字段，投影坐标与地理坐标没有类型隔离。

**当前调用方式**

上海 2000 先通过 `proj4` 转为 CGCS2000；如果目标不是 CGCS2000，再把 CGCS2000 当作 WGS84 交给 `gcoord`。反向转换按相反顺序执行。

```text
上海2000 → CGCS2000 ≈ WGS84 → GCJ02/BD09
GCJ02/BD09 → WGS84 ≈ CGCS2000 → 上海2000
```

**迁移判断**

不能直接启用。旧实现证明了“有转换基础”，但没有证明投影定义适用于新项目的上海 2000 数据。启用前必须确认：

1. 参数的业务来源和适用区域；
2. EPSG 或可审计的投影定义；
3. X/Y 轴顺序及单位；
4. 假东、假北和中央经线；
5. 权威双向测试样本；
6. 可接受的米级误差标准；
7. CGCS2000 与 WGS84 近似处理是否满足业务精度。

另外，旧校验将上海 2000 限定为 `X = 250000~450000`、`Y = 200000~420000`。该范围没有来源说明，不能作为新项目规则直接迁移。

### 3.5 CGCS2000 中间层

CGCS2000 虽不是本次 V1 的正式用户入口，但它影响上海 2000 链路：

- 旧项目为 CGCS2000 注册了 GRS80 地理坐标定义；
- 在 `GCOORD_TYPE_MAP` 中却把 CGCS2000 映射到 `gcoord.WGS84`；
- 天地图目标坐标也被固定为 CGCS2000。

这是一项工程近似，不等同于经过业务精度确认的坐标基准转换。V1 应继续保持 CGCS2000 为实验或禁用状态，天地图接入前单独确认其坐标输入契约。

## 4. 当前调用链与耦合

### 4.1 页面转换

```text
CoordConvert 页面
  → useCoordTransform()
  → transformSingle / transformAll
  → validateCoordinate
  → TRANSFORM_PATHS
  → directTransform
  → gcoord / proj4
```

### 4.2 地图转换

```text
useAmap / useBmap / useTianditu
  → useCoordTransform()
  → transformToMapCoord
  → transformSingle
  → Marker
```

旧结构的主要问题是：

- 算法入口依赖 React Hook，无法作为独立领域服务使用；
- 地图平台与坐标转换规则耦合；
- `transformSingle` 同时负责校验、路径规划、执行和错误降级；
- 上海 2000 的投影坐标被伪装成 `lng/lat`；
- 失败时返回 `(0, 0)` 并附带错误，调用方容易误把失败结果当成有效坐标；
- `transformBatch` 只是同步分片循环，没有异步让出、并行或 Web Worker 能力。

## 5. 迁移分类

本文中的“直接迁移”指保留已经存在的能力与行为，并用新项目接口重新封装；不表示复制旧文件。

### 5.1 可直接迁移的能力

| 能力 | 迁移方式 | 前置条件 |
|---|---|---|
| WGS84 ↔ GCJ02 | 保留 `gcoord` 方案，封装为纯服务 | 固定依赖版本，补数值基线测试 |
| GCJ02 ↔ BD09 | 保留 `gcoord` 方案，封装为纯服务 | 固定依赖版本，补数值基线测试 |
| WGS84 ↔ BD09 的组合顺序 | 保留显式双步转换 | 验证最终结果和往返误差 |
| 相同坐标系不转换 | 返回原坐标的语义可保留 | 不修改 `original` |
| 高德使用 GCJ02、百度使用 BD09 的目标映射 | 作为地图接入契约参考 | 后续由地图 Feature 提出目标，不放入算法核心 |

### 5.2 需要适配的能力

| 旧设计 | V1 适配 |
|---|---|
| `useCoordTransform` React Hook | 改为纯 TypeScript `CoordinateService` |
| 独立传入 `source` 和坐标值 | 从 `Coordinate.system` 读取源坐标系，避免参数不一致 |
| 所有坐标都用 `lng/lat` | 使用现有判别联合：地理坐标为 `lng/lat`，投影坐标为 `x/y` |
| `TransformResult` 可同时带零坐标和错误 | 返回统一 `Result`；失败时不提供伪造坐标 |
| 静态转换路径矩阵 | V1 只保留少量显式分支和固定组合 |
| `transformBatch` | 先由 Feature 遍历单点服务；出现性能需求后再设计分批策略 |
| 页面直接调用算法 Hook | 页面调用 Feature，Feature 调用 `CoordinateService` |
| 当前值覆盖式处理 | 原始坐标保持只读，转换成功后写入 `converted` 缓存 |
| `SH2000` 名称 | 适配新领域枚举 `SHANGHAI2000` |

### 5.3 暂缓或不迁移

| 内容 | 决策 | 原因 |
|---|---|---|
| 上海 2000 参数及正式入口 | 暂缓 | 缺参数来源、EPSG、样本和精度证明 |
| CGCS2000≈WGS84 | 不作为正式规则迁移 | 属于未量化的近似 |
| `TRANSFORM_PATHS` 全矩阵 | 不迁移 | 对 V1 过度设计，并放大未验证路径 |
| 坐标系自动识别 | 不迁移 | 明确不在 V1 产品范围内 |
| 失败返回 `(0, 0)` | 不迁移 | 会制造有效数据假象 |
| `transformAll` | 暂不迁移 | V1 按用户目标按需转换 |
| 旧 `Point` 的 `rawData` 和当前坐标覆盖模型 | 不迁移 | 与新 Point 的 `original/converted` 边界冲突 |
| 地图 Hook 内直接转换 | 不迁移 | 地图 SDK 生命周期与坐标业务应分离 |

## 6. 测试与精度基线

### 6.1 旧项目已有测试

`reference/map-tools/src/utils/coordParams.test.ts` 覆盖：

- 五种坐标类型是否出现在配置中；
- 坐标名称是否存在；
- 高德、百度、天地图的目标坐标映射；
- `TRANSFORM_PATHS` 的结构；
- WGS84→BD09 和 BD09→WGS84 的路径顺序。

这些属于配置结构测试，不是坐标算法测试。

### 6.2 未发现的测试证据

| 测试项 | 旧项目情况 |
|---|---|
| 已知输入与预期输出样本 | 未发现 |
| `gcoord` 数值结果断言 | 未发现 |
| `proj4` 数值结果断言 | 未发现 |
| 小数精度或误差容差 | 未发现 |
| 双向往返误差 | 未发现 |
| 境外点、边界点行为 | 未发现 |
| 无效输入与失败语义 | 未发现算法级测试 |
| 上海 2000 权威样本 | 未发现 |
| 上海 2000 米级精度标准 | 未发现 |
| CGCS2000/WGS84 近似误差 | 未发现 |

项目中的上海经纬度示例主要用于文件解析或地图 UI，不包含转换后的权威预期值，不能视为算法样本。

### 6.3 迁移前必须建立的基线

WGS84、GCJ02、BD09 第一批至少需要：

- 经过确认的国内样本点；
- 每条正式支持路径的正向和反向预期值；
- 组合转换结果；
- 同坐标系保持不变；
- 非法经纬度返回失败且不产生 `(0, 0)`；
- 往返转换误差容差；
- 依赖版本锁定后的回归测试；
- 至少一个境外点，用于明确所采用依赖库的实际边界行为。

样本值必须来自已确认的旧版本输出或可信基准，不应在实现测试时凭经验编造。

上海 2000 需要独立测试集：

- 同一点的权威地理坐标与投影坐标；
- 正投影、反投影和往返测试；
- 多个覆盖适用区域的样本；
- X/Y 轴交换测试；
- 以米为单位的误差阈值；
- 明确使用的投影定义和算法版本。

## 7. V1 CoordinateService 建议

### 7.1 职责边界

`CoordinateService` 只负责：

1. 接收一个领域 `Coordinate`；
2. 校验源坐标类型与目标系统是否匹配；
3. 执行一次转换或一个固定的双步组合；
4. 返回成功坐标或明确失败；
5. 提供可写入转换缓存的算法版本信息。

它不负责：

- Point 的创建、保存或删除；
- 直接修改 `Point.original`；
- IndexedDB 或 Repository；
- 地图 SDK 和 Marker；
- 自动识别坐标系；
- 动态注册算法；
- 搜索任意转换路径。

推荐数据流：

```text
Points Page
  → Points Feature / PointService
  → CoordinateService
  → Result<Coordinate, CoordinateServiceError>
  → Feature 写入 Point.coordinates.converted
  → PointRepository 保存
```

`CoordinateService` 不直接依赖 `PointRepository`。这样既保留 `original` 不可覆盖的边界，也避免把坐标算法再次绑定到页面或存储。

### 7.2 最小接口语义

后续实现可采用类似语义：

```text
transform(coordinate, targetSystem)
  → success({ coordinate, algorithmVersion })
  → failure({ code, message })
```

源坐标系应读取 `coordinate.system`，不再额外接收一个可能冲突的 `source` 参数。

建议 V1 错误码保持简单：

- `INVALID_COORDINATE`
- `UNSUPPORTED_TRANSFORMATION`
- `TRANSFORMATION_FAILED`

无需恢复多层 Error Class。失败结果不得包含占位坐标。

### 7.3 V1 显式转换规则

第一批正式启用：

```text
WGS84 ↔ GCJ02
GCJ02 ↔ BD09
WGS84 → GCJ02 → BD09
BD09 → GCJ02 → WGS84
```

实现上使用少量显式条件或固定函数映射即可。该规模不需要：

- `TransformationGraph`
- `AlgorithmRegistry`
- 动态插件体系
- 通用 GIS 坐标框架

对于 `SHANGHAI2000` 和 `CGCS2000`，服务应返回 `UNSUPPORTED_TRANSFORMATION`，直到专项验证通过。

### 7.4 转换缓存规则

算法服务返回转换结果，Point Feature 负责缓存：

- `original` 永不被转换结果覆盖；
- 成功后只更新对应目标坐标系的 `converted` 项；
- 失败时不写缓存；
- 缓存记录算法版本；
- 当算法版本变化，旧缓存视为失效并按需重新生成；
- 同一目标且算法版本未变化时，可直接使用已有缓存。

## 8. 推荐迁移步骤

### 步骤 1：建立旧行为基线

- 锁定旧项目实际使用的依赖版本；
- 选取并确认 WGS84、GCJ02、BD09 样本；
- 记录各支持路径的输出和允许误差；
- 明确境外坐标行为；
- 核对依赖许可证和新项目采用版本。

### 步骤 2：实现最小 CoordinateService

- 只接入 `gcoord`；
- 只开放 WGS84、GCJ02、BD09；
- 使用现有 `Coordinate` 和 `Result` 类型；
- 使用显式转换分支；
- 不依赖 React、地图、Repository。

### 步骤 3：接入 Point 转换流程

- Point Feature 读取 `original` 或已有目标坐标；
- 调用 `CoordinateService`；
- 成功后写入 `converted`；
- 保存 Point；
- 增加单点和批量转换的 Feature 测试。

### 步骤 4：上海 2000 专项验证

- 追溯旧参数来源；
- 确认投影定义和轴顺序；
- 获取权威样本并定义精度标准；
- 确认 CGCS2000/WGS84 处理方式；
- 验证通过后再接入 `proj4` 和开放入口。

### 步骤 5：地图接入时复核平台契约

- 高德验证 GCJ02；
- 百度验证 BD09；
- 天地图单独确认实际要求的坐标基准；
- 地图页面只消费已转换坐标，不直接调用旧 Hook。

## 9. 最终迁移决策

| 范围 | 决策 |
|---|---|
| WGS84、GCJ02、BD09 的 `gcoord` 转换思路 | 迁移，先补基线 |
| WGS84 与 BD09 的固定组合顺序 | 迁移为显式服务逻辑 |
| React `useCoordTransform` 封装 | 不迁移 |
| 完整转换路径矩阵 | 不迁移 |
| 旧错误降级和 `(0, 0)` 返回 | 不迁移 |
| 上海 2000 的 `proj4` 基础 | 作为验证输入保留，暂不启用 |
| CGCS2000≈WGS84 | 暂不采纳为正式算法 |
| 坐标自动识别 | 不迁移 |
| 地图目标坐标映射 | 作为后续地图契约参考 |

Phase 2-A 的结论是：可以开始 WGS84、GCJ02、BD09 的 `CoordinateService` 实现准备，但应先建立可执行的算法数值基线；上海 2000 尚不满足正式迁移条件。
