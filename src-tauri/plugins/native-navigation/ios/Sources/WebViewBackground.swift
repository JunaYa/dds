import UIKit
import WebKit

final class WebViewBackground {
    private var observation: NSKeyValueObservation?

    init(webview: WKWebView) {
        webview.isOpaque = false
        observation = webview.observe(\.themeColor, options: [.initial, .new]) { view, _ in
            let color = view.themeColor ?? .systemBackground
            view.backgroundColor = color
            view.scrollView.backgroundColor = color
            view.underPageBackgroundColor = color
            Self.syncContainers(for: view)
        }
    }

    static func syncContainers(for webview: WKWebView) {
        let color = webview.backgroundColor ?? .systemBackground
        var container = webview.superview
        while let view = container {
            view.backgroundColor = color
            container = view.superview
        }
    }
}
