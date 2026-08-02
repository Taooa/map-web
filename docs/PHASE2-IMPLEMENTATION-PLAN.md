# Coordinate Toolkit V2 Phase 2 实施计划

- 文档状态：Draft
- 日期：2026-07-29
- 阶段定位：内存数据层上的第一个业务纵切
- 前置阶段：Phase 1工程骨架与核心契约
- 关联文档：
  - `Coordinate-Toolkit-PRD-V2.md`
  - `Coordinate-Toolkit-TASKS-V2.md`
  - `ARCHITECTURE.md`
  - `MIGRATION-MATRIX.md`
  - `PHASE0-BASELINE-REPORT.md`
  - `PHASE1-IMPLEMENTATION-PLAN.md`
  - `decisions/ADR-002-coordinate-system.md`
  - `decisions/ADR-004-storage-strategy.md`
  - `decisions/ADR-005-legacy-code-boundary.md`

## 0. 阶段定义

Phase 2通过一个可运行的Point纵切验证Phase 1的架构契约：

```text
创建Point
    ↓
MemoryPointRepository
    ↓
Point列表
    ↓
单个/批量转换用例
    ↓
更新Point.coordinates.converted
    ↓
列表与详情显示坐标状态
```

本阶段的数据在页面刷新后丢失，这是有意的阶段性选择。Phase 2验证业务模型、Use Case、依赖注入和页面协作，不验证浏览器持久化。IndexedDB属于后续Storage阶段。

本次任务对“Point编辑是否进入当前闭环”给出了明确输入，因此Phase 2将编辑纳入范围。编辑规则必须保持领域不变量，不能把编辑扩展为通用审计、版本历史或任意字段修改。

# 1. Phase 2目标

## 1.1 本阶段完成

- 建立`features/points`、`features/imports`和`features/coordinate-transform`边界；
- 实现Point新增、编辑、删除和查询Use Case；
- 实现Point列表搜索和页面内批量选择；
- 实现PointRepository、ImportRepository、SettingsRepository的内存Adapter；
- 把PointsPage从空壳升级为最小可用工作台；
- 实现单个和批量转换业务编排；
- 实现Algorithm Registry、TransformationGraph和CoordinateTransformer的最小生产装配；
- 在基线门槛通过后，迁移WGS84、GCJ02、BD09之间的已验证算法能力；
- 将成功转换写入`Point.coordinates.converted`；
- 展示转换成功、缓存命中、部分失败和不可用状态；
- 为Feature、Memory Repository、转换Core和页面纵切建立测试。

## 1.2 本阶段不包含

- 高德、百度、天地图SDK；
- Marker、InfoWindow、fitView或地图页面业务；
- Excel、CSV、JSON真实文件选择、读取和解析；
- 文件上传、拖拽、字段映射UI和导入预览；
- IndexedDB、localStorage、Dexie或后端API；
- API Key、AK或Token；
- 上海2000参数、投影定义和转换算法；
- CGCS2000转换或WGS84近似等价边；
- 自动识别坐标系；
- GeoJSON；
- 区域校验或异常点判断；
- 导出；
- 跨页面或刷新后的选择状态；
- 撤销、历史版本、权限和协作。

## 1.3 坐标能力门槛

Phase 2不能用Fake转换结果冒充完整业务闭环。

真实WGS84、GCJ02、BD09转换进入运行时前必须满足：

1. 有可追溯的固定输入输出样本；
2. 定义误差容限；
3. 确认第三方算法依赖、版本和许可证；
4. 与`MIGRATION-MATRIX.md`的M1结论一致；
5. Algorithm声明稳定id和version；
6. 正反向与多步路径回归通过；
7. 不从reference运行时导入或复制页面/Hook。

如果门槛尚未满足，可以先完成Feature、Memory Repository、页面和转换编排测试，但不得把Phase 2标记为完成，也不得在页面显示未经验证的坐标结果。

上海2000保持`experimental`，CGCS2000保持非默认入口。本阶段二者在转换目标选择中禁用并说明“待验证”，不创建任何近似或占位算法。

# 2. Feature层设计

## 2.1 建议目录

