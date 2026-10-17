import XCTest
final class TabChecks: XCTestCase {
    func testAddRecordAction() {
        let app = XCUIApplication(bundleIdentifier: "com.dds.app")
        app.launch()
        let add = app.buttons["little-days.add-record"]
        XCTAssertTrue(add.waitForExistence(timeout: 20))
        let mine = app.buttons["little-days.tab.My"]
        mine.tap()
        XCTAssertEqual(add.frame.midY, mine.frame.midY, accuracy: 8)
        XCTAssertGreaterThan(add.frame.minX, mine.frame.maxX)
        let bar = XCTAttachment(screenshot: app.screenshot())
        bar.name = "Trailing add action"
        bar.lifetime = .keepAlways
        self.add(bar)
        add.tap()
        let chooserTitle = app.webViews.staticTexts.matching(NSPredicate(
            format: "label IN %@", ["Capture a little moment", "记下一个小瞬间"]
        )).firstMatch
        XCTAssertTrue(chooserTitle.waitForExistence(timeout: 5))
        XCTAssertFalse(add.isHittable)
        let chooser = XCTAttachment(screenshot: app.screenshot())
        chooser.name = "Record type chooser"
        chooser.lifetime = .keepAlways
        self.add(chooser)
        let diaper = app.webViews.buttons.matching(NSPredicate(format: "label IN %@", ["Diaper", "尿布"])).firstMatch
        diaper.tap()
        let cancel = app.webViews.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "取消"])).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 5))
        cancel.tap()
        XCTAssertTrue(add.waitForExistence(timeout: 5))
        XCTAssertTrue(mine.isSelected)
        add.tap()
        XCTAssertTrue(chooserTitle.waitForExistence(timeout: 5))
        cancel.tap()
        XCTAssertTrue(add.waitForExistence(timeout: 5))
        XCTAssertTrue(mine.isSelected)
    }

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
        let addChild = app.webViews.buttons.matching(
            NSPredicate(format: "label IN %@", ["Add child", "添加宝宝"])
        ).firstMatch
        XCTAssertTrue(addChild.exists)
        let profileY = addChild.frame.minY
        let before = XCTAttachment(screenshot: app.screenshot())
        before.name = "Expanded"
        before.lifetime = .keepAlways
        add(before)
        let scroll = app.webViews.firstMatch
        scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65))
            .press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)), withVelocity: .slow, thenHoldForDuration: 1)
        sleep(2)
        XCTAssertTrue(addChild.isHittable)
        XCTAssertEqual(addChild.frame.minY, profileY, accuracy: 1)
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
