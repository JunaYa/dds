# 日日记平台开发

主应用入口为 `/`，演示入口为 `/examples/journal/`。两者共用 `src/features/journal/`，统一使用 `@vita/ui`、`@vita/styles` 和 `@vita/tokens`。原任务面板保留在 `src/TaskApp.tsx`，不再作为启动页。

## 开发与构建

```sh
pnpm install
pnpm dev                 # 浏览器中的正式应用
pnpm dev:journal         # 带演示数据的 example
pnpm dev:desktop        # macOS / Windows / Linux 原生窗口
pnpm build:desktop      # 当前桌面平台安装包
```

各平台工具链参见 [Tauri 环境准备](https://v2.tauri.app/start/prerequisites/)。桌面托盘代码及依赖只在桌面目标编译，手机启动使用同一套记事页面。

### iOS

需要 macOS、Xcode、CocoaPods 和对应 Rust target。项目最低 iOS 版本为 16.4，以满足共享设计系统的 WebKit 要求。

```sh
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
pnpm init:ios
pnpm dev:ios
pnpm build:ios:sim
```

模拟器产物位于 `src-tauri/gen/apple/build/arm64-sim/dds.app`。`build:ios:sim` 会先移除上一次生成的模拟器安装包，解决 Tauri 无签名导出无法覆盖已有目录的问题，不影响已安装应用的数据。真机和发布包需要开发者自己的签名团队，可设置 `APPLE_DEVELOPMENT_TEAM` 后运行 `pnpm build:ios`。仓库不包含个人签名团队或证书。

`src-tauri/Info.plist` 提供相机、照片和麦克风使用说明；构建时合并进应用。相机由系统选择器打开，模拟器不提供真实摄像头。`gen/apple/project.yml` 是原生工程定义，修改后使用 XcodeGen 重新生成工程。

#### 原生 Liquid Glass 导航

iOS 工程需要 Xcode 26 或更新版本编译；应用最低系统版本仍为 iOS 16.4。

- iOS 26 及以上的窄屏界面使用原生 `UIGlassEffect(.regular)` 底部导航。四项按钮使用 UIKit 和 SF Symbols，支持系统明暗外观、选中状态、辅助功能标签和长按大内容预览。
- `src-tauri/plugins/native-navigation/` 是本地 Tauri Swift 插件，不依赖修改生成的 Xcode 工程。插件仅在 iOS 编译，权限仅授予本地主窗口的 attach / update / detach 命令。
- React 页面和数据库继续共用。原生点击通过 Tauri Channel 切换页面；网页搜索等操作也会同步原生选中状态。打开弹窗或系统键盘时隐藏导航，关闭后恢复。
- 宽度超过 720 px 时使用现有侧栏；iOS 16.4–18、浏览器、Android 和 desktop 保留 Web 导航。仅在原生接入成功后隐藏窄屏 Web 导航，接入失败时保留可操作的页面。
- 每次挂载分配会话 ID，过期更新和卸载不会移除新会话的导航；卸载时移除视图和键盘监听。

运行 `pnpm build:ios:sim` 后，选择 iOS 26 或更新的模拟器查看材质。旧版 iOS 无法显示系统 Liquid Glass。

### Android

需要 JDK 17、Android SDK（平台、构建工具、platform-tools）、NDK 和 Rust target。SDK 许可由开发者接受。

```sh
# 使用本机安装位置，不要把个人路径提交到仓库
export JAVA_HOME="<JDK 17 的安装目录>"
export ANDROID_HOME="<Android SDK 的安装目录>"
export NDK_HOME="$ANDROID_HOME/ndk/<已安装的 NDK 版本>"
rustup target add aarch64-linux-android
pnpm init:android
pnpm dev:android
pnpm build:android --debug --target aarch64 --apk
```

`init:android` 调用 Tauri 生成 Gradle 工程，并添加拍照 intent 的可见性声明。此初始化脚本可重复执行；拍照借助系统相机，不请求整个相册或外部存储的读取权限。原生工程位于 `src-tauri/gen/android`，APK 位于该目录的 `app/build/outputs/apk` 下。最低 Android API 为 24，设备还需支持共享 UI 所用现代 CSS 的更新版 Android System WebView。

## 手机交互

- 720 px 以下使用四项底部导航，内容为单列；平板和桌面使用侧栏及多列看板。
- 适配顶部刘海、底部手势区和横屏安全区。表单根据 Visual Viewport 响应软键盘，触控按钮至少 44 px，文本输入至少 16 px。
- 上传使用系统文件选择器，拍照使用 `capture="environment"`；桌面使用摄像头预览。拒绝相机权限时仍可上传。
- 图片、音频和视频保留原文件并支持预览。原生端附件导出调用系统保存对话框，仅写入用户选定的位置；浏览器端使用下载链接。

## 数据与边界

- 正式库 `dds-journal` 首次打开时没有演示记录，也不会自动启动循环任务；保留六种内置类型。示例库 `dds-journal-example` 沿用原有 example 数据。
- IndexedDB 在各平台 WebView 的本地存储中保存记录和附件，重启应用后保留；它不是云同步。不同平台、浏览器和站点端口之间的数据相互独立。卸载应用或清理应用数据会移除本地记录。
- 同一次记录与附件写入使用事务，失败后保留草稿。多窗口通过 BroadcastChannel 刷新。
- OCR 在设备本地处理图片；首次需要联网下载引擎和中英文语言包。识别后仍需核对日期、时间和地点；失败时可以直接保存图片。
- 循环计划和事件提醒目前在应用内展示，尚未实现关闭应用后的系统通知和后台提醒。
- 尚未实现跨设备同步、完整备份恢复、旧 Vue 原型数据迁移；原型目录不参与应用构建。

## 验证命令

```sh
pnpm typecheck
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
pnpm build:desktop --debug --bundles app # macOS
pnpm build:ios:sim
pnpm build:android --debug --target aarch64 --apk
```

本地调试构建空间有限时可设置 `CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0`，减少符号与增量编译缓存。相机权限、视频录制和后台生命周期仍需在 iOS / Android 真机验收。

### 本次验证（2026-09-17）

| 平台 | 已验证 | 尚未验证 |
| --- | --- | --- |
| 共用前端 | 类型检查、90 项自动测试（含原生导航同步、降级与卸载）、正式与演示库隔离、390 px 布局 | 跨设备同步未实现 |
| macOS arm64 | 原生 .app 构建与启动、真实 OCR、系统保存器导出及原图字节比对、2 项 Rust 测试 | 摄像头实拍 |
| iOS 26.2 模拟器 | 原生 Liquid Glass 四项导航、双向页面同步、弹窗及键盘显隐、明暗外观、横竖屏安全区 | 真机表现与 VoiceOver 完整流程 |
| iOS 18.1 模拟器 | 同一安装包降级到 Web 导航、冷启动恢复记录、真实 OCR 创建事件、长详情滚动、系统文件导出 | 真机相机与签名发布 |
| Android | 共用应用代码、平台配置与初始化脚本 | SDK 许可待确认，NDK 未安装；尚未生成原生工程或 APK |
| Windows / Linux | 共用桌面配置及平台条件编译 | 本机未构建或运行 |
