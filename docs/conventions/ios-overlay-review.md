# iOS 弹层审查

审查使用 `emil-ui-review`，针对当前 Little days 正式入口和提供的截图。此次选择优化现有共享实现：已确认的问题来自表面、手势和键盘布局，尚不需要将业务表单复制为 SwiftUI / UIKit。

## 发现与修复

| 优先级 | 问题 | 位置 | 本次修复 |
| --- | --- | --- | --- |
| Blocking | 完整软键盘出现后，固定操作栏可能遮挡聚焦字段；仅检查关闭按钮可见无法发现 | `packages/ui/src/overlay/overlay-provider.tsx` | 在可视视口和焦点变化后，按标题、操作栏边界滚动当前弹层；业务表单用 `data-overlay-footer` 标记操作区 |
| Should fix | 拖拽条使用 popover、选择器使用 card，产生截图中的矩形色块 | `packages/ui/src/overlay/overlay.css:2`、`styles/navigation.css` | 拖拽条继承整个弹层表面并延伸至内容边距之外，选择器通过 `--overlay-surface` 声明表面 |
| Should fix | 只有 28px 横线区域接收拖拽，标题不响应；固定 80px 阈值不考虑弹层高度和滑动速度 | `packages/ui/src/overlay/overlay-grabber.tsx` | 标题和头部也可拖拽，排除按钮与输入；阈值为高度的 25%，限制在 64–120px，48px 以上的快速下滑可关闭 |
| Should fix | 松手先重置位移，再执行淡出，手指位置与退出轨迹脱节 | `packages/ui/src/overlay/overlay-grabber.tsx`、`overlay.css` | 从当前绘制位置交接至向下退出；短拖、取消、丢失 pointer capture 则恢复，继续通过 Base UI 关闭路径处理焦点与取消 |
| Should fix | 开始时间编辑仍用独立 Popup 和装饰横线，绕过共享手势 | `components/nursing/NursingStartTime.tsx` | 改用共享 DialogPopup，保留滚轮、草稿、校验、提交和主题 |
| Should fix | 全屏快捷记录没有标记 fullscreen，仍可能命中 iOS Sheet 样式 | `quick-record/QuickRecordOverlay.tsx` | 显式标记共享 viewport 为全屏，不显示拖拽条 |

## 页面覆盖

路径以 `src/features/little-days/` 为基准。

| 场景 | 共享入口与处理 |
| --- | --- |
| 记录、类型、用品、补货、宝宝档案 | WorkspaceModal → DialogPopup；共用表面、头部手势和键盘焦点处理 |
| iOS 添加记录类型选择 | IosNavigation → 底部 SheetPopup；统一表面和标题拖拽 |
| 快捷记录中的表单 | 底部 SheetPopup；标记业务标题拖拽区，复用字段与操作栏处理 |
| 快捷记录全屏工作区 | DialogPopup + fullscreen viewport；保留全屏布局和键盘流程 |
| 喂养开始时间 | NursingStartTime → DialogPopup；移除单独装饰横线 |
| 放弃喂养确认 | AlertDialogPopup；保留明确确认/取消操作，不添加下拉关闭 |
| 喂养计时全屏页 | 显式 fullscreen DialogViewport；保留最小化、持续计时和原有焦点恢复 |
| 非 iOS 手机侧栏 | 左侧 SheetPopup；不附加底部 Sheet 的手势和样式 |

## 原生边界

当前弹层仍由 React DOM / WebView 渲染，不是 UIKit 原生 Sheet。关闭与焦点管理复用 Base UI，业务状态继续由原 feature 持有。不会将 CSS 模糊或自定义手势称为系统 Liquid Glass。

UIKit 的 [UISheetPresentationController](https://developer.apple.com/documentation/uikit/uisheetpresentationcontroller) 直接提供高度档位、系统 grabber 和滚动扩展协调；[Apple Sheets 指南](https://developer.apple.com/design/human-interface-guidelines/sheets) 区分 Sheet、全屏流程及关闭方式。若后续要求这些系统行为逐项一致，应建设原生呈现与内容承载桥接，而非只把现有 Web 弹层包进原生外壳。

## 验证入口

- `pnpm typecheck`：含 UI 边界检查。
- `pnpm test`：含表面上下文、键盘焦点滚动、拖拽取消、快速下滑、标题拖拽与业务回归。
- `pnpm build:ios:sim`：生产前端资源与 iOS 模拟器调试包。
- `ModalChecks.testSheetGesturesAndKeyboard`：真实 WebKit 中检查短拖回弹、下拉关闭、选择器到表单、输入聚焦后的可见区域及关闭；输出选择器、表单、键盘截图。
- 真机手感、VoiceOver、横屏及 iPad 不能由 jsdom 或单一 iPhone 模拟器结果代替，需分别验收。

本次验证：类型检查、UI 边界、生产前端和 iOS 模拟器构建通过；61 个测试文件共 332 项通过、1 项跳过。iPhone 17 Pro / iOS 26.2 的 ModalChecks 通过，已人工检查完整软键盘截图，聚焦备注位于标题与操作栏之间。真机、VoiceOver、横屏和 iPad 本次未执行。
