# Coordinate Toolkit V2 Phase 1 实施计划

- 文档状态：Draft
- 日期：2026-07-29
- 阶段定位：工程基础与核心契约
- 前置阶段：Phase 0 迁移基线分析
- 关联文档：
  - `Coordinate-Toolkit-PRD-V2.md`
  - `Coordinate-Toolkit-TASKS-V2.md`
  - `ARCHITECTURE.md`
  - `PROJECT-STRUCTURE.md`
  - `MIGRATION-MATRIX.md`
  - `PHASE0-BASELINE-REPORT.md`
  - `OPEN-QUESTIONS.md`
  - `decisions/ADR-001`～`ADR-005`

## 0. 阶段定义

Phase 1 的目标是建立一个可以启动、可以检查、可以测试，并且后续业务能力能够按正确依赖方向进入的新工程基础。

本阶段不以“页面可用”或“业务功能完成”为成功标准。路由页面只提供结构化空壳；Domain、Repository 和 Coordinate Core 只定义稳定契约，不迁移算法、不连接数据库、不加载地图 SDK。

Phase 1 结束时，应能回答：

1. 新项目如何启动、构建和执行质量检查；
2. 页面、Feature、Domain、Core、Adapter 的依赖方向是什么；
3. Point、Coordinate、Source、ImportRecord 如何表达；
4. 业务以后通过什么接口访问存储；
5. 坐标算法以后通过什么接口注册和调用；
6. 如何为后续迁移建立自动化测试。

# 1. Phase 1目标

## 1.1 本阶段完成

- 工程初始化方案及基础配置；
- `src/` 和 `tests/` 目录边界；
- 应用入口、路由壳和基础布局；
- `/`、`/points`、`/map/amap`、`/map/baidu`、`/map/tianditu` 空壳路由；
- PeachTools Design Token 接入层；
- 全局主题基础和最小共享 UI 原语；
- Point、Coordinate、CoordinateSystem、Source、ImportRecord 等 Domain 类型；
- PointRepository、ImportRepository、SettingsRepository 接口；
- CoordinateTransformer、TransformationGraph、AlgorithmRegistry 接口；
- 统一基础错误与结果类型；
- TypeScript、Lint、格式检查和测试基础设施；
- 最小烟雾测试、路由测试、类型/契约测试；
- 工程脚本及开发说明。

## 1.2 本阶段明确不包含

- 高德、百度、天地图 SDK、Loader 或 Adapter 实现；
- Marker、InfoWindow、fitView、聚合或海量点；
- Excel、CSV、JSON 文件解析和字段映射；
- JSON 粘贴导入；
- WGS84、GCJ02、BD09 算法迁移；
- 上海2000参数、投影或算法实现；
- CGCS2000转换或天地图坐标契约实现；
- IndexedDB schema 和 Repository 实现；
- API Key持久化；
- Point Manager表格、新增、删除、转换等完整页面功能；
- 首页完整营销内容；
- 完整主题设置功能；
- Feature业务用例；
- GIS Geometry、Layer、绘制、测量或插件框架。

## 1.3 阶段边界原则

1. **只建立契约，不填充业务实现。**
2. **Domain不依赖React、浏览器API、SDK或持久化库。**
3. **Core接口不依赖具体坐标算法库。**
4. **Repository接口不暴露IndexedDB类型。**
5. **空壳页面不读取reference、不操作存储、不加载SDK。**
6. **Design Token通过语义变量消费，不复制旧项目CSS。**
7. **不为未来可能存在的GIS能力预建大型框架。**

# 2. 开始条件

Phase 1 可以开始，但实施负责人应先记录以下选择：

| 决策项 | Phase 1最低要求 | 未决时处理 |
|-|-|-|
| Node与pnpm版本 | 固定版本并写入工程声明 | 不使用开发者机器的隐式版本 |
| React/Vite/TypeScript版本 | 选择兼容稳定版本并锁定 | 不追逐预发布版本 |
| PeachTools接入 | 明确包、Token来源和Tailwind preset是否可用 | 若包尚未提供，先建Token桥接层，不复制视觉值到组件 |
| 样式方案 | Tailwind为主、CSS Modules为局部补充、禁用Styled Components | 与PROJECT-STRUCTURE保持一致 |
| 测试方案 | Vitest + React Testing Library + jsdom | 不引入端到端工具作为Phase 1门槛 |
| Lint方案 | ESLint + TypeScript/React规则 | 规则未定时采用最小严格集，不关闭核心类型检查 |
| Point编辑范围 | 不影响基础模型，暂不创建编辑用例 | 继续保留在OPEN-QUESTIONS |
| settings存储边界 | 仅定义Repository契约，不实现介质 | 按ADR-004语义命名，不在Phase 1写localStorage |

