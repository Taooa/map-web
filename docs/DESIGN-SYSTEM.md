# PeachTools Design System

> 文档用途：Coordinate Toolkit V2 的产品视觉与交互基线  
> 来源：`reference/map-tools/docs/Design.md`  
> 整理日期：2026-07-28  
> 状态：V2 设计约束

## 1. 设计目标

Coordinate Toolkit 是浏览器里的专业地图工具，不是企业后台，也不是通用 GIS 平台。界面需要同时满足：

- 专业：信息准确、状态可信、坐标和地图语义清楚；
- 简洁：用户始终知道下一步要做什么；
- 一致：相同操作、状态和组件在所有页面保持一致；
- 工具感：高效、紧凑，但不过度堆叠功能；
- 本地优先：明确告知点位和地图凭据保存在当前浏览器。

## 2. 设计原则

### 2.1 Professional

- 坐标系名称、坐标数值和错误原因必须明确；
- 不使用“智能识别”等无法可靠保证的表达；
- 转换结果和原始坐标在视觉上清楚区分；
- 地图平台所需坐标系应可见但不过度打扰；
- 失败时提供原因和下一步操作。

### 2.2 Minimal

- 每个页面围绕一个主任务；
- 默认不展开全部坐标；
- 高级设置按需展开；
- 地图页面只保留点位选择、地图设置和验证必需信息；
- 不用统计卡、图表或装饰性地图功能制造“后台感”。

### 2.3 Consistency

- 全部页面使用同一套颜色、间距、圆角、表单和反馈组件；
- 新增、导入、转换、删除等动作保持相同语义和按钮层级；
- WGS84、GCJ02、BD09、上海2000使用固定标签名称；
- 加载、空状态、错误和部分成功使用统一模式；
- 高德、百度、天地图页面保持相同侧栏结构。

### 2.4 Developer First

- 设计 Token 语义化；
- 组件 API 简单、可组合；
- 平台差异通过能力配置处理；
- 不在页面散落硬编码颜色、尺寸和状态文案；
- 组件状态和验收标准可测试。

## 3. 主题系统

### 3.1 深色主题

参考基础色：

| 语义 | 参考色 |
| --- | --- |
| Canvas | `#071018` |
| Surface | `#0B1621` |
| Elevated Surface | `#10202D` |
| Primary Text | `#F3F8FC` |
| Secondary Text | `#9DAEBC` |
| Primary Accent | `#00D6C9` |
| Information | `#38BDF8` |
| Action | `#367BFF` |
| Highlight | `#7A5CFF` |

### 3.2 浅色主题

参考基础色：

| 语义 | 参考色 |
| --- | --- |
| Canvas | `#F5F9FC` |
| Surface | `#FFFFFF` |
| Subtle Surface | `#F8FBFD` |
| Border | `#D8E5ED` |
| Primary Text | `#132635` |
| Secondary Text | `#526A7A` |
| Primary Accent | `#22D3EE` |
| Information | `#38BDF8` |
| Action | `#60A5FA` |
| Highlight | `#A78BFA` |

### 3.3 Token 使用

实际实现使用语义 Token，不直接以色值命名：

```text
color.background.canvas
color.background.surface
color.background.elevated
color.text.primary
color.text.secondary
color.border.default
color.action.primary
color.status.success
color.status.warning
color.status.danger
color.coordinate.wgs84
color.coordinate.gcj02
color.coordinate.bd09
color.coordinate.shanghai2000
```

地图本身色彩复杂，地图侧栏和浮层应使用稳定、低干扰的中性色背景。

## 4. 字体与数字

- 正文优先使用系统无衬线字体；
- 坐标、行数、文件大小使用等宽数字特性；
- 坐标详情可使用等宽字体；
- 页面标题、区块标题和表格正文建立清晰层级；
- 不用过小字号承载关键错误或坐标信息；
- 存储精度与展示精度分离，UI 格式化不得修改原值。

## 5. 布局

### 5.1 首页

- 内容型页面；
- Hero、功能介绍、流程、工具入口、平台资源依次排列；
- 不使用后台侧栏；
- 主 CTA 指向 Point Manager。

### 5.2 Point Manager

- 现代数据工作台；
- Header 提供“新增点位”“导入”；
- Toolbar 提供搜索和批量操作；
- Table 占据主区域；
- 详情使用 Drawer；
- 新增、转换、删除使用 Dialog；
- 导入使用分步 Dialog 或大尺寸 Drawer。

