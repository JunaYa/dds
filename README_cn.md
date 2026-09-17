# DDS · 日日记

面向 desktop、iOS 和 Android 的本地记事应用，使用 Tauri 2、React 19、TypeScript，以及项目现有的 `@vita/ui` 组件和共享样式。

正式主入口已经接入记事工作台：自定义记录类型、循环任务、图片识别创建事件、文本与媒体附件、胎动计数、饮水与自定义统计看板。记录和附件保存在设备本地，重启后保留。

## 开发

```sh
pnpm install
pnpm dev                  # 浏览器正式应用
pnpm dev:journal          # 带演示数据的 example
pnpm dev:desktop          # 桌面原生应用
pnpm init:ios
pnpm dev:ios
pnpm init:android
pnpm dev:android
```

iOS 和 Android 需要对应 SDK、工具链和真机签名配置。详细说明见[三端开发与构建](docs/journal-platforms.md)。

## 检查

```sh
pnpm typecheck
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## 代码结构

功能实现在 `src/features/journal/`；`src/App.tsx` 使用空白正式数据库，`examples/journal/main.tsx` 使用独立的演示数据库。两者复用同一套功能和样式，原有 example 数据继续保留。

[示例说明](examples/journal/README.md)包含组合模型和操作流程。[设计系统迁移说明](docs/design-system-migration.md)记录共享组件来源。旧任务面板保留在 `src/TaskApp.tsx`；`proto/` 中的独立原型不参与应用构建。

当前没有云同步或完整备份恢复；提醒只在应用内展示，尚未接入关闭应用后的系统通知。OCR 首次使用需要下载引擎和语言包，图片在本机处理。应用商店发布签名、真机拍照和后台生命周期需要另行验收。