# 3. 任务拆解

## Task 1：项目初始化

### 目标

建立可复现的 React + TypeScript + Vite + pnpm 工程配置，以及统一的开发、构建和质量检查命令。

### 输入文档

- `PROJECT-STRUCTURE.md` 第1节；
- `Coordinate-Toolkit-TASKS-V2.md` Phase 1；
- `PHASE0-BASELINE-REPORT.md` 开发前建议；
- `ADR-005-legacy-code-boundary.md`。

### 修改文件

计划创建或修改：

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml        # 仅在确定采用workspace时创建；单包项目可不创建
.npmrc                     # 只放非敏感且必要的pnpm策略
.nvmrc                     # 团队采用nvm时
.node-version              # 团队采用对应版本工具时；与.nvmrc二选一或保持一致
index.html
tsconfig.json
tsconfig.app.json
tsconfig.node.json
vite.config.ts
eslint.config.js
.prettierrc.json
.prettierignore
.gitignore
README.md
src/main.tsx
src/vite-env.d.ts
```

不得创建 `.env` 密钥，不得从reference复制 `package.json`、Vite配置或依赖集合。

### 输出结果

- 固定的Node、pnpm和核心依赖版本；
- `dev`、`build`、`preview`、`typecheck`、`lint`、`format:check`、`test`、`test:run`命令；
- 严格TypeScript配置；
- `@/`路径别名；
- 最小React挂载入口；
- README中的环境和命令说明。

### 技术要求

- 使用pnpm锁定依赖；
- TypeScript启用`strict`；
- 构建配置不得包含地图Key或平台SDK；
- 浏览器目标与PRD兼容性范围一致；
- 只安装Phase 1所需依赖；
- 不因旧项目使用某依赖而自动沿用；
- 构建和测试使用相同路径别名规则；
- 格式化和Lint职责分开，避免重复冲突规则。

### 验收标准

- 全新检出后按README可安装和启动；
- `pnpm dev`启动无运行时错误；
- `pnpm build`成功；
- `pnpm typecheck`成功；
- `pnpm lint`成功；
- `pnpm format:check`成功；
- 依赖清单中没有地图SDK、坐标算法库、文件解析库或IndexedDB封装库；
- 工程文件未从reference整体复制；
- 仓库中没有真实API Key、AK或Token。

## Task 2：基础目录创建

### 目标

建立Architecture规定的目录边界、应用装配点、基础布局和空壳路由，使后续代码有明确归属。

### 输入文档

- `PROJECT-STRUCTURE.md` 第2～5节；
- `ARCHITECTURE.md` 总体架构与依赖规则；
- `Coordinate-Toolkit-PRD-V2.md` 信息架构；
- `ADR-003-map-adapter.md`，仅用于守住地图页面边界。

### 修改文件

计划创建：

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── layouts/
│       ├── AppLayout.tsx
│       └── MapPageLayout.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── PointsPage.tsx
│   ├── maps/
│   │   ├── AMapPage.tsx
│   │   ├── BaiduMapPage.tsx
│   │   └── TiandituPage.tsx
│   └── NotFoundPage.tsx
├── components/
│   └── README.md
├── features/
│   └── README.md
├── domain/
│   └── README.md
├── core/
│   └── README.md
├── adapters/
│   └── README.md
├── config/
│   └── routes.ts
├── hooks/
│   └── README.md
├── styles/
│   └── README.md
└── utils/
    └── README.md
```

空目录不依赖提交占位文件；如需说明边界，使用简短README而不是虚构实现。

### 输出结果

- 应用壳与两类布局；
- 五个正式入口页面及NotFound页面；
- 集中的路由元数据；
- 各层职责说明；
- 页面只展示名称、阶段状态和“功能将在后续阶段实现”。

