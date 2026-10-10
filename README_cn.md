# Little days

Little days 定位为陪伴家庭从怀孕、分娩到产后与育儿的记录应用。核心要求是随手能记、记录准确、分析可核对、数据可保护和恢复，并支持多平台使用。完整范围、交互标准与实施顺序见 [产品定义](docs/product-definition.md)。

当前实现仍以 0–6 岁儿童的日常照护记录为主，使用 Tauri 2、React、TypeScript 和 Vita 设计系统。桌面、iOS、Android 共用 `/` 正式入口。孕期与妈妈档案、分娩衔接、趋势分析尚未实现。

支持儿童档案、喂养、排便/换尿布、睡眠、洗澡、疫苗、成长、维生素记录；自定义记录可组合计时、计数、测量、选项、文本、日期字段；支持家庭用品库存与补货阈值。

桌面端可在“设置 → 桌面快捷记录”中修改或停用全局快捷键。默认 macOS 为 `⌘⇧Space`，Windows/Linux 为 `Ctrl+Shift+Space`。应用运行时可唤醒置顶全屏记录，显示时间与编号类型；按 `1–9` 选择类型后从底部弹出表单并聚焦内容，`Enter` 保存，备注中使用 `⌘/Ctrl+Enter`。保存后仅收起表单，浮层继续停留以便连续记录。`Esc` 收起表单；在类型列表中按 `Esc` 或点击关闭才退出浮层并恢复原窗口状态。返回类型选择会保留当前表单；切换到其他类型或关闭后清除草稿。超过九个的类型仍可点击选择。

关闭桌面主窗口会保留托盘运行，从托盘选择“退出”才完全退出。快捷键设置独立保存在原生配置目录，冲突会在设置页提示。浏览器与移动端不显示此功能。已验证 macOS 打包与浮层交互，跨应用实体按键唤醒及 Windows/Linux 原生窗口行为仍需对应平台验证。

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

正式代码位于 `src/features/little-days/`。新安装从空档案开始，记录、类型、库存和计时状态保存在设备本地 localStorage，重启可恢复。目前没有加密存储、备份恢复或云同步，各设备数据独立；清除应用数据或卸载会丢失记录。旧 Journal/Collage 数据不会自动迁移或删除。

examples 已移除；旧功能源码与无关原型保留历史开发内容，不接入正式构建入口。小组件、Live Activities、后台通知、数据导入导出和商店发布配置尚未实现。完整结构与边界见 [README](README.md)。
