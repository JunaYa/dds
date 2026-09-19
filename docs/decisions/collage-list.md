> Historical note: the example entry was removed when Little days became the main app. Commands referencing examples below are no longer active.

# 合页清单方向

2026-09-18，用户从 `/proto/collage/` 三种交互方向中选择 **1：清单**。

- 采用：Things 式简洁列表，先记录任务，点开后渐进组合事件、时间、内容、循环、计时、计数。
- 保留：就地开始/暂停、计数、完成、恢复和手动开始下一次循环；桌面侧栏与手机分段导航。
- 未采用：拼贴以积木盒和多张卡片作为主界面，空间成本较高；节奏以时间轴为主，无时间任务位置较弱。这是方案对比时的权衡，并非用户另行提供的否定理由。
- 集成：新增独立构建入口 `/examples/collage/`，不替换现有 journal 主入口。
- 清理：删除三方案原型与选择器。后续迭代只围绕已选清单展开。
- 边界：此次落地交互与本地存储；系统能力仍需原生接入，未实现自动重复调度或 AI 解析。