### 技术要求

- 路由表是单一事实来源；
- Map页面可复用MapPageLayout，但不得引入MapCore或SDK占位对象；
- Page只能组合布局和静态空状态；
- 不创建虚假的Feature、Repository实现或Adapter；
- 不使用`any`绕过未定义契约；
- 目录名称与PROJECT-STRUCTURE一致。

### 验收标准

- `/`显示Home空壳；
- `/points`显示Point Manager空壳；
- `/map/amap`显示高德地图空壳；
- `/map/baidu`显示百度地图空壳；
- `/map/tianditu`显示天地图空壳；
- 未知路径进入NotFound；
- 页面切换不加载外部脚本、不访问IndexedDB/localStorage；
- Page未引用`reference/`；
- 路由测试覆盖全部入口和404。

## Task 3：UI基础设施

### 目标

建立PeachTools Design Token桥接、全局基础样式、主题入口和空壳页面所需的最小UI原语，不建设完整组件库。

### 输入文档

- `DESIGN-SYSTEM.md`；
- `PROJECT-STRUCTURE.md` 样式方案；
- PRD V2页面结构；
- PeachTools正式组件包、Token或Tailwind preset说明。

### 修改文件

计划创建或修改：

```text
tailwind.config.ts             # 仅确认使用Tailwind且版本需要配置文件时
postcss.config.js              # 仅所选Tailwind版本需要时
src/styles/tokens.css
src/styles/globals.css
src/styles/theme.css
src/app/App.tsx
src/app/layouts/AppLayout.tsx
src/app/layouts/MapPageLayout.tsx
src/components/ui/AppShell.tsx
src/components/ui/PagePlaceholder.tsx
src/components/ui/index.ts
```

如果PeachTools提供正式React组件包，应优先直接消费；本阶段不复制其内部组件实现。

### 输出结果

- 颜色、文字、间距、圆角、边框、阴影和层级的语义Token入口；
- 深浅主题的CSS变量基础；
- 全局reset、字体和焦点可见性；
- AppShell与PagePlaceholder两个最小共享原语；
- Tailwind与Token的映射说明。

### 技术要求

- 组件使用`--color-surface`、`--color-text-primary`等语义Token，不硬编码品牌颜色；
- Tailwind工具类通过Design Token/preset获得值；
- CSS Modules只在局部复杂样式出现时使用，本任务不强制创建；
- 不使用Styled Components；
- 不复制map-tools的Tailwind页面类组合和旧CSS；
- 主题基础不在本阶段写localStorage；
- 空状态不能只靠颜色表达；
- 键盘焦点清晰可见；
- 本阶段只做空壳所需原语，不提前实现Button/Table/Dialog组件体系。

### 验收标准

- 空壳页面全部通过统一Token显示；
- 系统深浅主题下内容可读；
- 页面不存在散落的品牌色和尺寸魔法值；
- Tab导航能看到焦点；
- AppShell和PagePlaceholder有基础组件测试；
- 没有复制reference CSS或图片资产；
- 没有引入CSS-in-JS运行时。

## Task 4：Domain模型

### 目标

定义与React、存储和算法实现无关的领域类型，统一经纬度、投影坐标、原始坐标和转换缓存的语义。

### 输入文档

- PRD V2第11～13节；
- `ARCHITECTURE.md` 数据架构；
- `ADR-002-coordinate-system.md`；
- `ADR-004-storage-strategy.md`；
- `MIGRATION-MATRIX.md` 中Point模型M3结论；
- `OPEN-QUESTIONS.md`。

### 修改文件

计划创建：

```text
src/domain/shared/
├── result.ts
├── identifiers.ts
└── index.ts
src/domain/coordinate/
├── coordinate-system.ts
├── coordinate.ts
├── transformation.ts
├── coordinate-errors.ts
└── index.ts
src/domain/points/
├── point.ts
├── point-source.ts
├── point-errors.ts
└── index.ts
src/domain/imports/
├── import-record.ts
├── import-source.ts
├── import-status.ts
└── index.ts
src/domain/settings/
├── settings.ts
└── index.ts
```

### 输出结果

