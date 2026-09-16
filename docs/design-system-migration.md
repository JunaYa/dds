# React 与设计系统迁移

上游：[streamify-one/streamify-one-design-system](https://github.com/streamify-one/streamify-one-design-system/tree/main/packages)

导入版本：`87ac6b8f9ac11407a60b1f759ea2efd2ac886364`（2026-09-16）。本项目保留本地源码快照，安装和构建不需要访问上游私有仓库。

## 包边界

- `packages/ui`：上游完整 UI 源码、子路径导出、stories 和组件测试。
- `packages/tokens`：完整 CSS tokens 和历史 reference。`src/*.css` 为权威来源；reference 生成器已经过时，不应运行它覆盖 CSS。
- `packages/styles`：Tailwind 4 baseline、字体栈、工具样式和 tokens 入口。
- `packages/iconography`、`packages/brand`：UI 的必要传递依赖。

通过 pnpm workspace 引用，保留 `@vita/*` 包名。应用从 `@vita/ui/button` 等子路径导入组件，`src/styles.css` 统一导入 `@vita/styles/base.css`。主应用使用 React 19、TypeScript、Vite；Tauri 2 的命令接口保持兼容。

未导入上游产品应用、domain-ui、editor、product-shell、服务端 SDK 或 Vite+ 工具链。现有 `proto/` 是用户未提交的独立 Vue 原型，本次未修改；主应用不依赖它们。

## 本地适配

包清单将上游 catalog 依赖解析为实际版本，并移除上游专用开发工具配置。生产组件和 tokens 保留原样。测试的 `vite-plus/test` 导入改为 `vitest`，styles 测试改为验证 DDS 入口；Tailwind source 扫描移除未导入的产品包路径。完整 UI 生产源码纳入 TypeScript 检查，stories 保留作参考，不引入 Storybook 构建。

字体保留上游字体栈；和上游 desktop 一样，本次没有附带字体文件，未安装字体时使用系统后备字体。深色主题跟随系统设置，由主入口同步根节点 `.dark` 类。Tauri 透明窗口只在外层保持透明，面板使用语义颜色 tokens。

## 验证

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`：上游组件、图标、tokens，以及 DDS 新增、完成、错误重试工作流。
- `pnpm build`
- `pnpm tauri dev`：验证托盘窗口和 Rust 命令。

浏览器直接运行时没有 Tauri IPC，会显示加载错误；不会把模拟数据冒充为桌面任务。自动化测试仅模拟 IPC 边界，其余组件与状态更新使用真实实现。

## 桌面端兼容修复

验证时发现原有 Rust `complete_task` 会移动借用中的任务，导致编译失败。改为借用 ID 比较、原地更新任务，添加 Rust 回归测试。

旧版 Tao 0.31.1 在 macOS 的无边框窗口上处理 `maximizable: false` 时会解引用不存在的缩放按钮并崩溃。本次移除该显式配置；窗口仍然无边框且 `resizable: false`，不显示最大化按钮。

## 本次验证结果

- 前端完整类型检查与生产构建通过。
- 11 个测试文件、65 项测试通过；Rust 两项回归测试通过。
- `pnpm install --frozen-lockfile` 通过。
- `pnpm tauri build --debug --bundles app` 通过，生成 `src-tauri/target/debug/bundle/macos/dds.app`。
- 430×240 和 360×640 浏览器布局已检查；真实 Tauri 进程已成功启动。原生窗口的点击操作验证因系统辅助功能和屏幕录制权限未就绪而未完成。
- Rust 仍有原有的未使用代码和命名警告；未扩展为无关清理。
- UI 共保留 82 个导出子路径；UI、tokens、iconography、brand 的生产源码与记录的上游提交一致。

代码检查按本项目要求在主任务内串行完成，覆盖正确性、失败重试、前端异步状态、依赖边界和测试；没有独立子代理或外部模型复核。简化检查未发现值得引入新抽象的重复代码。
