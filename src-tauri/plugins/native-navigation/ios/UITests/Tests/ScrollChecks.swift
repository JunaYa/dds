import XCTest

final class ScrollChecks: XCTestCase {
    func testEdgesStopWithoutBounceAndFlickStillDecelerates() {
        let app = XCUIApplication(bundleIdentifier: "com.dds.app")
        app.launchEnvironment["DDS_UI_TEST_LONG_PAGE"] = "1"
        app.launchEnvironment["DDS_UI_TEST_SCROLL"] = "1"
        app.launch()
        let probe = app.descendants(matching: .any)["little-days.scroll-verification"]
        XCTAssertTrue(probe.waitForExistence(timeout: 30), app.debugDescription)
        let web = app.webViews.firstMatch
        func metric(_ name: String) -> Double {
            let values = (probe.value as? String ?? "").split(separator: ";")
            let pair = values.first { $0.hasPrefix(name + "=") }
            return pair.flatMap { Double($0.dropFirst(name.count + 1)) } ?? .nan
        }
        XCTAssertEqual(metric("bounces"), 0)
        XCTAssertEqual(metric("enabled"), 1)
        let start = web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.35))
        let end = web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8))
        start.press(forDuration: 0.1, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.7)
        XCTAssertGreaterThan(metric("maxPull"), 1)
        XCTAssertLessThanOrEqual(metric("maxPull"), 40)
        let topSettled = expectation(for: NSPredicate { _, _ in abs(metric("pull")) < 0.1 }, evaluatedWith: probe)
        wait(for: [topSettled], timeout: 3)
        XCTAssertEqual(metric("offset"), metric("minimum"), accuracy: 1)
        XCTAssertEqual(metric("overscrolled"), 0)
        let top = XCTAttachment(screenshot: app.screenshot())
        top.name = "Top edge after pull"
        top.lifetime = .keepAlways
        add(top)

        web.swipeUp(velocity: .fast)
        XCTAssertGreaterThan(metric("offset"), metric("minimum") + 50)
        XCTAssertEqual(metric("decelerated"), 1, "Offset must keep changing after the finger is released")
        for _ in 0..<15 {
            if abs(metric("offset") - metric("maximum")) <= 1 { break }
            web.swipeUp(velocity: .fast)
        }
        XCTAssertGreaterThan(metric("maximum"), 1000)
        XCTAssertEqual(metric("offset"), metric("maximum"), accuracy: 1)
        end.press(forDuration: 0.1, thenDragTo: start, withVelocity: .slow, thenHoldForDuration: 0.7)
        XCTAssertLessThan(metric("minPull"), -1)
        XCTAssertGreaterThanOrEqual(metric("minPull"), -40)
        let bottomSettled = expectation(for: NSPredicate { _, _ in abs(metric("pull")) < 0.1 }, evaluatedWith: probe)
        wait(for: [bottomSettled], timeout: 3)
        XCTAssertEqual(metric("offset"), metric("maximum"), accuracy: 1)
        XCTAssertEqual(metric("overscrolled"), 0)
        let bottom = XCTAttachment(screenshot: app.screenshot())
        bottom.name = "Bottom edge after pull"
        bottom.lifetime = .keepAlways
        add(bottom)
        web.swipeDown(velocity: .fast)
        XCTAssertLessThan(metric("offset"), metric("maximum") - 50)
        XCTAssertEqual(metric("bounces"), 0)
        XCTAssertEqual(metric("enabled"), 1)
        print("Scroll verification: \(probe.value ?? "missing")")
        app.terminate()
    }
}