```text
src/features/
├── points/
│   ├── use-cases/
│   │   ├── create-point.ts
│   │   ├── update-point.ts
│   │   ├── delete-point.ts
│   │   ├── get-point.ts
│   │   └── list-points.ts
│   ├── model/
│   │   ├── point-input.ts
│   │   ├── point-list-query.ts
│   │   └── point-feature-errors.ts
│   ├── validation/
│   │   └── validate-point-input.ts
│   └── index.ts
├── imports/
│   ├── model/
│   │   └── import-feature-contracts.ts
│   └── index.ts
└── coordinate-transform/
    ├── use-cases/
    │   ├── transform-point.ts
    │   └── transform-points.ts
    ├── model/
    │   ├── transform-points-command.ts
    │   ├── transform-points-result.ts
    │   └── coordinate-transform-errors.ts
    └── index.ts
```

页面组件可按实际复杂度放在Feature内：

```text
src/features/points/components/
src/features/points/hooks/
src/features/coordinate-transform/components/
```

Feature的Public API只能从各自`index.ts`导出。Page不能深层引用Use Case内部文件。

## 2.2 points职责

`features/points`负责：

- 接收用户输入；
- 执行Point输入的基础校验；
- 创建ID和时间；
- 构造符合Domain的Point；
- 调用PointRepository；
- 把Repository错误映射为Feature错误；
- 提供新增、编辑、删除、获取和列表Use Case；
- 定义页面可消费的命令和结果。

不负责：

- 坐标算法；
- IndexedDB；
- React页面布局；
- 批量选择状态；
- 地图；
- 文件解析。

## 2.3 imports职责

`features/imports`是后续文件导入的业务边界。本阶段只确认职责和Public API位置，不读取真实文件、不创建Parser、不展示上传入口。

未来职责：

- 编排Parser、字段映射、Point标准化和原子保存；
- 创建ImportRecord摘要；
- 返回行级错误统计；
- 通过PointRepository和ImportRepository保存结果。

Phase 2可以为导入命令和结果预留最小类型，但不得创建假文件流程，也不得用硬编码数组冒充Excel/CSV/JSON导入。

## 2.4 coordinate-transform职责

`features/coordinate-transform`负责：

- 根据Point ID读取Point；
- 判断目标是否等于original；
- 判断是否已有可用converted缓存；
- 调用CoordinateTransformer；
- 将成功结果包装成ConvertedCoordinate；
- 保留其他目标缓存和original；
- 更新Point的`updatedAt`；
- 保存更新后的Point；
- 聚合批量成功、缓存命中、失败和未找到结果；
- 向页面提供进度与最终摘要。

不负责：

- 实现坐标算法；
- 规划路径；
- 注册Algorithm；
- 操作数据库；
- 格式化地图坐标；
- 把失败结果写入Point。

## 2.5 依赖方向

```text
Page / React Hook
        ↓
Feature Use Case
   ↙           ↘
Domain      Repository/Core Port
                  ↑
        Memory Adapter / Coordinate Core实现
```

禁止：

```text
Page → MemoryRepository具体类
Page → AlgorithmRegistry
Feature → React
Feature → IndexedDB/localStorage
MemoryRepository → Feature
Coordinate Algorithm → PointRepository
```

# 3. Point业务流程

## 3.1 新增Point

输入：

- name；
- coordinate system；
- geographic的lng/lat，或projected的x/y；
- source固定为manual。

流程：

```text
表单输入
  ↓
CreatePointInput
  ↓
基础校验
  ↓
生成PointId和时间
  ↓
original = 用户输入坐标
converted = {}
  ↓
PointRepository.create
  ↓
刷新列表并清空表单
```

规则：

- 名称去除首尾空格后不能为空；
- 数值必须是有限数字；
- geographic与projected字段不能混用；
- WGS84为默认坐标系；
- `source.type = manual`；
- 不自动判断坐标系；
- 不做区域或异常判断；
- 实验坐标系能否创建由CoordinateSystemRegistry状态决定；
- 本阶段默认创建入口只开放`supported`坐标系。

## 3.2 编辑Point

允许编辑：

- name；
- original coordinate。

不允许编辑：

- id；
- source；
- createdAt。

规则：

- 只修改name时保留converted缓存；
- original任一数值或坐标系改变时，清空全部converted缓存；
- updatedAt更新；
- 编辑不产生新的ImportRecord；
- 不保留历史版本；
- 不允许直接编辑某个converted结果。

## 3.3 删除Point

流程：

```text
单个或已选Point ID
  ↓
确认
  ↓
DeletePoint逐项调用Repository
  ↓
从选择集合移除
  ↓
刷新列表
```

规则：

