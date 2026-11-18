# 内置音频目录

维护入口为 `public/audio/catalog.json`，实际 MP3 位于 `public/audio/files/`。这些文件随 Vite/Tauri 构建交付；用户直接在应用内播放、保存离线，不跳转到素材网站。用户已于 2026-11-18 确认改用可再分发的 CC0／公有领域录音。

## 当前资源与授权

当前四首录音均由上传者在作品页以 CC0 发布。保留作者信息；许可为 [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)。分类依据作者描述，不构成助眠效果或年龄适宜性的认证；这批资源均为纯音乐，没有虚构歌词。

| 曲目 | 作者 | 模块 | 时长 | 作品与许可来源 |
| --- | --- | --- | --- | --- |
| Happy Lullaby | cynicmusic | 哄睡／摇篮曲 | 39.564 秒 | [作者作品页](https://opengameart.org/content/happy-lullaby-song17) |
| Calm Music | Morsi | 哄睡／舒缓氛围 | 70.034 秒 | [作者作品页](https://opengameart.org/content/calm-music) |
| Children’s March Theme | Cleyton Kauffman | 儿童风格纯音乐 | 64.052 秒 | [作者作品页](https://opengameart.org/content/childrens-march-theme) |
| Remember the Time We Use to Play | Komiku / Loyalty Freak Music | 儿童风格纯音乐 | 96.026 秒 | [作者作品页](https://opengameart.org/content/remember-the-time-we-use-to-play) |

2026-11-18 逐首从以上作品页取得真实 MP3 地址，完整下载、使用 macOS afconvert 解码，并用 afinfo 核对时长。目录记录每份实际文件的字节数和 SHA-256。四份 MP3 共约 8.3 MiB。上游不提供 CORS 下载响应头，因此不依赖网页跨站读取它们；打包副本通过应用自己的资源路径读取。

## JSON 与播放流程

- `url`：真实 HTTPS MP3 地址，保留来源以及普通播放器的网络来源兼容性。不是作品页、搜索页或临时签名地址。
- `assetPath`：应用内资源路径，例如 `audio/files/oga-happy-lullaby-song17.mp3`。页面实际使用此文件，不访问第三方站点。
- `sourcePage`、`licensePage`、`provider`、`artist`：来源与授权元数据，不渲染为外跳使用按钮。
- `license`：当前目录仅接受 `CC0-1.0` 或 `Public domain`，不能仅凭作品标题或“免费”标签添加。
- `category`：sleep / songs。`type` 明确标注纯音乐，不把器乐误认为演唱版儿歌。
- `byteSize`、`sha256`：打包文件的精确大小及校验值。
- `lyrics`：有真实同步歌词时填写；这些纯音乐为空字符串。

点击播放或下载时，先将曲目元数据注册到现有播放器，再读取打包文件并调用统一 cache 命令。原生端通过 SHA-256 验证后原子保存，浏览器使用 Web Crypto 验证后写入 IndexedDB。校验失败不启动播放、不标记下载成功。

点击播放会在准备缓存后播放；点击下载只保存，不自动发声。完成后通过现有本地播放路径恢复、循环、定时以及供 Widget 使用。新增曲目不会覆盖用户已有的自定义音频。浏览器校验需要安全上下文（HTTPS 或 localhost）；原生端不依赖浏览器的 Web Crypto。

单个打包音频上限 20 MiB，仅首次准备缓存时通过桥接传输字节，不将二进制写进曲目 JSON、播放状态快照、育儿备份或云同步。原始打包文件属于应用资源，删除下载只移除运行时副本，不会缩小已安装应用本体。

## 更新与测试

替换音频内容时必须更换曲目 ID 和文件名，并同步 url、byteSize、sha256、durationSeconds、reviewedAt，避免旧缓存被当作新版本。保留已有用户曲库，不自动删除历史下载。

`src/audio/catalog.test.ts` 校验所有打包文件的实际大小、摘要、目录唯一性及真实音频 URL；资源组件测试覆盖应用内播放、离线保存、不外跳、导入失败中止和快速切歌的过期请求。播放器原生与浏览器测试覆盖缓存摘要不匹配的拒绝、缓存播放和原有循环/定时行为。
