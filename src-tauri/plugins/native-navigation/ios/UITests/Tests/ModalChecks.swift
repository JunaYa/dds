import XCTest

final class ModalChecks: XCTestCase {
    private func text(_ app: XCUIApplication, _ labels: [String]) -> XCUIElement {
        app.webViews.staticTexts.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
    }

    private func button(_ app: XCUIApplication, _ labels: [String]) -> XCUIElement {
        app.webViews.buttons.matching(NSPredicate(format: "label IN %@", labels)).firstMatch
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testSheetGesturesAndKeyboard() {
        let app = XCUIApplication(bundleIdentifier: "com.dds.app")
        app.launch()
        let addRecord = app.buttons["little-days.add-record"]
        XCTAssertTrue(addRecord.waitForExistence(timeout: 20))
        addRecord.tap()
        let title = text(app, ["Capture a little moment", "记下一个小瞬间"])
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        capture(app, "Chooser - unified surface")

        let start = title.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: 20)), withVelocity: .slow, thenHoldForDuration: 0.3)
        XCTAssertTrue(title.exists, "A short drag must return to its resting position")
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 0, dy: 300)), withVelocity: .slow, thenHoldForDuration: 0.1)
        XCTAssertTrue(addRecord.waitForExistence(timeout: 5))
        XCTAssertTrue(addRecord.isHittable, "Dragging the title must dismiss the chooser")

        addRecord.tap()
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        button(app, ["Diaper", "尿布"]).tap()
        let close = button(app, ["Close dialog", "关闭弹框"])
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        capture(app, "Editor - centered title")
        let notes = app.webViews.textViews.firstMatch
        XCTAssertTrue(notes.exists)
        if !notes.isHittable { app.webViews.firstMatch.swipeUp() }
        notes.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let save = button(app, ["Save record", "保存记录"])
        let fieldVisible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            notes.frame.minY >= close.frame.maxY && notes.frame.maxY <= save.frame.minY - 4
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [fieldVisible], timeout: 5), .completed,
                       "The focused notes field must be between the header and the sticky actions")
        XCTAssertTrue(close.isHittable, "The close control must remain reachable above the keyboard")
        capture(app, "Editor - keyboard")
        close.tap()
        XCTAssertTrue(addRecord.waitForExistence(timeout: 5))
        XCTAssertTrue(addRecord.isHittable)
        app.terminate()
    }
}