- 单条删除必须返回明确成功/失败；
- 批量删除允许部分失败并显示摘要；
- 删除Point时converted随实体一起删除；
- 本阶段没有ImportRecord级联行为；
- Memory Repository清空不能被描述为持久删除。

## 3.4 查询Point

最小查询：

- 按名称搜索；
- offset；
- limit。

Phase 2列表数据量有限，可以在Memory Repository中执行简单搜索和切片，但接口行为必须与未来持久实现一致。

默认排序应确定且可测试，建议：

1. `updatedAt`降序；
2. 时间相同时按id稳定排序。

不要在Page内自行读取全部数据再重复定义另一套查询语义。

## 3.5 批量选择

批量选择属于页面会话状态，不写入Point或Repository。

建议模型：

```ts
ReadonlySet<PointId>
```

行为：

- 选择单条；
- 取消单条；
- 全选当前查询结果；
- 取消全选；
- 删除后移除不存在ID；
- 查询变化时保留仍存在的已选ID，UI明确显示选择数量；
- 刷新页面后选择状态清空。

禁止在Point上增加`selected`字段。

# 4. Memory Repository方案

## 4.1 为什么先使用内存实现

Memory Repository用于验证：

- Repository接口是否足以支撑Feature；
- Point不变量是否能在CRUD中保持；
- 页面是否只依赖Feature；
- 转换成功后缓存能否正确合并；
- 错误映射和批量部分失败是否清晰；
- 未来替换IndexedDB时是否无需修改Page和Use Case。

它降低了同时调试UI、业务和数据库的复杂度，使第一条业务纵切更容易定位问题。

## 4.2 建议目录

```text
src/adapters/storage/memory/
├── memory-point-repository.ts
├── memory-import-repository.ts
├── memory-settings-repository.ts
├── memory-store.ts
└── index.ts
```

`memory-store.ts`只保存进程内Map或对象。它不是Domain，也不能被Page直接导入。

## 4.3 行为要求

MemoryPointRepository：

- 实现现有PointRepository；
- `create`拒绝重复id；
- `get`不存在时返回成功的`null`；
- `update`不存在时返回结构化`NOT_FOUND`；
- `delete`不存在时返回`NOT_FOUND`或按统一决策实现幂等，必须写入测试；
- `list`支持名称、offset、limit和稳定排序；
- 返回只读快照，不能让调用方通过引用修改内部Store；
- 每个测试可以获得独立实例。

MemoryImportRepository：

- 实现save、list、get；
- 仅保存ImportRecord摘要；
- 本阶段不接Parser。

MemorySettingsRepository：

- 实现get、save、reset；
- 只保存产品Settings；
- 不保存API Key。

## 4.4 生命周期

在应用Composition Root中创建一次Memory Repository实例，使路由切换时数据保留。

以下行为是Phase 2的已知限制：

- 刷新页面数据丢失；
- 新浏览器标签不共享；
- 没有配额、迁移或事务验证。

PointsPage应显示“内存演示模式，刷新后数据会清空”的非阻塞提示，避免用户误认为已持久化。

## 4.5 为什么不直接使用React State代替

如果Point只保存在PointsPage的`useState`中：

- Repository契约没有被验证；
- 页面会拥有业务数据源；
- 转换Use Case难以复用；
- 将来接IndexedDB需要重写页面。

因此React State只保存表单、弹窗、加载状态和选择集合；Point实体的权威来源是注入的PointRepository。

# 5. Use Case设计

## 5.1 公共依赖

Use Case通过构造参数或简单工厂注入：

- PointRepository；
- CoordinateTransformer（只给转换Feature）；
- CoordinateSystemRegistry；
- ID生成器；
- Clock。

不引入大型DI框架。生产装配集中在`src/app/composition/`，测试直接传入Mock/Fake。

## 5.2 CreatePoint

```text
execute(input: CreatePointInput)
  → Promise<Result<Point, PointFeatureError>>
```

职责：

- 校验名称和Coordinate；
- 生成ID和时间；
- 创建manual Point；
- 确保converted为空；
- 调用Repository.create。

## 5.3 UpdatePoint

```text
execute(command: UpdatePointCommand)
  → Promise<Result<Point, PointFeatureError>>
```

职责：

- 读取现有Point；
- 只接受name/original变更；
- original变化时失效全部converted；
- 保留id、source和createdAt；
- 更新时间；
- 调用Repository.update。

## 5.4 DeletePoint

```text
execute(id: PointId)
  → Promise<Result<void, PointFeatureError>>
```

职责：

