import Tauri
import UIKit
import WebKit

private enum JournalPage: String, Decodable, CaseIterable {
    case today, board, library, types

    var title: String {
        switch self {
        case .today: return "今天"
        case .board: return "我的看板"
        case .library: return "记录库"
        case .types: return "记录类型"
        }
    }

    var symbol: String {
        switch self {
        case .today: return "sun.max"
        case .board: return "square.grid.2x2"
        case .library: return "book.closed"
        case .types: return "square.3.layers.3d"
        }
    }
}

private struct AttachOptions: Decodable {
    let session: String
    let page: JournalPage
    let onSelect: Channel
}

private struct UpdateOptions: Decodable {
    let session: String
    let page: JournalPage
    let visible: Bool
}

private struct DetachOptions: Decodable {
    let session: String
}

@available(iOS 26.0, *)
private final class GlassNavigation: UIVisualEffectView {
    private var buttons: [JournalPage: UIButton] = [:]
    private var requestedVisible = false
    private var keyboardVisible = false
    var onSelect: ((JournalPage) -> Void)?

    init(page: JournalPage) {
        let glass = UIGlassEffect(style: .regular)
        glass.isInteractive = true
        super.init(effect: glass)
        cornerConfiguration = .capsule()
        accessibilityIdentifier = "journal.native-navigation"
        isHidden = true

        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 2
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 7),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -7),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 5),
            stack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -5),
        ])
        for item in JournalPage.allCases {
            let button = UIButton(type: .system)
            var configuration = UIButton.Configuration.plain()
            configuration.title = item.title
            configuration.image = UIImage(systemName: item.symbol)
            configuration.imagePlacement = .top
            configuration.imagePadding = 4
            configuration.preferredSymbolConfigurationForImage = .init(pointSize: 20, weight: .medium)
            configuration.contentInsets = .init(top: 6, leading: 2, bottom: 6, trailing: 2)
            configuration.cornerStyle = .capsule
            configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
                var outgoing = incoming
                outgoing.font = UIFontMetrics(forTextStyle: .caption2).scaledFont(
                    for: .systemFont(ofSize: 11, weight: .medium), maximumPointSize: 14)
                return outgoing
            }
            button.configuration = configuration
            button.configurationUpdateHandler = { control in
                var style = control.configuration
                style?.baseForegroundColor = control.isSelected ? .systemBlue : .label
                style?.background.backgroundColor = control.isSelected
                    ? UIColor.systemBlue.withAlphaComponent(0.12) : .clear
                control.configuration = style
            }
            button.accessibilityLabel = item.title
            button.accessibilityIdentifier = "journal.nav.\(item.rawValue)"
            button.showsLargeContentViewer = true
            button.largeContentTitle = item.title
            button.largeContentImage = configuration.image
            button.addInteraction(UILargeContentViewerInteraction())
            button.addAction(UIAction { [weak self] _ in self?.onSelect?(item) }, for: .touchUpInside)
            buttons[item] = button
            stack.addArrangedSubview(button)
        }
        select(page)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardChanged(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardHidden),
            name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    required init?(coder: NSCoder) { fatalError("Use init(page:)") }

    deinit { NotificationCenter.default.removeObserver(self) }

    func update(page: JournalPage, visible: Bool) {
        select(page)
        requestedVisible = visible
        updateVisibility()
    }

    private func select(_ page: JournalPage) {
        for (item, button) in buttons {
            button.isSelected = item == page
            button.accessibilityTraits = item == page ? [.button, .selected] : .button
        }
    }

    @objc private func keyboardChanged(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let window = window else { return }
        let keyboardFrame = window.convert(frame, from: window.screen.coordinateSpace)
        keyboardVisible = window.bounds.intersection(keyboardFrame).height > 0
        updateVisibility()
    }

    @objc private func keyboardHidden() {
        keyboardVisible = false
        updateVisibility()
    }

    private func updateVisibility() {
        isHidden = !requestedVisible || keyboardVisible
    }
}

class NavigationPlugin: Plugin {
    private weak var webview: WKWebView?
    private var navigation: UIView?
    private var session: String?

    @objc override func load(webview: WKWebView) {
        self.webview = webview
    }

    @objc func attach(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(AttachOptions.self)
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *) else {
                invoke.resolve(["supported": false])
                return
            }
            guard let host = self.webview?.superview else {
                invoke.reject("The journal WebView is not attached to a window")
                return
            }
            self.navigation?.removeFromSuperview()
            let bar = GlassNavigation(page: args.page)
            bar.onSelect = { page in args.onSelect.send(["page": page.rawValue] as JsonObject) }
            bar.translatesAutoresizingMaskIntoConstraints = false
            host.addSubview(bar)
            let width = bar.widthAnchor.constraint(equalTo: host.safeAreaLayoutGuide.widthAnchor, constant: -24)
            width.priority = .defaultHigh
            NSLayoutConstraint.activate([
                bar.centerXAnchor.constraint(equalTo: host.safeAreaLayoutGuide.centerXAnchor),
                bar.bottomAnchor.constraint(equalTo: host.safeAreaLayoutGuide.bottomAnchor, constant: -8),
                bar.heightAnchor.constraint(equalToConstant: 70),
                bar.widthAnchor.constraint(lessThanOrEqualToConstant: 560),
                width,
            ])
            self.navigation = bar
            self.session = args.session
            invoke.resolve(["supported": true])
        }
    }

    @objc func update(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(UpdateOptions.self)
        DispatchQueue.main.async {
            if #available(iOS 26.0, *), self.session == args.session,
               let bar = self.navigation as? GlassNavigation {
                bar.update(page: args.page, visible: args.visible)
            }
            invoke.resolve()
        }
    }

    @objc func detach(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(DetachOptions.self)
        DispatchQueue.main.async {
            if self.session == args.session {
                self.navigation?.removeFromSuperview()
                self.navigation = nil
                self.session = nil
            }
            invoke.resolve()
        }
    }
}

@_cdecl("init_plugin_native_navigation")
func initPlugin() -> Plugin { NavigationPlugin() }