- `CoordinateSystemId`及其状态表达；
- geographic与projected两类Coordinate；
-明确的单位、轴和值；
- Point只包含`id`、`name`、`source`、`coordinates`及必要元数据；
- original Coordinate与converted cache可区分；
- Source和ImportRecord；
- 算法版本、路径签名和缓存元数据；
- 统一Domain Error与Result类型；
- 每个领域目录的Public API。

### 技术要求

- 上海2000使用projected坐标和X/Y语义；
- WGS84、GCJ02、BD09使用geographic坐标和lng/lat语义；
- CGCS2000可以表达为扩展/禁用状态，但不作为默认用户入口；
- CoordinateSystem不能只是无约束字符串；
- 原始坐标不可被转换结果覆盖；
- 缓存记录目标坐标系、算法版本/路径签名和生成时间；
- 不保存旧Point的`rawData`；
- 不在Domain里写转换、范围推断或坐标系自动识别；
- 不引入React、IndexedDB、localStorage、gcoord、proj4或地图SDK；
- 避免为尚未确认的Point编辑行为增加复杂审计模型。

### 验收标准

- Domain可在纯TypeScript环境编译；
- geographic与projected坐标不能被无提示混用；
- 上海2000能以X/Y和米表达，但没有转换实现；
- CGCS2000状态明确为非默认入口；
- Point不包含无关业务字段和SDK对象；
- original与converted在类型上职责清楚；
- 类型测试覆盖有效构造、错误构造和禁止混用场景；
- Domain源文件不导入React、浏览器API或基础设施库。

## Task 5：Repository接口

### 目标

定义业务访问点位、导入记录和产品设置的持久化端口，不实现IndexedDB或localStorage。

### 输入文档

- `ADR-004-storage-strategy.md`；
- `ARCHITECTURE.md` Storage层；
- `PROJECT-STRUCTURE.md`依赖规则；
- Task 4 Domain模型；
- `OPEN-QUESTIONS.md`中的settings边界。

### 修改文件

计划创建：

```text
src/domain/repositories/
├── point-repository.ts
├── import-repository.ts
├── settings-repository.ts
├── repository-errors.ts
├── query.ts
└── index.ts
```

如团队决定Port属于Feature/Application层，可在实施前调整为`src/core/ports/`，但只能保留一个权威位置，并同步PROJECT-STRUCTURE。

### 输出结果

- `PointRepository`；
- `ImportRepository`；
- `SettingsRepository`；
- 查询、分页/游标、排序和批量写入的最小契约；
- 结构化Repository错误；
- 原子导入所需的工作单元/事务能力描述，暂不实现；
- 内存测试替身的设计说明。

### 技术要求

- 接口只使用Domain类型；
- 不返回IDBRequest、IDBTransaction或数据库实体；
- 不暴露localStorage键；
- Point批量写入必须能表达全成或全败；
- 查询契约只包含V1已知需求，避免通用ORM式表达式；
- 删除语义明确区分单个、批量和清空；
- settings契约表达产品设置；地图凭据端口留到Storage/Settings实施阶段，不在Phase 1持久化；
- Repository错误至少区分不可用、配额、冲突、校验和未知错误；
- 不建立IndexedDB schema。

### 验收标准

- 接口编译通过并仅依赖Domain；
- 页面没有直接引用Repository；
- Repository不依赖任何浏览器存储类型；
- Point和Import的批量操作语义明确；
- 不存在“万能`save(any)`”接口；
- 契约测试或类型测试能使用内存假对象验证调用边界；
- 没有创建IndexedDB数据库或localStorage读写代码。

## Task 6：Coordinate Core接口

### 目标

定义可扩展但保持轻量的坐标转换核心契约，为Phase 2迁移M1/M2算法提供落点。

### 输入文档

- `ADR-002-coordinate-system.md`；
- `ARCHITECTURE.md` Coordinate Core；
- `MIGRATION-MATRIX.md`坐标能力；
- Task 4 Domain模型；
- Phase 0关于上海2000和CGCS2000的限制。

### 修改文件

计划创建：

```text
src/core/coordinate/
├── coordinate-transformer.ts
├── transformation-graph.ts
├── algorithm-registry.ts
├── transformation-algorithm.ts
├── transformation-request.ts
├── transformation-result.ts
├── coordinate-core-errors.ts
└── index.ts
```

### 输出结果

