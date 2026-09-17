# 日日记 · Journal example

`proto/journal` 的记事工作台已成为正式主应用。这个 React example 与主应用共用 `src/features/journal/`，保留独立入口和演示数据库，使用项目现有 UI 组件、字体、颜色、圆角及明暗主题。

## 运行

```sh
pnpm install
pnpm dev:journal
```

默认地址：`http://localhost:1420/examples/journal/`。端口被占用时，可用 `pnpm dev:journal --port 1422`。

```sh
pnpm test
pnpm build
pnpm preview
```

构建产物为 `dist/examples/journal/index.html`；预览时访问 `/examples/journal/`。该页面可直接在浏览器运行，不依赖 Tauri 命令。

## 可以体验的流程

- 今天：查看安排、完成任务并记录，循环任务生成下一次安排；支持每 1–24 小时、按原定时间或完成时间循环、暂停与恢复。
- 图片速记：上传、拖放图片或调用相机；本机 OCR 提取预约日期、时间、场所和详细地点；核对后创建事件，或保存为普通记录。支持跳过识别、失败重试、多日期选择、保留手动修改。点击「用示例预约单试一下」可体验真实识别。
- 记录：文本、长文本、数值、日期、选项与附件；图片、视频、音频支持预览。单个附件不超过 20 MB。
- 类型：组装字段、单位、必填规则和选项，再用生成的表单记录。
- 看板：胎动计数、撤销、结束保存，饮水快捷记录，以及自定义类型的今日条数或数值合计；可隐藏和添加卡片。
- 记录库：按类型筛选、搜索、分页、查看详情与原始附件。

## 组合模型

以下模块均位于 `src/features/journal/`；三端运行方式见[平台开发说明](../../docs/journal-platforms.md)。

| 概念 | 职责 |
| --- | --- |
| `RecordField` | 定义值的类型、名称、必填规则、单位和选项 |
| `RecordType` | 组合字段，生成录入表单与详情 |
| `JournalRecord` | 某次发生的事实，包含字段值、时间和附件引用 |
| `JournalTask` | 未来安排，可关联来源记录和循环计划 |
| `Plan` | 定义循环间隔、计算方式与暂停状态 |
| `BoardCard` | 指定类型及数值字段，从记录汇总今日数据 |
| `session` | 正在进行的计数，保存起点与每次点击时间 |

数据与规则在 `model.ts`，IndexedDB 事务在 `storage.ts`，React 状态在 `journal-context.tsx`。`controls.tsx` 通过组合现有 Field、Input、Select 等组件渲染字段。`App.tsx` 与 `dialogs.tsx` 组织页面和编辑流程；图片处理在 `photo-capture.tsx`、`ocr.ts` 和 `photo-text.ts`。

## UI 与样式

从 `@vita/ui/*` 子路径直接导入 Button、Card、Dialog、Tabs、Select、Input、Textarea、Switch、Checkbox、Table、Alert、Progress 和 Icons。共用的 `src/styles.css` 引入 `@vita/styles/base.css` 与记事布局样式；颜色和间距使用共享 tokens。主题跟随系统设置。

## 数据与功能边界

- 首次打开会填入示例记录。数据及原始附件保存在当前站点的 `dds-journal-example` IndexedDB 数据库；记录与附件在同一事务中保存，失败时保留当前表单。同源标签页通过 BroadcastChannel 更新。
- 浏览器和端口不同，数据空间也不同。当前没有云同步、导出、删除或旧 Vue 原型数据迁移；清理站点数据会移除这些记录。
- OCR 使用 Tesseract.js 中英文识别，在浏览器内处理图片。首次识别从 CDN 下载引擎和语言包；图片不上传。识别与字段提取可能不准确，创建事件前需核对；无文字、离线或超时仍可保存原图。
- 提醒在应用内列表展示，尚未接入系统通知或后台调度。关闭页面后不会发送通知。
- 相机需要 HTTPS 或 localhost 和浏览器授权。桌面使用摄像头预览；手机通过 `capture="environment"` 请求相机，实际行为取决于浏览器。硬件相机未在本次自动检查中验证。

## 验证

自动测试覆盖循环计算及幂等、记录校验、事件创建、计数撤销、附件事务回滚、并发保存、表单失败重试、刷新后的记录恢复、OCR 日期歧义及取消资源清理。浏览器检查覆盖真实中英文 OCR、上传与原图恢复、自定义类型和统计卡片、计数流程，以及 390 px 手机布局。