- 调用Repository.delete；
- 映射Repository错误；
- 不操作页面选择状态。

批量删除可以由独立`DeletePoints`组合Use Case实现，不把数组语义塞进单条DeletePoint。

## 5.5 GetPoint

```text
execute(id: PointId)
  → Promise<Result<Point | null, PointFeatureError>>
```

用于详情、编辑初始化和转换前读取。

## 5.6 ListPoints

```text
execute(query: ListPointsQuery)
  → Promise<Result<readonly Point[], PointFeatureError>>
```

职责：

- 规范搜索文本；
- 限制非法offset/limit；
- 调用Repository.list；
- 不在Use Case中保存UI选择状态。

## 5.7 TransformPoint

```text
execute(command: {
  pointId: PointId;
  target: CoordinateSystemId;
})
  → Promise<Result<TransformPointOutcome, CoordinateTransformFeatureError>>
```

流程：

1. 读取Point；
2. 检查目标CoordinateSystem状态；
3. 目标等于original.system时返回`original`命中；
4. converted已有仍有效缓存时返回`cache-hit`；
5. 调用CoordinateTransformer；
6. 失败则返回错误，不修改Point；
7. 成功则创建ConvertedCoordinate；
8. 合并目标缓存，保留其他converted；
9. 更新updatedAt并保存Point；
10. 返回`transformed`。

Outcome至少区分：

- `original-hit`；
- `cache-hit`；
- `transformed`。

## 5.8 TransformPoints

```text
execute(command: {
  pointIds: readonly PointId[];
  target: CoordinateSystemId;
})
  → Promise<TransformPointsSummary>
```

Summary至少包含：

- requested；
- transformed；
- originalHits；
- cacheHits；
- failed；
- 每个Point的结果。

规则：

- 去重Point ID；
- 单点失败不阻塞整批；
- 空集合返回明确空结果，不启动转换；
- Phase 2可以顺序执行以保证行为简单；
- 不把失败写入converted；
- 不对实验/禁用目标静默转换；
- 页面显示部分成功，不只给一个布尔值。

## 5.9 Feature错误

Feature错误与底层错误分层：

```text
PointFeatureError
├── VALIDATION_FAILED
├── NOT_FOUND
├── CONFLICT
└── STORAGE_UNAVAILABLE

CoordinateTransformFeatureError
├── POINT_NOT_FOUND
├── TARGET_UNAVAILABLE
├── INVALID_COORDINATE
├── NO_PATH
├── ALGORITHM_UNAVAILABLE
└── SAVE_FAILED
```

Page只消费Feature错误和用户可读消息，不展示数据库或算法内部异常。

# 6. 页面关系

## 6.1 PointsPage依赖

```text
PointsPage
  ↓
usePointsPageModel
  ├── CreatePoint
  ├── UpdatePoint
  ├── DeletePoint / DeletePoints
  ├── GetPoint
  ├── ListPoints
  └── TransformPoints
          ↓
  Feature Use Cases
          ↓
  Repository/Core Ports
```

PointsPage不得：

- `new MemoryPointRepository()`；
- 直接调用Repository；
- 直接操作AlgorithmRegistry；
- 构造converted缓存；
- 判断转换路径；
- 导入reference代码。

## 6.2 Composition Root

建议目录：

```text
src/app/composition/
├── create-memory-runtime.ts
├── feature-context.tsx
└── index.ts
```

Composition Root负责：

- 创建Memory Repository实例；
- 创建Coordinate Registry/Graph/Transformer实现；
- 创建Use Case；
- 通过Context或明确props提供给页面。

Context只用于依赖和服务装配，不把所有页面状态变成全局状态。

## 6.3 PointsPage最小布局

```text
Point Manager
├── Memory模式提示
├── Header
│   └── 新增Point
├── Toolbar
│   ├── 名称搜索
│   ├── 已选数量
│   ├── 批量转换
│   └── 批量删除
├── Table
│   ├── 选择
│   ├── 名称
│   ├── 来源
│   ├── 原始坐标系
│   ├── 已有转换
│   └── 操作
├── Add/Edit Dialog
├── Point Details
└── Transform Dialog
```

Phase 2不必一次完成PRD中的最终视觉密度，但必须使用现有Design Token，不回退到reference UI。

## 6.4 页面状态

React页面状态：

- 搜索文本；
- 当前选中ID；
- Dialog/Drawer开关；
- 表单草稿；
- 加载和提交状态；
- Feature错误；
- 操作摘要。