- `CoordinateTransformer`接口；
- `TransformationGraph`接口；
- `AlgorithmRegistry`接口；
- `TransformationAlgorithm`插件点；
- 单个和批量转换请求/结果；
- 路径、算法版本、警告和逐项失败的表达；
- 同坐标系转换、不可达路径和禁用坐标系的契约；
- 后续缓存校验所需的路径签名。

### 技术要求

- 只定义接口、DTO和错误，不实现寻路算法；
- 不注册WGS84、GCJ02、BD09实际转换；
- 不安装或调用gcoord、proj4；
- 不填写上海2000参数；
- CGCS2000只允许以Domain状态出现，不创建近似边；
- 不使用覆盖所有转换组合的大型switch；
- 不依赖React、Repository、IndexedDB或地图SDK；
- 批量结果允许部分失败，且每项能追踪输入；
- Algorithm必须声明source、target、version和可用状态；
- Graph和Registry职责分开。

### 验收标准

- 接口可以表达WGS84→GCJ02→BD09多步路径，但没有算法实现；
- 可以表达上海2000算法未启用；
- 可以表达CGCS2000无可用路径；
- 结果携带算法版本/路径签名；
- 不存在大型坐标switch；
- `src/core/coordinate`没有第三方坐标库依赖；
- 契约测试使用伪算法验证接口组合，不验证真实坐标数值。

## Task 7：测试基础设施

### 目标

建立能支撑后续迁移基线、组件测试和契约测试的统一测试环境，并让质量检查进入日常开发命令。

### 输入文档

- `PHASE0-BASELINE-REPORT.md`；
- `ADR-005-legacy-code-boundary.md`验收标准；
- Task 1工程配置；
- Task 2～6的输出契约。

### 修改文件

计划创建或修改：

```text
vite.config.ts                 # 或独立vitest.config.ts
src/test/setup.ts
src/test/render.tsx
tests/smoke/app.test.tsx
tests/routes/routes.test.tsx
tests/domain/coordinate-types.test.ts
tests/domain/point.test.ts
tests/contracts/repositories.test.ts
tests/contracts/coordinate-core.test.ts
tests/architecture/dependency-boundaries.test.ts
tests/fixtures/README.md
package.json
README.md
```

Phase 0旧能力金样本可以建立目录和说明，但本阶段不迁移真实算法，也不伪造精度样本。

### 输出结果

- Vitest；
- React Testing Library；
- jsdom环境；
- 统一render helper；
- 路由与空壳烟雾测试；
- Domain和Core契约测试；
- Repository测试替身；
- 依赖边界检查；
- 覆盖率输出配置和最小门槛策略；
- CI可直接调用的非交互测试命令。

### 技术要求

- `pnpm test`用于开发监听；
- `pnpm test:run`一次性运行并返回正确退出码；
- 测试不访问网络、不加载地图SDK；
- 测试不读取或执行reference源码；
- 不用快照替代关键语义断言；
- 架构测试至少检查Domain不导入React/Adapter、Page不直接导入存储实现；
- Phase 1覆盖率重点约束Domain/Core契约和基础组件，不追求无意义100%；
- 测试fixture不包含真实密钥或未经确认的上海2000金样本。

### 验收标准

- 测试框架可独立运行；
- App烟雾测试通过；
- 五个入口路由和404测试通过；
- Domain类型/不变量测试通过；
- Repository和Coordinate Core契约测试通过；
- 依赖边界测试通过；
- 测试期间无外部网络请求；
- `pnpm test:run`可用于后续CI；
- 失败测试返回非零退出码。

# 4. 依赖顺序

## 4.1 主依赖链

```text
Task 1 项目初始化
    ↓
Task 2 基础目录与路由壳
    ├──────────────→ Task 3 UI基础设施
    ↓
Task 4 Domain模型
    ├──────────────→ Task 5 Repository接口
    └──────────────→ Task 6 Coordinate Core接口
                         ↓
Task 7 测试基础设施与总验收
```

Task 7的配置部分可在Task 1之后提前开始，但完整契约测试必须等待Task 2～6。

## 4.2 必须串行的依赖

