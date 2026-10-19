# 界面约束

配合根目录 [RULES.md](../../RULES.md) 使用。约束新增和修改的界面，不要求借规则修订顺带重做历史样式。

## 颜色、字体与尺寸

- token 权威来源为 `packages/tokens/src/*.css`；`reference/` 是历史参考，不运行旧生成器覆盖当前 CSS。
- 页面使用 background / foreground，卡片使用 card / card-foreground，浮层使用 popover / popover-foreground，次要说明使用 muted-foreground，边界和焦点使用 border、input、ring。CSS 写 `var(--card)`，工具类写 `bg-card`。
- 强调动作使用 primary，错误和破坏性动作使用 destructive；success、warning、info 按实际状态含义使用。状态配文字或图标，不能仅靠颜色，也不套用原项目固定的同步颜色流程。
- 组件和业务 CSS 不新增原始 hex / RGB / HSL 颜色或直接绑定底层色阶。业务别名可引用语义 token（如现有 `--care-text`）；新通用角色补入 `semantics.css` 并配置明暗主题。
- 字体栈在 `packages/styles/src/fonts.css`；当前未随包交付字体文件，不能假定 Manrope 已加载，不为单个控件另加载字体。
- token 入口当前加载 `typography-fluid.css`，不能再叠加 `typography.css`。倍率 1 时 text-xs 为 13/20px、text-sm 为 14/21px、text-base 为 16/24px，更大字号随视口变化，不抄用原项目的固定 lg / xl 尺寸。
- 新增正文和普通操作标签至少 13px，正文默认 16px、次要说明默认 14px。短数字、时间刻度和底部导航等紧凑标记可沿用现有 12px；不能为了塞入布局缩小正文。
- Little days 的 `styles/app.css` 有标题、字体和表单覆盖，修改前检查最终级联。输入文字至少 16px，避免 iOS 聚焦缩放；不新增全局 `!important` 压过共享组件。
- 本项目使用 Web CSS 尺寸，不存在 NativeWind 的 inlineRem=14。在未覆盖 spacing、根字号 16px 时，Tailwind h-11 为 44px、h-12 为 48px；精确尺寸检查计算样式，不能改写整套 spacing 凑数。
- 静态布局复用现有间距、圆角和阴影 token，用 flex/grid、gap、padding 对齐。平台精确几何可用 px，不用微小 top/left 偏移修补整体对齐。

## Button 与图标操作

动作使用 Button；页面内导航沿用当前导航组件和状态管理，跳转 URL 使用语义链接。
变体及尺寸完整集合以 `packages/ui/src/button/button.tsx` 的 buttonVariants 为准。默认是 `variant="default"`、`size="default"`，并非 primary。

```text
操作是否破坏数据？
 ├─ 是 → destructive；弱化的删除入口可用 destructive-muted / ghost-destructive
 └─ 否 → 是否为当前区域主要动作？
          ├─ 是 → 沿用该功能的 default / primary，同一区域只突出一个
          └─ 否 → outline / secondary；低强调图标操作用 ghost
```

- `Button unstyled` 只用于已有完整业务布局和状态样式的表面，如 WorkspaceModal 关闭按钮；调用方负责焦点、按下、禁用和目标尺寸。
- 保留共享 Button 的 loading、disabled 和焦点行为，不为每个图标重新拼按压组件，不强制所有控件相同缩放。
- 手机主要操作与导航实际点击区域至少 44×44 CSS px；图标框与目标大小分别设计。现有导航图标为 24px，不强制内容图标全部变为 24px。
- 小型内容操作可保持视觉尺寸，通过布局留白扩大点击区域。Button 的 coarse 指针伪元素不能保证不被裁剪或不与邻居重叠；需检查 overflow、邻接目标和实际命中。Web 不使用 RN 的 hitSlop。
- 图标按钮提供随语言切换的 aria-label，装饰图标不重复朗读。