Repository状态：

- Point实体；
- ImportRecord摘要；
- Settings。

不要把Point数组同时长期保存在Repository和第二个全局Store中。页面可保存最近一次查询结果作为渲染快照，并在变更成功后重新查询。

# 7. 开发任务拆解

## Task 1：Point Feature

### 目标

建立Point CRUD、查询、验证和Feature错误映射，使业务逻辑可以脱离React和具体Repository实现测试。

### 输入

- Domain Point/Coordinate/Source；
- PointRepository接口；
- CoordinateSystemRegistry接口；
- PRD点位管理规则。

### 计划修改文件

```text
src/features/points/**
tests/features/points/**
```

如需要稳定ID和时间：

```text
src/core/shared/id-generator.ts
src/core/shared/clock.ts
```

只定义最小接口，不引入通用基础框架。

### 输出

- CreatePoint；
- UpdatePoint；
- DeletePoint；
- DeletePoints；
- GetPoint；
- ListPoints；
- 输入模型、错误和验证；
- Feature Public API。

### 验收标准

- Use Case不依赖React；
- CreatePoint产生manual source、original和空converted；
- 名称为空或坐标字段不匹配时失败；
- 只编辑名称保留converted；
- 编辑original清空converted；
- id、source、createdAt不可被Update覆盖；
- Repository错误被映射为Feature错误；
- 单元测试使用Mock Repository；
- 不包含文件、地图或存储实现。

## Task 2：MemoryRepository

### 目标

为Point纵切提供可替换的内存数据源，并验证三个Repository接口。

### 输入

- PointRepository；
- ImportRepository；
- SettingsRepository；
- Task 1 Use Case行为。

### 计划修改文件

```text
src/adapters/storage/memory/**
tests/adapters/storage/memory/**
src/app/composition/create-memory-runtime.ts
```

### 输出

- MemoryPointRepository；
- MemoryImportRepository；
- MemorySettingsRepository；
- 独立Memory Store；
- 应用级单实例装配。

### 验收标准

- 完整实现三个Repository接口；
- 没有IndexedDB、localStorage、Dexie、fetch或后端；
- create/get/list/update/delete行为确定；
- 查询、排序和分页有测试；
- 重复ID、缺失实体和reset行为有测试；
- 返回对象不能通过外部引用篡改内部Store；
- 每个测试实例隔离；
- 刷新丢失限制在UI和README中说明。

## Task 3：Point页面

### 目标

将`/points`从空壳升级为可完成新增、编辑、删除、查询和批量选择的最小工作台。

### 输入

- Task 1 Point Feature；
- Task 2 Memory Repository和Composition Root；
- DESIGN-SYSTEM；
- Phase 1 AppLayout与基础Token。

### 计划修改文件

```text
src/pages/PointsPage.tsx
src/features/points/components/**
src/features/points/hooks/**
src/app/composition/**
src/styles/**                    # 仅语义Token或必要局部样式
tests/pages/points-page.test.tsx
```

### 输出

- Memory模式提示；
- Point列表；
- 搜索；
- 新增/编辑表单；
- 单个/批量删除；
- 单选、全选当前结果和已选数量；
- 详情或坐标摘要；
- 加载、空、错误和成功反馈。

### 验收标准

- 页面只通过Feature调用业务；
- 新增后列表出现且表单清空；
- 编辑名称与original遵守缓存规则；
- 删除后列表和选择集合同步；
- 搜索和全选当前结果行为清楚；
- 刷新前路由切换回来Point仍存在；
- 页面刷新丢失有明确提示；
- 页面不直接导入Memory Repository具体类；
- 无地图、文件上传或持久化调用；
- 键盘和基础可访问性通过测试。

## Task 4：Transform流程

### 目标

打通“选择Point → 选择目标系统 → 转换 → 缓存 → 列表更新”的单个和批量流程。

### 输入

- Coordinate Core契约；
- PointRepository；
- Task 1 Point Feature；
- Phase 0 WGS84/GCJ02/BD09基线样本；
- MIGRATION-MATRIX M1/M2结论。

### 计划修改文件

```text
src/features/coordinate-transform/**
src/core/coordinate/implementations/**          # Registry/Graph/Transformer最小实现
src/adapters/coordinates/**                     # 已验证算法Adapter
src/app/composition/**
src/features/coordinate-transform/components/**
tests/features/coordinate-transform/**
tests/core/coordinate/**
tests/adapters/coordinates/**
tests/pages/points-transform-flow.test.tsx
tests/fixtures/coordinate-transform/**
```