| 后置任务 | 必须等待 | 原因 |
|-|-|-|
| Task 2 | Task 1 | 路由和目录依赖可编译工程、别名与React入口 |
| Task 3 | Task 1，建议等待Task 2布局 | Token需要工程样式链，AppShell需要布局消费 |
| Task 4 | Task 1 | Domain需要严格TS配置和模块边界 |
| Task 5 | Task 4 | Repository方法必须引用稳定Domain类型 |
| Task 6 | Task 4 | Core请求和结果必须引用Coordinate Domain |
| Task 7完整验收 | Task 2～6 | 需要对路由、UI、Domain和接口执行测试 |

## 4.3 可以并行的工作

- Task 3和Task 4可在Task 2基础布局确定后并行；
- Task 5和Task 6可在Task 4合并后并行；
- 测试配置可与Task 2并行，具体契约测试随对应任务提交；
- README和边界说明应随任务更新，不集中到最后补写。

## 4.4 后续阶段依赖

Phase 1只提供以下后续入口：

```text
Domain
  ↓
Repository Interface ──→ Phase 3 Storage Adapter

Domain
  ↓
Coordinate Core Interface ──→ Phase 2 Algorithm Migration

Route Shell + UI Infrastructure
  ↓
Feature Use Cases
  ↓
Point Manager / Map Pages
```

Feature不得在Domain和对应Port稳定前直接绕过接口开发。

# 5. 第一次开发验收标准

## 5.1 可运行性

完成后：

- 项目可以按README安装和启动；
- 开发服务器能稳定打开；
- 生产构建能够生成静态资源；
- 浏览器控制台没有初始化错误；
- 页面刷新和直接访问子路由的部署策略有说明。

## 5.2 可访问路由

以下地址可访问，但只显示统一空壳：

| 路由 | 页面 |
|-|-|
| `/` | Home |
| `/points` | Point Manager |
| `/map/amap` | 高德地图 |
| `/map/baidu` | 百度地图 |
| `/map/tianditu` | 天地图 |
| 其他 | Not Found |

地图空壳明确提示“SDK将在后续阶段接入”，不得尝试读取Key或加载脚本。

## 5.3 工程质量

以下命令全部通过：

```text
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
```

## 5.4 架构质量

- Domain不依赖React、Adapter、Repository实现或浏览器API；
- Core不依赖React、地图SDK、具体算法库或存储；
- Repository只有接口，没有IndexedDB/localStorage实现；
- Page没有直接操作存储；
- 页面和运行时代码不依赖`reference/`；
- Public API明确，不通过跨目录深层路径耦合模块；
- 没有万能`utils`或`common`承载未分类业务逻辑。

## 5.5 类型契约

- Point、Coordinate、Source、ImportRecord可被类型安全地表达；
- geographic与projected坐标语义可区分；
- original与converted cache职责明确；
- 上海2000能表达“目标正式支持但当前待验证/禁用”；
- CGCS2000能表达扩展状态但不出现在默认页面入口；
- Repository错误和Core错误结构化；
- Algorithm Registry和TransformationGraph接口独立。

## 5.6 UI基础

- 空壳页面使用PeachTools语义Token；
- 深浅主题基础可读；
- 键盘焦点可见；
- 不复制旧页面、旧CSS和旧图片资产；
- 不提前建设完整后台组件库。

## 5.7 范围检查

代码和依赖中不得出现：

- 高德、百度、天地图SDK调用；
- gcoord、proj4或上海2000投影参数；
- SheetJS、CSV/JSON业务Parser；
- IndexedDB schema或数据库初始化；
- Marker/InfoWindow实现；
- Point业务CRUD；
- 坐标转换真实结果；
- GIS Geometry、Layer、绘制、测量、插件系统。

# 6. 风险提醒

## 6.1 复制reference代码

**风险：** 为快速启动而复制map-tools的页面、Hook、CSS、Vite配置或gisviewer-react的大型地图容器。

**后果：** 旧耦合进入新工程，ADR-005失效。

**约束：**

- Phase 1代码不得从`reference/`导入；
- 不复制旧`src`、页面、状态管理和CSS；
- 工程依赖根据V2需要选择，而不是照搬旧`package.json`；
- 架构审查检查相似目录和大段同源代码。

## 6.2 提前实现上海2000

**风险：** 因Domain需要表达上海2000，就顺手加入proj4参数或转换函数。

