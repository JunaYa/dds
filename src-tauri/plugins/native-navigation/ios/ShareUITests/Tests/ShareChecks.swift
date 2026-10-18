import XCTest
final class ShareChecks: XCTestCase {
    func testShareOpensImportPreview() {
        continueAfterFailure = false
        let receiver = XCUIApplication(bundleIdentifier: "com.dds.app")
        receiver.terminate()
        let host = XCUIApplication(bundleIdentifier: "com.dds.testing.ShareHost")
        host.launch()
        host.buttons["Share test backup"].tap()
        let target = host.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Little days")).firstMatch
        if !target.waitForExistence(timeout: 4) {
            let more = host.buttons.matching(NSPredicate(format: "label IN %@", ["More", "更多"])).firstMatch
            if more.exists { more.tap() }
        }
        let screenshot = XCTAttachment(screenshot: host.screenshot())
        screenshot.name = "Share destinations"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let destination = host.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Little days")).firstMatch
        XCTAssertTrue(destination.waitForExistence(timeout: 10))
        destination.tap()
        let preview = receiver.webViews.staticTexts.matching(NSPredicate(format: "label IN %@", ["Import preview", "导入预览"])).firstMatch
        XCTAssertTrue(preview.waitForExistence(timeout: 20))
        let received = XCTAttachment(screenshot: receiver.screenshot())
        received.name = "Received backup preview"
        received.lifetime = .keepAlways
        add(received)
        receiver.terminate()
        receiver.launch()
        XCTAssertTrue(preview.waitForExistence(timeout: 15))
        let cancel = receiver.webViews.buttons.matching(NSPredicate(format: "label IN %@", ["Cancel", "取消"])).firstMatch
        if !cancel.isHittable { receiver.webViews.firstMatch.swipeUp() }
        cancel.tap()
    }
}
