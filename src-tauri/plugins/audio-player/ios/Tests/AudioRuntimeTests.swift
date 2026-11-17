import XCTest
import AVFoundation
@testable import AudioTestHost



final class AudioRuntimeTests: XCTestCase {
    @MainActor func testCachedPlaybackLoopSeekAndNativeDeadline() throws {
        let engine = AudioRuntime.shared
        let track = AudioTrack(id: "native-test", title: "Native audio test", artist: "Test", category: "sleep", url: "https://example.com/native-test.wav", sourcePage: nil, license: "Original test fixture", lyrics: "")
        var catalog = AudioRequest(op: "catalog"); catalog.tracks = [track]
        try engine.execute(catalog)
        let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group." + (Bundle.main.bundleIdentifier ?? "com.dds.audio.tests"))
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let root = base.appendingPathComponent("Audio-v1")
        // Match the runtime storage resolution in the isolated test host.
        let rate = 8000, samples = 8000
        var wav = Data()
        func ascii(_ s: String) { wav.append(s.data(using: .ascii)!) }
        func u32(_ n: Int) { var value = UInt32(n).littleEndian; withUnsafeBytes(of: &value) { wav.append(contentsOf: $0) } }
        func u16(_ n: Int) { var value = UInt16(n).littleEndian; withUnsafeBytes(of: &value) { wav.append(contentsOf: $0) } }
        ascii("RIFF"); u32(36 + samples * 2); ascii("WAVEfmt "); u32(16); u16(1); u16(1)
        u32(rate); u32(rate * 2); u16(2); u16(16); ascii("data"); u32(samples * 2); wav.append(Data(count: samples * 2))
        try wav.write(to: root.appendingPathComponent("native-test.wav"), options: .atomic)
        let accepted = "play".withCString { op in track.id.withCString { id in dds_audio_widget_command(op, id) } }
        XCTAssertTrue(accepted)
        let looping = expectation(description: "native loop continues beyond the source duration")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            let state = engine.snapshot()
            XCTAssertEqual(state["playing"] as? Bool, true, "Snapshot: \(state)")
            XCTAssertGreaterThan(state["duration"] as? Double ?? 0, 0, "Snapshot: \(state)")
            XCTAssertLessThan(state["position"] as? Double ?? 100, 1.2)
            looping.fulfill()
        }
        wait(for: [looping], timeout: 8)
        try engine.execute(AudioRequest(op: "pause", id: "different-track"))
        XCTAssertEqual(engine.snapshot()["playing"] as? Bool, true)
        try engine.execute(AudioRequest(op: "pause"))
        var seek = AudioRequest(op: "seek"); seek.position = 0.4
        try engine.execute(seek)
        let sought = expectation(description: "seek reaches the requested source position")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            XCTAssertEqual(engine.snapshot()["position"] as? Double ?? -1, 0.4, accuracy: 0.15)
            sought.fulfill()
        }
        wait(for: [sought], timeout: 3)
        try engine.execute(AudioRequest(op: "play"))
        var timer = AudioRequest(op: "timer"); timer.minutes = 0.002
        try engine.execute(timer)
        XCTAssertNotNil(engine.snapshot()["deadline"] as? Double)
        let stopped = expectation(description: "native timer stops without a WebView")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
            XCTAssertEqual(engine.snapshot()["playing"] as? Bool, false)
            XCTAssertTrue(engine.snapshot()["deadline"] is NSNull)
            stopped.fulfill()
        }
        wait(for: [stopped], timeout: 5)
        try engine.execute(AudioRequest(op: "stop"))
        XCTAssertEqual(engine.snapshot()["position"] as? Double, 0)
    }
    @MainActor func testCatalogRejectsTraversalAndConflictingIDs() throws {
        let engine = AudioRuntime.shared
        let bad = AudioTrack(id: "../escape", title: "Bad", artist: "", category: "sleep", url: "https://example.com/file.mp3", sourcePage: nil, license: "Test", lyrics: "")
        var request = AudioRequest(op: "catalog"); request.tracks = [bad]
        XCTAssertThrowsError(try engine.execute(request))
        var timer = AudioRequest(op: "timer"); timer.minutes = -1
        XCTAssertThrowsError(try engine.execute(timer))
    }
}
