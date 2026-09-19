> Historical note: the example entry was removed when Little days became the main app. Commands referencing examples below are no longer active.

# 合页跨平台能力规划

清单方向已选定，运行入口为 `/examples/collage/`。本文件中的系统能力均为待接入计划，不能视为已经支持。

## 平台能力规划（待原生接入）

| 平台 | 必须保留的能力 | 接入方式与退化行为 |
| --- | --- | --- |
| macOS | 菜单栏快速计时/计数、全局录入快捷键、键盘导航、窗口恢复 | Tauri tray / global-shortcut；权限或注册失败时保留应用内入口 |
| Windows | 系统托盘、全局录入、系统通知、键盘操作 | Tauri 桌面插件；通知不可用时保留应用内状态 |
| Linux | 托盘与快捷录入、键盘操作 | 根据桌面环境检测；不承诺所有 Wayland/托盘实现一致 |
| iOS | 主屏/锁屏小组件，计时 Live Activity，App Intents/快捷指令，分享接收，系统返回手势与安全区 | Swift/SwiftUI 扩展、WidgetKit、ActivityKit、App Intents，原生共享数据；不把 WebView 放进小组件；系统不支持时退回应用内计时 |
| Android | 主屏小组件，带暂停/完成动作的通知，分享接收，系统返回，触觉反馈 | Kotlin/Glance 或 RemoteViews、通知 action 与原生入口；按需申请通知权限，被拒后保留应用内功能 |

Android 的普通通知操作作为基线，不假定通用任务计时器符合 Live Updates 的提升要求。iOS 灵动岛取决于设备和系统支持；实时活动也不能替代常驻后台 JavaScript。

正式实现应共享任务模型与命令（开始、暂停、计数、完成），原生入口和应用界面调用同一语义。计时存起止时间，跨进程恢复；循环任务以实例记录避免重复完成。真实后台、重启、权限拒绝、时区变化和同步冲突需要独立验证。

官方依据：
- [Tauri 插件与平台支持](https://v2.tauri.app/plugin/)
- [Apple WidgetKit 策略](https://developer.apple.com/documentation/widgetkit/developing-a-widgetkit-strategy)
- [Apple ActivityKit](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Android 通知概览](https://developer.android.com/develop/ui/views/notifications)
- [Android 小组件](https://developer.android.com/develop/ui/views/appwidgets/overview)

