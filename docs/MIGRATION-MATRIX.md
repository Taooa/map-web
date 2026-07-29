# Coordinate Toolkit V2 迁移矩阵

## 1. 文档目的

本矩阵记录参考项目能力的真实位置、迁移等级和 V2 处理方式。它描述“能力如何进入新架构”，不是代码复制清单。

迁移等级遵循 ADR-005：

- **M1**：直接迁移封装；
- **M2**：保留行为重构；
- **M3**：重新实现；
- **M4**：V1 不迁移。

成熟度口径：

- “已有”表示能定位到实现；
- “有测试”仅表示仓库存在测试文件，本次未执行测试；
- “待验证”表示不能仅凭代码确认生产正确性；
- 空函数、类型声明和 UI 按钮不计为已实现能力。

## 2. 坐标能力

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| WGS84 转换 | map-tools | `src/hooks/useCoordTransform.ts` | M1 | 提取 gcoord 调用到 Algorithm Registry，补固定样本和算法版本 | 已有双向路径；需核对中国境内/境外行为和依赖版本 |
| GCJ02 转换 | map-tools | `src/hooks/useCoordTransform.ts` | M1 | 保留成熟转换调用，以独立算法边注册 | 与 WGS84、BD09 路径已有 |
| BD09 转换 | map-tools | `src/hooks/useCoordTransform.ts` | M1 | 保留成熟转换调用，以独立算法边注册 | 需建立与百度地图样本的端到端基线 |
| 转换路径表 | map-tools | `src/utils/coordParams.ts` | M2 | 将静态全量路径重构为 TransformationGraph 自动寻路 | 保留可达关系，不保留大型硬编码表 |
| 单个/批量转换行为 | map-tools | `src/hooks/useCoordTransform.ts` | M2 | 从 React Hook 移入 CoordinateTransformer；批量返回逐项结果 | 旧批量为同步分片循环，未让出主线程 |
| 上海2000转换 | map-tools | `src/hooks/useCoordTransform.ts`、`src/utils/coordParams.ts` | M2 | 保留 proj4 与参数基础，验证后注册为正式算法边 | 待核参数来源、EPSG/投影、X/Y、样本、精度；未验证前禁用正式结果 |
| CGCS2000相关 | map-tools | `src/hooks/useCoordTransform.ts`、`src/utils/coordParams.ts` | M2 | 作为默认关闭的 Registry 节点保留线索 | 旧实现部分按 WGS84 近似处理，不能直接作为正式算法 |
| 坐标输入校验 | map-tools | `src/utils/pointValidate.ts` | M2 | 按 geographic/projected 类型重构校验规则 | V2 不做区域/异常点判断；只做类型、有限值和基本范围校验 |

## 3. 文件导入

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| Excel读取 | map-tools | `src/utils/file.ts`、`src/components/FileUpload.tsx` | M2 | 建立 ExcelParser，保留 SheetJS 使用经验 | 旧实现只读首个 Sheet；V2 需工作表选择、空表和错误边界 |
| CSV读取 | map-tools | `src/utils/file.ts` | M3 | 使用标准 CSV 解析库重新实现 CSVParser | 旧 `split(',')` 不能正确处理引号、换行、转义和 BOM |
| JSON文件导入 | map-tools | `src/utils/file.ts` | M2 | JSONParser 仅保留顶层对象数组行为 | 移除旧 GeoJSON `features[].properties` 分支 |
| JSON粘贴 | 无完整实现 | 无对应独立模块 | M3 | 新建文本输入、解析、预览和错误状态 | 与 JSON 文件共用 Parser，入口重新实现 |
| 字段映射建议 | map-tools | `src/utils/mapUtils.ts`、`src/pages/CoordConvert.tsx` | M2 | 保留建议逻辑，用户必须显式确认名称、X/Lng、Y/Lat | 不等同于坐标系自动识别；无匹配时不得静默使用错误列 |
| 映射与Point标准化 | map-tools | `src/pages/CoordConvert.tsx`、`src/pages/MapVisual.tsx` | M2 | 从页面提取为 Import Feature 用例 | 禁止 `parseFloat(...) || 0`；逐行返回错误 |
| 自动识别坐标系 | map-tools | `src/pages/MapVisual.tsx` | M4 | V1 不迁移，不提供入口 | 与 PRD V2 明确“不做”一致 |
| GeoJSON导入 | map-tools | `src/utils/file.ts` | M4 | V1 不迁移 | 旧实现只取 properties，也不是完整 GeoJSON 点位导入 |

