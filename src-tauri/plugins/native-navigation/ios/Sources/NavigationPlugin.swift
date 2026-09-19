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
    let onAction: Channel?
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
private final class GlassHeader: UIVisualEffectView {
    private let titleLabel = UILabel()
    private let createButton = UIButton(type: .system)
    var onAction: ((String) -> Void)?

    init(page: JournalPage) {
        let glass = UIGlassEffect(style: .regular)
        glass.isInteractive = true
        super.init(effect: glass)
        cornerConfiguration = .capsule()
        accessibilityIdentifier = "journal.native-header"
        isHidden = true

        titleLabel.font = UIFontMetrics(forTextStyle: .headline).scaledFont(
            for: .systemFont(ofSize: 17, weight: .semibold), maximumPointSize: 24)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.textColor = .label
        titleLabel.accessibilityTraits = .header
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        let searchButton = button(symbol: "magnifyingglass", label: "搜索记录", action: "search")
        let moreButton = button(symbol: "ellipsis", label: "更多操作")
        moreButton.showsMenuAsPrimaryAction = true
        moreButton.menu = UIMenu(children: [
            menuAction(title: "图片速记", symbol: "doc.viewfinder", action: "capture"),
            menuAction(title: "提醒与安排", symbol: "bell", action: "reminders"),
            menuAction(title: "循环计划", symbol: "repeat", action: "plan"),
        ])

        var configuration = UIButton.Configuration.filled()
        configuration.image = UIImage(systemName: "plus")
        configuration.baseForegroundColor = .white
        configuration.baseBackgroundColor = .systemBlue
        configuration.cornerStyle = .capsule
        createButton.configuration = configuration
        createButton.accessibilityIdentifier = "journal.header.create"
        createButton.addAction(UIAction { [weak self] _ in self?.onAction?("create") },
            for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [titleLabel, searchButton, moreButton, createButton])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -6),
            stack.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 6),
            stack.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -6),
        ])
        for control in [searchButton, moreButton, createButton] {
            NSLayoutConstraint.activate([
                control.widthAnchor.constraint(equalToConstant: 44),
                control.heightAnchor.constraint(equalToConstant: 44),
            ])
            control.showsLargeContentViewer = true
            control.largeContentImage = control.configuration?.image
            control.addInteraction(UILargeContentViewerInteraction())
        }
        contentView.accessibilityElements = [titleLabel, searchButton, moreButton, createButton]
        update(page: page, visible: false)
    }

    required init?(coder: NSCoder) { fatalError("Use init(page:)") }

    func update(page: JournalPage, visible: Bool) {
        titleLabel.text = page.title
        createButton.accessibilityLabel = page == .types ? "新建类型" : "记一笔"
        createButton.largeContentTitle = createButton.accessibilityLabel
        isHidden = !visible
    }

    private func button(symbol: String, label: String, action: String? = nil) -> UIButton {
        let button = UIButton(type: .system)
        var configuration = UIButton.Configuration.plain()
        configuration.image = UIImage(systemName: symbol)
        configuration.baseForegroundColor = .label
        configuration.preferredSymbolConfigurationForImage = .init(pointSize: 19, weight: .medium)
        button.configuration = configuration
        button.accessibilityLabel = label
        button.largeContentTitle = label
        button.accessibilityIdentifier = "journal.header.\(action ?? "more")"
        if let action = action {
            button.addAction(UIAction { [weak self] _ in self?.onAction?(action) },
                for: .touchUpInside)
        }
        return button
    }

    private func menuAction(title: String, symbol: String, action: String) -> UIAction {
        UIAction(title: title, image: UIImage(systemName: symbol)) { [weak self] _ in
            self?.onAction?(action)
        }
    }
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
    private var header: UIView?
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
            self.header?.removeFromSuperview()
            self.header = nil
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
            if let onAction = args.onAction {
                let header = GlassHeader(page: args.page)
                header.onAction = { action in onAction.send(["action": action] as JsonObject) }
                header.translatesAutoresizingMaskIntoConstraints = false
                host.addSubview(header)
                let headerWidth = header.widthAnchor.constraint(
                    equalTo: host.safeAreaLayoutGuide.widthAnchor, constant: -24)
                headerWidth.priority = .defaultHigh
                NSLayoutConstraint.activate([
                    header.centerXAnchor.constraint(equalTo: host.safeAreaLayoutGuide.centerXAnchor),
                    header.topAnchor.constraint(equalTo: host.safeAreaLayoutGuide.topAnchor, constant: 8),
                    header.heightAnchor.constraint(equalToConstant: 56),
                    header.widthAnchor.constraint(lessThanOrEqualToConstant: 560),
                    headerWidth,
                ])
                self.header = header
            }
            self.session = args.session
            invoke.resolve(["supported": true, "headerSupported": self.header != nil])
        }
    }

    @objc func update(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(UpdateOptions.self)
        DispatchQueue.main.async {
            if #available(iOS 26.0, *), self.session == args.session,
               let bar = self.navigation as? GlassNavigation {
                bar.update(page: args.page, visible: args.visible)
                (self.header as? GlassHeader)?.update(page: args.page, visible: args.visible)
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
                self.header?.removeFromSuperview()
                self.header = nil
                self.session = nil
            }
            invoke.resolve()
        }
    }
}

@_cdecl("init_plugin_native_navigation")
func initPlugin() -> Plugin { NavigationPlugin() }
