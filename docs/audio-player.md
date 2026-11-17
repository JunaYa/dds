# 音频播放器

入口在“我的 → 哄睡 / 儿歌”；未建立宝宝档案时，欢迎页也有入口。播放控制条位于主内容顶部，不覆盖护理计时或底部导航。两个模块共享当前音轨，切换音轨取消旧的睡眠定时器；育儿睡眠记录与播放完全独立。

## 已接入的能力

- iOS：AVQueuePlayer / AVPlayerLooper、AVAudioSession、系统播放信息和媒体按钮；原生定时关闭、App Group 目录和下载文件。
- Android：Media3 1.8.0 ExoPlayer、MediaSessionService、通知/锁屏控制、焦点和耳机断开处理；系统 DownloadManager 下载。保留最低 API 24；采用与现有 Gradle/Kotlin 工具链实际打包通过的版本。
- 桌面：rodio 0.21.1 播放线程，souvlaki 0.9.3 系统控制，reqwest 文件下载。启动播放会先完成文件缓存，首版没有远程流边下边播。窗口隐藏时线程继续运行，退出进程停止。
- 浏览器：HTMLAudio、Media Session（按浏览器能力）、IndexedDB 下载；后台定时受页面生命周期影响，不能保证与原生相同。
- 单音轨循环、播放/暂停/停止/定位，15/30/60 分钟实际时间定时关闭，应用内 LRC/WebVTT 歌词高亮、点击定位和手动滚动后的恢复跟随。
- iOS 增加“哄睡音乐”“儿歌”独立 Widget，可编辑选择曲目；Android 增加两种独立 Widget，添加/重新配置时选择曲目。它们直接控制原生会话。

首次进入不会自动发声。重启后恢复目录、选曲和检查点，保持暂停；不自动恢复旧定时器。用户强退后的继续播放不作保证。歌词完整展示位于应用内，系统锁屏和 Widget 不渲染滚动歌词。

## 接入素材

没有捆绑未经确认可分发的 Pixabay 曲库，也没有爬取站点或虚构音乐 API。使用“添加音频”输入获准使用的 HTTPS 音频文件地址、作者及许可依据，或导入 JSON 目录。Pixabay 作品页可记录在 sourcePage；作品页和搜索页不能作为音频文件地址。

目录格式为数组，例如（示例域名不是可播放资源）：

```json
[
  {
    "id": "licensed-lullaby-v1",
    "title": "Lullaby",
    "artist": "Author",
    "category": "sleep",
    "url": "https://audio.example.com/approved/lullaby.mp3",
    "sourcePage": "https://pixabay.com/music/your-approved-track/",
    "license": "Distribution and offline permission reference",
    "lyrics": "[00:00.00]First line\n[00:08.50]Second line"
  }
]
```

category 使用 sleep / songs。ID 仅允许字母、数字、下划线及连字符，最长 80 字符；目录最多 500 首、导入文件小于 2 MB。相同 ID 可以更新标题、歌词等元数据，但更换音频 URL 必须换新 ID，避免旧缓存被误认为新文件。

获取应用内分发和离线副本许可后，使用许可覆盖的交付方式或自有文件托管。平台来源、音频、封面和歌词的授权分别确认，详细依据见 [调研报告](audio-player-research.md)。没有歌词的音轨显示空态。

## 缓存与恢复

播放优先使用本地下载。下载失败保留目录可重试；停止当前曲目后可删除其下载。浏览器需源站允许 CORS；原生使用自己的网络与文件服务。iOS 和桌面按 200 MB 文件上限检查，桌面下载后还检查解码；Android 下载大小与剩余空间由系统下载管理器处理。

原生文件与目录不写入育儿 localStorage 或云同步，不改变现有备份格式。浏览器文件存 IndexedDB、目录存独立 localStorage 键。首版下载文件均按保留文件管理，未实现 LRU 自动淘汰、下载断点统一接口、跨设备曲库同步和多声音混音。

iOS 首版使用 URLSession 下载任务，支持应用活跃期间及系统允许的后台执行时间；未接入跨进程后台 URLSession 恢复。Android 下载由系统管理；桌面退出后的下载不继续。播放、循环和睡眠定时在原生层执行，不依赖 React。

## 维护入口

- src/audio：统一模型、适配器、React 订阅、浏览器缓存与歌词解析。
- @vita/ui/audio-player 公共导出：共享播放和歌词控件。
- src-tauri/plugins/audio-player：移动插件、桌面运行时、Android 服务及 Widget。
- src-tauri/gen/apple/RecentRecord/AudioIntent.swift：同时加入宿主应用和 Widget 扩展。扩展使用 AUDIO_WIDGET_EXTENSION 编译条件；AudioPlaybackIntent 在宿主执行，通过 C ABI 直接调用插件运行时，不依赖 Swift 模块导入或 WebView。
- src-tauri/gen/apple/project.yml：保存 Widget 文件归属、编译条件和后台音频配置；现有 Xcode 工程也已同步。

新增原生插件后需要原生重建，Vite 热更新不足以加载插件。安装后应先在应用添加目录，再添加音频 Widget。

## 验证

自动化覆盖歌词格式/偏移/时间边界、目录校验、拖动进度、歌词安全展示、定时截止、切歌取消旧定时、缓存播放以及下载不阻塞暂停。执行结果以任务交付说明为准。

真机仍须检查：锁屏连续播放 30–60 分钟、后台定时、焦点/来电/耳机切换、Widget 在 WebView 未加载时播放、下载断网与磁盘不足。桌面 Windows/Linux、iOS/Android 真机的行为不能由 macOS 编译和模拟器证明。

### 本次验证结果（2026-11-17 至 18）

- UI 边界与 TypeScript 检查通过；完整前端测试 437 项通过、1 项跳过，新增音频相关测试 10 项通过。
- 应用 Rust 测试 4 项通过；音频插件测试 3 项通过，包含本机实际音频输出上的解码、循环及定位测试（默认忽略硬件项，本次显式执行）。
- iOS 原生测试 2 项通过，使用隔离测试宿主和原创静音 WAV，覆盖缓存播放、循环、定位、定时关闭、旧曲目暂停命令隔离，以及 Widget 使用的 C ABI 入口。
- iOS 模拟器应用归档与 Android arm64 APK 已构建通过。已完成相应增量重建，不等同真机验收。
- 网页端实际检查了入口、空态及目录录入。iOS 模拟器应用已启动；原生 Widget 在锁屏/冷启动时的系统行为、两端真机 30–60 分钟后台播放、Windows/Linux 仍未验收。

原生测试命令为 pnpm test:audio:ios，需要 macOS、Xcode、xcodegen 和已启动的 iOS 模拟器；脚本创建独立测试宿主，不修改 Little days 的育儿数据，成功后清理临时构建目录。桌面输出测试使用 cargo test --manifest-path src-tauri/plugins/audio-player/Cargo.toml --lib -- --include-ignored，需要可用音频设备。Linux 构建额外需要 CPAL 的 ALSA 开发依赖（例如 Debian 的 libasound2-dev），系统媒体控制使用 D-Bus。
