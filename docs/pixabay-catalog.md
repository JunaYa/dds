# Pixabay 本地资源目录

维护入口：`public/audio/pixabay-catalog.json`。Vite 将它原样发布到 `audio/pixabay-catalog.json`，应用通过当前部署 BASE_URL 请求，开发服务器、静态网页和 Tauri 内置资源使用相同路径。无需 Pixabay API key，不会在启动时请求 Pixabay。

2026-11-18 根据用户提供的[搜索页](https://pixabay.com/zh/music/search/婴儿音乐/)及每首作品页人工整理 6 条来源信息，非完整曲库。以作品页显示的时长为准；搜索列表可能相差一秒。分类依据作品标题、标签和描述，并非试听、年龄适宜性或助眠效果认证。songs 分组包括欢快器乐，不表示每首都有歌词。

- `sleep`：摇篮曲、舒缓氛围，共 3 条。
- `songs`：欢快器乐、儿童歌曲，共 3 条。
- `id`：`pixabay-` 加平台作品 ID，不能重复。
- `type`：`Lullaby` / `Calm ambient` / `Playful instrumental` / `Children’s songs`。
- `durationSeconds`：作品页时长，单位秒。
- `sourcePage`：对应的 HTTPS Pixabay 作品页。
- `aiGenerated`：页面明确标注时为 true；未确认时为 null，不能据此视为人工创作。
- `availability`：目前固定 `source-only`，只提供作品页入口。
- `reviewedAt`：最近人工核对日期；更新目录时同步维护。

这些来源条目与 `src/audio/model.ts` 中的可播放 Track 分开，不会导入原生播放、下载或 Widget 目录。不得将作品页地址作为音频 URL。目录文件不含音频、封面或歌词副本。

[Pixabay 条款](https://pixabay.com/service/terms/)第 5 节限制 Standalone 再分发；免版税并不自动证明原始文件可作为本应用的独立曲库分发。取得覆盖应用播放和离线缓存的许可后，使用现有“添加音频”或“导入目录”入口添加获准交付的 HTTPS 音频地址及许可依据。不要依赖临时预览 CDN URL。

实现：`src/audio/pixabay-catalog.ts` 校验本地请求结果；`PixabayResources` 在听音弹框按 category 展示，支持加载失败重试。资源列表不会自动播放，也不会覆盖用户已导入的曲库。