### 5.3 地图页面

- 左侧固定 Sidebar，右侧地图；
- Sidebar 可在小屏收起；
- 地图设置入口常驻；
- 未配置 Key 时使用设置引导替代地图；
- 地图错误层不能遮蔽设置和返回入口。

## 6. 间距、圆角与层级

- 使用统一的 4px 或 8px 间距基线；
- 表单字段组、Toolbar 和卡片保持稳定节奏；
- 小组件使用中等圆角，Dialog/Drawer 可使用更大圆角；
- 阴影仅用于浮层、菜单和临时层级；
- 表格主要依赖边框和背景层级，不依赖重阴影；
- 地图上的浮层控制数量，避免遮挡点位。

## 7. 核心组件

### 7.1 Button

- Primary：页面当前主操作；
- Secondary：同级辅助操作；
- Tertiary/Ghost：低频或导航操作；
- Danger：删除；
- 加载时禁止重复提交；
- 图标按钮必须有可访问名称。

### 7.2 Form Field

- 标签常驻，不以 placeholder 替代；
- 必填项和单位明确；
- 错误显示在字段附近；
- 坐标系默认 WGS84；
- 经度/纬度与 X/Y 根据坐标系调整标签。

### 7.3 Coordinate Badge

- 展示坐标系名称；
- 颜色只是辅助，必须保留文字；
- 原始坐标增加“原始”标记；
- 转换状态可展示“已生成”或未生成，不显示伪成功。

### 7.4 Table

- 默认列：选择、名称、来源、坐标状态、操作；
- 不默认铺开全部坐标；
- 支持分页或虚拟化；
- 批量操作只作用于明确选择；
- 空状态和无搜索结果分别设计。

### 7.5 Dialog / Drawer

- Dialog：新增、转换、确认删除、地图设置；
- Drawer：点位详情；
- 大尺寸分步 Dialog/Drawer：文件导入；
- 关闭前保留失败表单内容；
- 危险操作说明影响范围。

### 7.6 Toast / Inline Feedback

- Toast 用于短暂成功反馈；
- Inline Alert 用于需要用户处理的问题；
- 批量操作展示成功、失败、跳过数量；
- 失败不得只写“操作失败”。

## 8. 状态设计

每个核心页面必须覆盖：

- Loading；
- Empty；
- No search result；
- Error；
- Partial success；
- Disabled；
- Offline/SDK unavailable（地图页）；
- Missing credential（地图页）。

地图无 Key 状态：

1. 不加载 SDK；
2. 说明需要配置哪一种凭据；
3. 提供“打开地图设置”；
4. 说明凭据保存在当前浏览器。

## 9. 可访问性

- 键盘可完成表单、表格选择和 Dialog 操作；
- 焦点进入/离开弹窗时正确管理；
- 所有输入有 label；
- 状态不能只靠颜色；
- 文本和背景满足可读对比度；
- 地图不是点位信息的唯一呈现方式，Sidebar 保留点位列表；
- 动画尊重 reduced-motion 设置。

## 10. 响应式策略

- 桌面端是 V1 主要工作环境；
- Point Manager 小屏可横向滚动表格或切换紧凑列表；
- 地图 Sidebar 在小屏变为 Drawer；
- 关键新增、导入、设置操作始终可访问；
- 不为移动端压缩掉坐标系、错误或隐私说明。

## 11. 文案规范

- 产品名统一：`Coordinate Toolkit`；
- 工作台标题统一：`Point Manager`；
- 操作使用动词：新增点位、导入点位、转换坐标、地图查看；
- 不使用“智能识别坐标系”；
- 不将解析失败称为异常点；
- “删除”明确不可撤销；
- 地图凭据名称准确：高德 Key、百度 AK、天地图 Token。

## 12. V1 设计验收

- 首页看起来是 PeachTools 产品入口，不是后台首页；
- Point Manager 在一个页面完成点位主要操作；
- 三个地图页结构一致，平台差异清楚；
- 原始坐标和转换坐标不会混淆；
- 无 Key、加载失败、部分转换失败均有完整状态；
- 未出现 V1 排除功能入口；
- 浅色/深色主题使用语义 Token；
- 关键流程可通过键盘完成。

