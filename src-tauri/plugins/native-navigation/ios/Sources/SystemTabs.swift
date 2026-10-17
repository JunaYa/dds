import UIKit
import WebKit
import Tauri

struct SystemTabsOptions: Decodable {
    let session: String
    let page: String
    let titles: [String]
    let visible: Bool
    let theme: String
    let onSelect: Channel
}

struct SystemTabsUpdate: Decodable {
    let session: String
    let page: String
    let titles: [String]
    let visible: Bool
    let theme: String
}

// All tabs share one WebView. UIKit's default crossfade would fade out that same
// view after it has moved to the destination, including the shared profile header.
private final class SharedWebViewTransition: NSObject, UIViewControllerAnimatedTransitioning {
    func transitionDuration(using context: UIViewControllerContextTransitioning?) -> TimeInterval { 0 }

    func animateTransition(using context: UIViewControllerContextTransitioning) {
        guard let destination = context.viewController(forKey: .to),
              let destinationView = context.view(forKey: .to) else {
            context.completeTransition(false)
            return
        }
        UIView.performWithoutAnimation {
            destinationView.frame = context.finalFrame(for: destination)
            context.containerView.addSubview(destinationView)
            destinationView.layoutIfNeeded()
            context.completeTransition(!context.transitionWasCancelled)
        }
    }
}

@available(iOS 26.0, *)
private final class WebTabPage: UIViewController {
    weak var webview: WKWebView?

    override func contentScrollView(for edge: NSDirectionalRectEdge) -> UIScrollView? {
        webview?.scrollView
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        installWebView()
    }

    func installWebView() {
        guard let webview else { return }
        if webview.superview !== view {
            webview.removeFromSuperview()
            webview.translatesAutoresizingMaskIntoConstraints = true
            webview.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            webview.frame = view.bounds
            view.addSubview(webview)
        }
        setContentScrollView(webview.scrollView, for: .all)
    }
}

@available(iOS 26.0, *)
final class SystemTabs: UITabBarController, UITabBarControllerDelegate {
    static let pages = ["Today", "Analysis", "My"]
    private weak var webview: WKWebView?
    private weak var originalHost: UIView?
    private var originalFrame: CGRect = .zero
    private var originalMask: UIView.AutoresizingMask = []
    private var originalTranslates = true
    private var originalBounces = false
    private var originalConstraints: [NSLayoutConstraint] = []
    private var requestedVisible = true
    private var keyboardVisible = false
    private let contentTransition = SharedWebViewTransition()
    var onSelect: ((String) -> Void)?

    init(webview: WKWebView, options: SystemTabsOptions) {
        self.webview = webview
        super.init(nibName: nil, bundle: nil)
        delegate = self
        mode = .tabBar
        tabBarMinimizeBehavior = .onScrollDown
        let symbols = ["book.pages", "chart.bar", "person.crop.circle"]
        viewControllers = Self.pages.enumerated().map { index, page in
            let controller = WebTabPage()
            controller.webview = webview
            controller.tabBarItem = UITabBarItem(title: options.titles[index],
                image: UIImage(systemName: symbols[index]), tag: index)
            controller.tabBarItem.accessibilityIdentifier = "little-days.tab.\(page)"
            return controller
        }
        selectedIndex = Self.pages.firstIndex(of: options.page) ?? 0
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardHidden),
            name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    required init?(coder: NSCoder) { fatalError("Use init(webview:options:)") }
    deinit { NotificationCenter.default.removeObserver(self) }

    func install(in parent: UIViewController, host: UIView) {
        guard let webview else { return }
        originalHost = host
        originalBounces = webview.scrollView.bounces
        webview.scrollView.bounces = true
        originalFrame = webview.frame
        originalMask = webview.autoresizingMask
        originalTranslates = webview.translatesAutoresizingMaskIntoConstraints
        originalConstraints = host.constraints.filter {
            ($0.firstItem as? UIView) === webview || ($0.secondItem as? UIView) === webview
        }
        NSLayoutConstraint.deactivate(originalConstraints)
        parent.addChild(self)
        view.frame = host.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.addSubview(view)
        (selectedViewController as? WebTabPage)?.installWebView()
        didMove(toParent: parent)
        #if DEBUG
        // UIKit keeps short pages expanded; the UI test needs a scrollable fixture.
        if ProcessInfo.processInfo.environment["DDS_UI_TEST_LONG_PAGE"] == "1" {
            webview.evaluateJavaScript("document.body.style.minHeight = '5000px'")
        }
        #endif
    }

    func uninstall() {
        willMove(toParent: nil)
        if let webview, let host = originalHost {
            webview.removeFromSuperview()
            host.addSubview(webview)
            webview.scrollView.bounces = originalBounces
            webview.frame = originalFrame
            webview.autoresizingMask = originalMask
            webview.translatesAutoresizingMaskIntoConstraints = originalTranslates
            NSLayoutConstraint.activate(originalConstraints)
        }
        view.removeFromSuperview()
        removeFromParent()
    }

    func update(page: String, titles: [String], visible: Bool, theme: String) {
        if let index = Self.pages.firstIndex(of: page), selectedIndex != index {
            selectedIndex = index
            (selectedViewController as? WebTabPage)?.installWebView()
        }
        for (index, controller) in (viewControllers ?? []).enumerated() {
            controller.tabBarItem.title = titles[index]
        }
        overrideUserInterfaceStyle = theme == "dark" ? .dark : .light
        requestedVisible = visible
        updateVisibility()
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        (viewController as? WebTabPage)?.installWebView()
        onSelect?(Self.pages[selectedIndex])
    }

    func tabBarController(_ tabBarController: UITabBarController,
                          animationControllerForTransitionFrom fromVC: UIViewController,
                          to toVC: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        contentTransition
    }

    @objc private func keyboardChanged(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let window = view.window else { return }
        keyboardVisible = window.bounds.intersection(window.convert(frame, from: window.screen.coordinateSpace)).height > 0
        updateVisibility()
    }
    @objc private func keyboardHidden() {
        keyboardVisible = false
        updateVisibility()
    }
    private func updateVisibility() {
        setTabBarHidden(!requestedVisible || keyboardVisible, animated: false)
    }
}
