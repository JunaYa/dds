import XCTest
import WebKit
final class BackgroundTests: XCTestCase {
    @MainActor
    func testModalCloseKeepsPageBounceDisabledAndScrollingEnabled() {
        let scrollView = UIScrollView()
        scrollView.bounces = false
        let deceleration = scrollView.decelerationRate
        let interaction = ModalInteraction(scrollView: scrollView)
        interaction.update(session: "first", active: true)
        interaction.update(session: "second", active: true)
        interaction.update(session: "first", active: false)
        XCTAssertFalse(scrollView.bounces)
        interaction.update(session: "second", active: false)
        XCTAssertFalse(scrollView.bounces)
        XCTAssertTrue(scrollView.isScrollEnabled)
        XCTAssertEqual(scrollView.decelerationRate, deceleration)
    }

    @MainActor
    func testPageBackgroundFollowsThemeWithoutDisablingBounce() async throws {
        let webview = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        let host = UIView(frame: webview.frame)
        host.backgroundColor = .black
        UIApplication.shared.windows.first?.rootViewController?.view.addSubview(host)
        host.addSubview(webview)
        defer { host.removeFromSuperview() }
        webview.scrollView.bounces = true
        let background = WebViewBackground(webview: webview)
        webview.loadHTMLString("<meta name='theme-color' content='#111110'><style>html,body{background:#111110}body{height:2000px}</style>", baseURL: nil)
        for _ in 0..<100 {
            if webview.themeColor != nil { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertNotNil(webview.themeColor)
        XCTAssertEqual(webview.underPageBackgroundColor, webview.themeColor)
        XCTAssertEqual(webview.scrollView.backgroundColor, webview.themeColor)
        XCTAssertEqual(webview.backgroundColor, webview.themeColor)
        XCTAssertEqual(host.backgroundColor, webview.themeColor)
        XCTAssertFalse(webview.isOpaque)
        XCTAssertTrue(webview.scrollView.bounces)
        try await webview.evaluateJavaScript("document.documentElement.style.backgroundColor='#f9f9f8';document.body.style.backgroundColor='#f9f9f8';document.querySelector('meta').content='#f9f9f8'")
        for _ in 0..<100 {
            if webview.themeColor == UIColor(red: 249/255, green: 249/255, blue: 248/255, alpha: 1) { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTAssertEqual(webview.underPageBackgroundColor, webview.themeColor)
        XCTAssertEqual(webview.scrollView.backgroundColor, webview.themeColor)
        XCTAssertEqual(host.backgroundColor, webview.themeColor)
        XCTAssertTrue(webview.scrollView.bounces)
        withExtendedLifetime(background) {}
    }
}