**后果：** 未验证参数产生看似正常但错误的坐标，并固化缓存格式。

**约束：**

- Phase 1只定义projected Coordinate和坐标系状态；
- 不安装proj4；
- 不录入中央经线、假东/北、EPSG或WKT；
- 测试只验证状态和类型，不验证上海2000数值；
- 算法实现等待Phase 2验证门槛。

## 6.3 提前设计大型GIS框架

**风险：** 从gisviewer-react迁入Geometry、Layer、Widget、绘制、测量、三维或插件抽象。

**后果：** 核心契约变重，产品偏离“点位坐标转换与地图验证工作台”。

**约束：**

- Phase 1不创建`core/map`实现；
- 不定义通用Geometry和Layer模型；
- 不创建插件系统、事件总线或Widget Manager；
- Map Adapter接口按ADR-003留到对应阶段，以V1实际能力为上限。

## 6.4 契约过度设计

**风险：** Repository演变成通用ORM，Coordinate Core为未知坐标系加入复杂插件生命周期。

**约束：**

- 接口只覆盖PRD V1已知用例；
- 一个接口字段必须有明确消费方；
- 未确定需求写入OPEN-QUESTIONS，不通过抽象“预留”解决；
- 使用简单TypeScript接口和判别联合，不引入DI框架。

## 6.5 空壳被误认为功能完成

**风险：** 路由可访问后，进度被报告为首页、Point Manager或地图页面已完成。

**约束：**

- 页面持续显示“Phase 1空壳”状态；
- 验收报告使用“路由壳完成”，不用“页面完成”；
- 不放置无行为的业务按钮；
- 后续Phase按真实用例重新验收。

## 6.6 Design Token来源未确认

**风险：** PeachTools包尚未确认时自行发明一套永久Token。

**约束：**

- 先建语义桥接层；
- 临时回退值集中管理并标注来源/替换条件；
- 组件不得直接依赖临时原始色值；
- 正式包确认后只替换桥接层。

## 6.7 测试制造虚假基线

**风险：** 为让测试通过而编造上海2000样本，或把reference已有测试文件视为已验证。

**约束：**

- Phase 1不声明坐标精度已验证；
- 真实金样本必须记录来源和容差；
- 伪算法只用于验证Core接口组合，并明确命名为fake；
- 不执行reference源码作为新项目运行时依赖。

# 7. 实施批次建议

## Batch A：可启动骨架

- Task 1；
- Task 2；
- Task 7的基础测试配置与App烟雾测试。

退出条件：项目能启动、构建，五个路由可访问。

## Batch B：UI与Domain基础

- Task 3；
- Task 4；
- 对应组件和类型测试。

退出条件：空壳使用统一Token，领域模型在纯TypeScript环境成立。

## Batch C：核心Port

- Task 5；
- Task 6；
- Repository和Coordinate Core契约测试；
- 架构依赖检查。

退出条件：后续Storage和算法迁移都有稳定入口，但尚无业务实现。

## Batch D：Phase 1总验收

- 执行全部质量命令；
- 对照范围负面清单；
- 更新README；
- 记录未关闭问题；
- 形成Phase 1验收记录。

# 8. Definition of Done

Phase 1只有在以下条件全部满足时完成：

1. Task 1～7各自验收通过；
2. 五个正式路由和404可访问；
3. build、typecheck、lint、format check和test全部通过；
4. PeachTools Token桥接和基础主题可用；
5. Domain、Repository和Coordinate Core契约通过评审；
6. 依赖边界由自动检查或明确测试保护；
7. 没有地图SDK、文件导入、真实坐标算法、IndexedDB实现或完整业务页面；
8. 没有复制或运行时依赖reference代码；
9. README能让新开发者复现环境；
10. 未关闭问题被记录并分配到后续阶段，不被临时实现掩盖。

# 9. Phase 1之后

Phase 1结束不直接代表进入地图页面开发。推荐后续顺序：

1. 评审Phase 1契约；
2. 按正式执行计划推进Coordinate算法迁移和Storage Adapter；
3. 完成文件Parser边界；
4. 建立Feature用例；
5. 实现Point Manager；
6. 再进入Map Adapter和三个地图页面。

任何后续实现如发现Phase 1契约不足，应先更新契约和决策，不在Page中绕过边界。