实际算法依赖必须经版本、许可证和基线评审后加入`package.json`，不得复制reference Hook。

### 输出

- TransformPoint；
- TransformPoints；
- 转换摘要；
- Registry/Graph/Transformer生产实现；
- 已验证WGS84/GCJ02/BD09算法边；
- 算法id、version和路径签名；
- 转换Dialog和批量反馈；
- converted缓存写回。

### 验收标准

- WGS84、GCJ02、BD09固定样本在容差内通过；
- WGS84→BD09可通过Graph多步路径；
- source与coordinate.system不一致返回`INVALID_COORDINATE`；
- 无路径返回`NO_PATH`；
- 未注册或禁用算法返回`ALGORITHM_UNAVAILABLE`；
- 上海2000和CGCS2000没有可执行路径；
- 目标等于original不调用算法；
- 有效缓存不重复计算；
- 转换失败不修改Point；
- 成功只更新目标缓存，保留original和其他缓存；
- 批量允许部分失败并返回逐点结果；
- 页面显示转换结果和已有坐标状态；
- 不接地图、文件或持久化。

## 7.1 推荐实施顺序

任务编号表示交付分组，不等于严格串行顺序。推荐：

```text
Task 1 Point Feature
        ↓
Task 2 MemoryRepository
        ↓
Task 4A Transform Feature编排
        ↓
坐标基线门槛通过
        ↓
Task 4B Core实现与已验证算法Adapter
        ↓
Task 3 Point页面及最终集成
```

页面组件可以在Task 2后并行开发，但完整页面验收必须等待Task 4。

# 8. Definition of Done

Phase 2只有在以下条件全部满足时完成。

## 8.1 用户闭环

用户可以在`/points`：

1. 手动创建一个WGS84/GCJ02/BD09 Point；
2. 在列表中看到该Point；
3. 搜索该Point；
4. 编辑名称；
5. 编辑original并看到旧converted失效；
6. 选择一个或多个Point；
7. 选择已支持目标坐标系；
8. 完成单个或批量转换；
9. 在列表/详情看到converted状态；
10. 删除Point。

## 8.2 数据不变量

- original始终存在且不会被转换覆盖；
- 同original系统不重复写converted；
- 只保存成功转换；
- converted按目标系统索引；
- 修改original清除旧converted；
- 只修改名称保留converted；
- Point不包含selected、Marker、原始文件行或任意业务字段；
- ImportRecord不保存文件内容；
- Settings不包含地图凭据。

## 8.3 转换正确性

- 只有通过基线的WGS84、GCJ02、BD09算法标记为verified；
- 每个算法有id、version和来源；
- Graph而不是大型switch规划路径；
- 上海2000保持experimental且不可执行；
- CGCS2000没有默认入口和近似等价边；
- Fake算法只存在于测试；
- 页面不展示伪造坐标结果。

## 8.4 架构边界

- Page只依赖Feature Public API；
- Feature依赖Domain与Port；
- Memory实现位于Adapter；
- Coordinate算法位于Algorithm Adapter；
- Composition Root集中装配；
- 生产运行时不依赖reference；
- 不引入通用GIS、ORM或DI框架。

## 8.5 测试与质量

以下命令全部通过：

```text
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
```

测试至少覆盖：

- Point CRUD；
- 编辑缓存失效；
- Memory Repository接口行为；
- 搜索、排序和分页；
- Registry、Graph、Transformer；
- WGS84/GCJ02/BD09基线；
- 单个/批量转换；
- 缓存命中；
- 部分失败；
- PointsPage主闭环；
- 禁止上海2000/CGCS2000转换。

## 8.6 范围检查

代码和依赖中不存在：

- 地图SDK；
- Marker或地图页面业务；
- File、FileReader、SheetJS或CSV Parser；
- IndexedDB、localStorage、Dexie；
- 后端API；
- 上海2000参数；
- CGCS2000转换；
- 自动识别坐标系；
- GeoJSON。

## 8.7 已知阶段限制

验收记录必须明确：

- 刷新后Point丢失；
- 真实文件导入尚未实现；
- 数据尚未进入IndexedDB；
- 地图验证尚未实现；
- 上海2000尚未通过验证；
- CGCS2000仍是扩展研究项。

这些限制不阻止Phase 2完成，但不得在产品文案中隐藏。