```tsx
// 正确：Settings.tsx 的现有公共组件用法。
<Button variant="outline" onClick={() => setPage("Cloud")}>{tr("Cloud sync")}</Button>

// 错误示例：把同一操作改为原生按钮，绕开共享边界。
<button onClick={() => setPage("Cloud")}>{tr("Cloud sync")}</button>
```

## 表单与弹层

- 普通文本用 Input / Textarea；原生选项列表用 NativeSelect；自定义菜单用 compound Select；日期与时间用 DateTimePicker；文件、radio、range 用 NativeInput。
- DateTimePicker 支持 `mode="date" | "datetime"`、locale、min、max，默认 datetime。保持本地 `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` 字符串契约，不用 toISOString() 悄悄变为 UTC。
- 字段有可关联 label，错误与字段关联。保留 Enter 提交、焦点、校验、只读、禁用及 ref；取消、打开菜单等非提交动作显式使用 `type="button"`。
- 编辑或新建流程用 `@vita/ui/dialog` 的 Dialog 组合，破坏性确认用 `@vita/ui/alert-dialog`，边缘面板用 `@vita/ui/sheet`。不使用不存在的 SheetRoot、SheetGrabber、ChromeIconButton 等原项目 API。
- 复用共享弹层的 portal、遮罩、焦点管理、关闭和退出动画，提供标题及必要说明。关闭时保留退出动画所需内容，参考 WorkspaceModal 生命周期，不先清空再淡出。
- 当前工作区由 `@vita/ui/overlay` 的 OverlayProvider 选择 ios / default 展示；平台逻辑留在已有适配层。共享结构样式在 `packages/ui/src/overlay/`，业务外观在 `styles/ios-overlays.css`，不在每个表单复制平台检测。
- 移动端键盘出现时输入和提交区可见且可滚动，复用 visualViewport 适配。触屏打开弹层不强制唤起键盘，桌面保留键盘焦点路径。

## 布局、导航和平台能力

- 以当前 `components/layout/`、`styles/app.css`、`styles/navigation.css` 为布局来源；沿用桌面侧栏、手机底部导航和 iOS 顶部对象选择器。导航项调整单独实施，不能将产品定义中的规划当成已上线结构。
- 页面标题、对象、主要动作与内容保持清晰层次。列表和详情沿用所在功能的边距，不强制所有容器为原项目的 16px；通用 Container 默认 p-6，业务导航和弹层另有边距，不重复叠加。
- 适配至少 360px 宽视口及可缩放桌面窗口；长标签、中英文和放大文字不遮挡操作，flex/grid 子项允许收缩，表单及弹层可滚动。
- 用 `env(safe-area-inset-*)` 处理刘海与底部手势区域；底部导航、计时迷你栏及正文预留空间一起检查，最后一条内容不能被覆盖。
- 文件选择、打开文件和系统能力复用已有 Tauri 封装；浏览器按真实能力降级并显示结果。新增桥接同步考虑插件权限，不导入 Expo API。
- 模糊及玻璃复用现有 CSS 工具和语义表面，提供不支持 backdrop-filter 时可读的底色。CSS 模糊不等于 iOS 系统 Liquid Glass，不承诺系统胶囊或原生导航栈行为。

## 反馈与可访问性

- 操作提供可见按下、焦点、禁用和必要提交状态，沿用组件及 feature 动效。避免共享 Button、全局 button:active 和业务动画重复驱动同一 transform。
- 新增过渡明确列出属性，优先 transform / opacity，不新增 transition: all。遵守 prefers-reduced-motion，取消非必要位移、缩放和循环动画，操作结果仍须可见。
- 触屏不依赖 hover，键盘能到达全部操作。弹层验证 Tab 路径、关闭、焦点恢复和屏幕阅读器标题，不能只检查鼠标点击。
- 保留浏览器缩放和文字选择；计时及统计数字可使用 tabular-nums 防止跳动。空状态、错误、保存结果走当前 i18n；共享组件通过 props 接收语言和文案。
- UI 验收覆盖浅色/深色、中英文、窄屏/桌面、触控/键盘、加载/空/错误状态；真机检查安全区、软键盘和原生能力，自动化测试不能证明设备体验通过。