## 4. 点位管理

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| 旧 Point 模型 | map-tools | `src/types/index.ts` | M3 | 按 ADR-002/Architecture 重建 Point、Coordinate、Source、缓存 | 旧模型混合原始/当前坐标并允许 `rawData`，不符合最小业务字段要求 |
| 手动添加点位 | map-tools | `src/components/PointInput.tsx`、`src/pages/MapVisual.tsx` | M2 | 保留输入流程，改为 Feature 用例并写 Repository | 添加后清空输入、持久化和错误提示需补齐 |
| 点位列表/预览 | map-tools | `src/components/TablePreview.tsx`、两个页面的内存数组 | M3 | 新建 Point Manager Table、搜索、详情和分页/虚拟化策略 | 旧实现是页面预览，不是持久工作台 |
| 点位编辑 | map-tools | 未发现独立编辑实现 | M3 | 按产品确认后实现编辑用例与缓存失效 | PRD 当前未明确编辑是否属于 V1，见 OPEN-QUESTIONS |
| 点位删除 | map-tools | 仅有清空 Marker/全部点位流程，未发现持久化单条删除 | M3 | 实现单条和批量删除、确认及 Repository 事务 | 地图对象删除不等于业务 Point 删除 |
| 批量选择与批量操作 | map-tools | `src/pages/MapVisual.tsx`、地图 Hook 接口 | M3 | 在 Point Manager 重新实现选择、转换、删除、地图查看 | `getSelectedPoints` 在三个 Hook 中不是完整可用实现 |

## 5. 地图能力

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| SDK Loader公共行为 | map-tools | `src/utils/mapLoader.ts` | M2 | 为每个平台建立幂等 Loader 状态机 | 需处理 Key变化、超时、回调清理、script id、失败重试和并发 |
| 高德初始化 | map-tools | `src/hooks/useAmap.ts` | M2 | 移入 AMapAdapter.initialize | 旧 Key 来自构建环境；V2 改为用户配置且无 Key 不加载 |
| 高德 Marker | map-tools | `src/hooks/useAmap.ts` | M2 | 实现 setMarkers/clearMarkers，输入统一 MapPoint | 需避免批次调用时每次 clear 导致只剩最后一批 |
| 高德 InfoWindow | map-tools | `src/hooks/useAmap.ts`、`src/utils/mapUtils.ts` | M2 | Adapter 管理实例，UI内容安全渲染 | 旧实现拼接 HTML，需处理转义和关闭释放 |
| 高德聚合/海量点 | map-tools | `src/hooks/useAmap.ts`、`src/components/LocaLayer.tsx` | M2 | 作为可选 Capability 和性能策略重构 | 旧阈值 1,000/10,000 仅作压测起点；旧实现可能同时创建海量点和聚合 Marker |
| 百度初始化 | map-tools | `src/hooks/useBmap.ts` | M2 | 移入 BaiduAdapter.initialize | 需验证 BMap/BMapGL 选择、AK、域名限制和销毁 |
| 百度 Marker | map-tools | `src/hooks/useBmap.ts` | M2 | 实现统一 Marker 契约 | 目前逐点创建；需定义数量上限和降级 |
| 百度 InfoWindow | map-tools | `src/hooks/useBmap.ts`、`src/utils/mapUtils.ts` | M2 | Adapter 管理 InfoWindow 和安全内容 | 需验证事件解绑与地图切页释放 |
| 天地图初始化 | map-tools | `src/hooks/useTianditu.ts` | M2 | 移入 TiandituAdapter.initialize | Loader 使用延时探测全局对象，需改成明确超时状态机 |
| 天地图 Marker | map-tools | `src/hooks/useTianditu.ts` | M2 | 实现统一 Marker 契约 | 必须先确认输入坐标契约 |
| 天地图 InfoWindow | map-tools | `src/hooks/useTianditu.ts`、`src/utils/mapUtils.ts` | M2 | Adapter 封装并统一点位详情 | 坐标转换正确性依赖 CGCS2000/WGS84 结论 |
| 配置驱动的平台容器思想 | gisviewer-react | `src/plugin/gis-viewer/MapContainer.tsx`、`src/components/configs/*` | M2 | 参考 ProviderRegistry、配置对象和先销毁后初始化流程 | 旧平台是 ArcGIS2D/3D/Mapbox，不迁移其实现到三地图 |
| 生命周期管理思想 | gisviewer-react、map-tools | `MapContainer.tsx`、`MapAppArcgis*.ts`、三个地图 Hook | M2 | MapCore 统一 initialize/ready/destroy，Adapter 释放事件和覆盖物 | 不复制大型组件和 Widget 管理器 |

