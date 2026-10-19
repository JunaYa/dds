# 项目规则

本规则适用于 DDS / Little days。界面服务于快速记录、核对历史和恢复数据；手机支持单手输入，桌面支持键盘和宽屏布局。
本项目使用 Tauri 2、React 19 DOM、TypeScript、Vite 和 Tailwind CSS v4，各平台界面均为 HTML/CSS。

## 阅读与查找顺序

1. 修改前阅读 [AGENTS.md](AGENTS.md) 和本文件；UI 改动还须阅读 [界面约束](docs/conventions/design.md)。
2. 查 `packages/ui/package.json` 公共导出、对应实现及使用位置，再查 `packages/iconography`。已有能力优先复用或扩展。
3. 业务交互查 `src/features/little-days/`；产品意图见 [产品定义](docs/product-definition.md)，入口决策见 [正式入口决策](docs/decisions/little-days-production.md)。产品目标不等于已实现能力，以代码及验证结果为准。
4. 包来源、token 权威文件与迁移边界见 [设计系统迁移](docs/design-system-migration.md)；平台改动另查 `docs/` 对应文档及 `src-tauri/` 实现。
5. 现有组件和平台能力无法覆盖需求时才引入依赖，说明用途、替代方案和代价，核对浏览器及 Tauri WebView 兼容性。

## 组件边界

- `src/` 通过 `@vita/ui/...` 公共导出组合界面；禁止导入包内部源码、直接导入 Base UI / Radix 原语或另写原生 `button`、`input`、`textarea`、`select`、`dialog`。
- 使用共享 Button、Input、Textarea、Select / NativeSelect、DateTimePicker、Dialog、AlertDialog、Sheet 等。文件、radio、range 输入使用 `@vita/ui/input` 的 NativeInput；原生 option 列表使用 NativeSelect。
- 领域无关组件及样式、行为测试放入 `packages/ui` 并添加公共导出。标签、语言、数据、回调由调用方配置，不能导入应用状态。
- 业务表单、档案、记录逻辑及领域布局保留在 feature 中。`form`、`label`、`section` 等语义布局不要求包装组件。
- 图标先查 `packages/iconography` 和 `@vita/ui/icons`；沿用所在功能的图标家族，不为单个图标另装一套库。

## 样式与设计

- 样式入口为 `src/styles.css`，共享基线由 `@vita/styles/base.css` 引入，包含 Tailwind、tokens 和公共包扫描。不要重复建立主题和 Tailwind 配置。
- 新增颜色使用语义 token，通用颜色、字号、圆角、阴影在 token 层定义。现有业务 CSS 可保留，新改动逐步对齐，不能将历史硬编码当成新规范。
- Tailwind 类与 feature CSS 均可用于静态样式；动态尺寸、坐标和 CSS 自定义属性可用 React `style`。
- 类合并使用 `@vita/ui/lib/utils` 的 `cn()`；组件变体以源码类型为准，不凭上游经验发明名称。
- 手机触控目标、字体、导航、弹层、动效和平台降级遵守 [界面约束](docs/conventions/design.md)。

## 工程约束

- 包管理器为 pnpm，依赖由 `pnpm-lock.yaml` 与 workspace 管理；版本和脚本以 `package.json` 为准。
- 路径别名为 `~/*` → `src/*`，没有原项目的 `@/*` 根目录别名。
- `src/App.tsx` 指向 `src/features/little-days/App.tsx`；不要擅自将历史 Task、Journal、Collage 功能恢复为正式入口。
- Tauri Rust、平台配置及权限在 `src-tauri/`；平台 API 先复用已有封装，浏览器显式处理不可用能力，不能将失败或模拟结果显示为成功。
- 不沿用 Expo Router、NativeWind interop、SecureStore、Expo prebuild、OTA fingerprint 或原项目 SDK 约束；新平台能力基于当前 Tauri 插件、Rust 命令和权限实现。
- React hooks 使用 `useXxx` 命名并遵守调用规则，依赖数组反映实际读取值。不用 `as any`、忽略检查或吞掉异常掩盖问题。
- 保存失败保留输入并允许重试，提交中防止重复操作。迁移 UI 时保留提交、校验、焦点、ref、键盘/触控、语言切换和本地日期时间语义。
- 数据与平台改动遵守对应 feature 现有持久化、备份、同步和权限边界；界面调整不能改变记录归属、单位、标识或计时恢复行为。

## 验证

- UI 改动运行 `pnpm check:ui`、`pnpm typecheck` 和相关测试；共享控件改动覆盖行为测试及受影响业务流程。
- `pnpm test` 为完整测试入口；`pnpm build` 执行类型检查和 Vite 生产构建。按改动范围选择验证；文档修改核对路径、导出和规则一致性。
- Rust 改动在 `src-tauri/` 运行相关 `cargo test`；桥接、键盘、安全区、文件和原生交互在对应平台验证，浏览器或 jsdom 测试不能替代真机验收。
- 说明实际执行的检查及未验证平台，不能将计划中的能力或规则描述为已经实现。
