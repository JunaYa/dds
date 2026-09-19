# Little days

面向 0–6 岁儿童的本地日常照护记录应用，使用 Tauri 2、React、TypeScript 和 Vita 设计系统。桌面、iOS、Android 共用 `/` 正式入口。

支持儿童档案、喂养、排便/换尿布、睡眠、洗澡、疫苗、成长、维生素记录；自定义记录可组合计时、计数、测量、选项、文本、日期字段；支持家庭用品库存与补货阈值。

```sh
pnpm install
pnpm dev
pnpm dev:desktop
pnpm dev:ios 'iPhone 17 Pro'
pnpm dev:android
```

首次使用原生平台需要安装 SDK 并执行 `pnpm init:ios` 或 `pnpm init:android`。所有平台直接打开正式入口，不再使用 examples 或原型 URL。

Android 真机所需的 SDK 路径、独立 APK 构建与 USB 安装步骤见 [Android 真机开发](docs/android-device.md)。

```sh
pnpm typecheck
pnpm test
pnpm build
```

正式代码位于 `src/features/little-days/`。新安装从空档案开始，记录、类型、库存和计时状态保存在设备本地，重启可恢复。没有云同步；清除应用数据或卸载会丢失记录。旧 Journal/Collage 数据不会自动迁移或删除。

examples 已移除；旧功能源码与无关原型保留历史开发内容，不接入正式构建入口。小组件、Live Activities、后台通知、数据导入导出和商店发布配置尚未实现。完整结构与边界见 [README](README.md)。
