import UIKit

struct ModalInteractionOptions: Decodable {
    let session: String
    let active: Bool
}

final class ModalInteraction {
    private struct Settings {
        let bounces: Bool
        let bouncesZoom: Bool
        let horizontalBounce: Bool
        let directionalLock: Bool
        let pinchEnabled: Bool
        let zoom: CGFloat
        let maximumZoom: CGFloat
        let offset: CGPoint
    }

    private weak var scrollView: UIScrollView?
    private var sessions = Set<String>()
    private var settings: Settings?
    private var offsetObservation: NSKeyValueObservation?
    private var zoomObservation: NSKeyValueObservation?

    init(scrollView: UIScrollView) {
        self.scrollView = scrollView
    }

    // Session ownership prevents an old WebView effect from unlocking a newer modal.
    func update(session: String, active: Bool) {
        if active { sessions.insert(session) }
        else { sessions.remove(session) }
        guard let scrollView else { return }
        if !sessions.isEmpty, settings == nil {
            settings = Settings(bounces: scrollView.bounces, bouncesZoom: scrollView.bouncesZoom,
                                horizontalBounce: scrollView.alwaysBounceHorizontal,
                                directionalLock: scrollView.isDirectionalLockEnabled,
                                pinchEnabled: scrollView.pinchGestureRecognizer?.isEnabled ?? false,
                                zoom: scrollView.zoomScale, maximumZoom: scrollView.maximumZoomScale,
                                offset: scrollView.contentOffset)
            scrollView.bounces = false
            scrollView.bouncesZoom = false
            scrollView.alwaysBounceHorizontal = false
            scrollView.isDirectionalLockEnabled = true
            scrollView.pinchGestureRecognizer?.isEnabled = false
            scrollView.setZoomScale(scrollView.minimumZoomScale, animated: false)
            scrollView.maximumZoomScale = scrollView.minimumZoomScale
            scrollView.setContentOffset(CGPoint(x: -scrollView.adjustedContentInset.left, y: scrollView.contentOffset.y), animated: false)
            offsetObservation = scrollView.observe(\.contentOffset, options: [.new]) { [weak self] view, _ in
                let origin = -view.adjustedContentInset.left
                guard let self, !self.sessions.isEmpty, abs(view.contentOffset.x - origin) > 0.5 else { return }
                view.setContentOffset(CGPoint(x: origin, y: view.contentOffset.y), animated: false)
            }
            // WebKit can reset zoom limits when its visual viewport changes.
            zoomObservation = scrollView.observe(\.zoomScale, options: [.new]) { [weak self] view, _ in
                guard let self, !self.sessions.isEmpty,
                      abs(view.zoomScale - view.minimumZoomScale) > 0.01 else { return }
                view.setZoomScale(view.minimumZoomScale, animated: false)
            }
        } else if sessions.isEmpty, let saved = settings {
            offsetObservation = nil
            zoomObservation = nil
            settings = nil
            scrollView.bounces = saved.bounces
            scrollView.bouncesZoom = saved.bouncesZoom
            scrollView.alwaysBounceHorizontal = saved.horizontalBounce
            scrollView.isDirectionalLockEnabled = saved.directionalLock
            scrollView.pinchGestureRecognizer?.isEnabled = saved.pinchEnabled
            scrollView.maximumZoomScale = saved.maximumZoom
            scrollView.setZoomScale(saved.zoom, animated: false)
            scrollView.setContentOffset(saved.offset, animated: false)
        }
    }
}
