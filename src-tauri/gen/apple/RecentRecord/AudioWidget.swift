import WidgetKit
import SwiftUI

struct AudioEntry: TimelineEntry {
    let date: Date
    let configuration: AudioWidgetConfiguration
    let snapshot: AudioWidgetSnapshot
}
struct AudioTimeline: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> AudioEntry { AudioEntry(date: .now, configuration: AudioWidgetConfiguration(), snapshot: AudioWidgetSnapshot()) }
    func snapshot(for configuration: AudioWidgetConfiguration, in context: Context) async -> AudioEntry {
        AudioEntry(date: .now, configuration: configuration, snapshot: .read())
    }
    func timeline(for configuration: AudioWidgetConfiguration, in context: Context) async -> Timeline<AudioEntry> {
        Timeline(entries: [await snapshot(for: configuration, in: context)], policy: .never)
    }
}
struct AudioWidgetView: View {
    let entry: AudioEntry
    let category: String
    private var track: AudioWidgetTrack? {
        let tracks = entry.snapshot.tracks.filter { $0.category == category }
        return tracks.first { $0.id == entry.configuration.track?.id } ?? tracks.first
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(category == "sleep" ? "哄睡" : "儿歌", systemImage: category == "sleep" ? "moon.stars" : "music.note")
                .font(.headline)
            Spacer()
            if let track = track {
                Text(track.title).font(.body).lineLimit(2)
                let playing = entry.snapshot.playing && entry.snapshot.trackId == track.id
                Button(intent: ControlAudio(operation: playing ? "pause" : "play", trackId: track.id)) {
                    Label(playing ? "暂停" : "播放", systemImage: playing ? "pause.fill" : "play.fill")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }.buttonStyle(.bordered)
            } else {
                Text("在应用中添加音频").font(.subheadline)
                Button(intent: OpenAudioApp()) { Text("打开 Little days") }
            }
        }.padding(16).containerBackground(.background, for: .widget)
    }
}
struct SleepAudioWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "LittleDaysSleepAudio", intent: AudioWidgetConfiguration.self, provider: AudioTimeline()) { AudioWidgetView(entry: $0, category: "sleep") }
            .configurationDisplayName("哄睡音乐").description("选择哄睡音频，直接播放或暂停。")
            .supportedFamilies([.systemSmall, .systemMedium]).contentMarginsDisabled()
    }
}
struct SongsAudioWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "LittleDaysSongsAudio", intent: AudioWidgetConfiguration.self, provider: AudioTimeline()) { AudioWidgetView(entry: $0, category: "songs") }
            .configurationDisplayName("儿歌").description("选择儿歌，直接播放或暂停。")
            .supportedFamilies([.systemSmall, .systemMedium]).contentMarginsDisabled()
    }
}
