# DDS（Daily Duty Schedule）

使用 Tauri 2、React 19、TypeScript 和 Vite 的任务应用。UI 和样式 tokens 从 Streamify/Ancher 设计系统迁入，源码保存在本项目 `packages/` 中。

## 开发

```sh
pnpm install
pnpm tauri dev
```

`pnpm dev` 仅启动浏览器前端；任务操作需要 Tauri 桌面宿主。

## 检查

```sh
pnpm typecheck
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

当前界面支持新增、展示和完成任务。数据沿用原有的内存存储，退出应用后不会保留。

[设计系统迁移说明](docs/design-system-migration.md)包含导入版本、包结构和本地适配。`proto/` 中的独立原型不参与主应用构建。
