import XCTest
final class TabChecks: XCTestCase {
    func testNativeTabs() {
        let app = XCUIApplication(bundleIdentifier: "com.dds.app")
        app.launchEnvironment["DDS_UI_TEST_LONG_PAGE"] = "1"
        app.launch()
        let home = app.buttons["little-days.tab.Today"]
        XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
        let analysis = app.buttons["little-days.tab.Analysis"]
        analysis.tap()
        XCTAssertTrue(analysis.isSelected)
        let mine = app.buttons["little-days.tab.My"]
        mine.tap()
        XCTAssertTrue(mine.isSelected)
        let before = XCTAttachment(screenshot: app.screenshot())
        before.name = "Expanded"
        before.lifetime = .keepAlways
        add(before)
        let scroll = app.webViews.firstMatch
        scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65))
            .press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)), withVelocity: .slow, thenHoldForDuration: 1)
        sleep(2)
        let after = XCTAttachment(screenshot: app.screenshot())
        after.name = "After scrolling down"
        after.lifetime = .keepAlways
        add(after)
        XCTAssertTrue(app.tabBars.buttons.matching(NSPredicate(format: "value CONTAINS 'Collapsed'")).firstMatch.exists, app.debugDescription)
        app.webViews.firstMatch.swipeDown()
        sleep(2)
        home.tap()
        XCTAssertTrue(home.isSelected)
    }
}