## 6. 地图工具

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| 有限底图切换 | map-tools | 三个地图 Hook 的 `setLayer`、`src/utils/mapUtils.ts` | M2 | 仅对验证通过的平台声明 `baseLayer` Capability | 切换底图不得清空业务点或重复创建对象 |
| 缩放/平移 | map-tools、gisviewer-react | 地图原生控件；`IMapContainer` 层级/中心方法 | M2 | 采用 SDK 原生交互，MapAdapter只暴露 V1 所需控制 | 属于地图基本交互，不建设通用工具系统 |
| 浏览器定位 | map-tools | `src/hooks/useAmap.ts` 中高德 Geolocation 控件 | M4 | 不作为 V1 跨平台产品能力迁移 | 如仅保留平台原生控件，需另行确认隐私和权限体验 |
| 测量工具 | map-tools、gisviewer-react | 高德部分实现；百度/天地图空或不完整；Measurement widgets | M4 | V1 不迁移 | 不能因接口存在而声明三平台支持 |
| 绘制工具 | map-tools、gisviewer-react | 高德部分实现；其他 Hook 不完整；Draw widgets | M4 | V1 不迁移 | 不建设 Geometry/Layer 系统 |

## 7. 数据、UI与外围能力

| 模块 | 来源 | 旧实现位置 | 迁移等级 | 新项目处理方式 | 备注 |
|-|-|-|-|-|-|
| IndexedDB与Repository | 无 | 参考项目未发现对应实现 | M3 | 新建 points/imports/settings stores 和三个 Repository | 包含 schema、迁移、事务、配额与不可用错误 |
| API Key设置 | map-tools | `.env` + `import.meta.env` 使用 | M3 | 新建 Settings Feature 与 localStorage credential storage | 不迁移旧 Key，不把 localStorage描述为安全密钥库 |
| PeachTools UI | map-tools | 页面、组件、`src/index.css` | M3 | 按 DESIGN-SYSTEM 全量重做 | 不复制旧页面、CSS和状态组织 |
| 搜索、天气、地址解析 | map-tools | `SearchPanel.tsx`、`WeatherPanel.tsx`、`utils/geocode.ts`、`utils/weather.ts` | M4 | V1 不迁移 | 不属于点位转换与地图验证主流程 |

## 8. 统计

本矩阵按表格能力项统计：

| 等级 | 数量 | 含义 |
|-|-:|-|
| M1 | 3 | 可在审计、许可证检查和基线测试后迁移封装 |
| M2 | 25 | 保留行为或经验，按新边界重构 |
| M3 | 10 | 依据 V2 需求重新实现 |
| M4 | 6 | V1 明确不迁移 |
| **合计** | **44** | 不含标题和说明行 |

## 9. 使用规则

- Phase 1 前为每个 M1/M2 项指定负责人、样本和验收方式；
- 迁移等级变更必须说明证据并同步 ADR/开放问题；
- M1 未建立基线测试前不得进入实现；
- M2 不允许把旧页面或 Hook 整体搬入；
- M3 不以旧内部结构作为兼容目标；
- M4 不得出现在 V1 导航、Capability 或验收声明中。
