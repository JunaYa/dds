# PageElasticity

Wrap the document's page content once to add a touch-only pull response at both scroll boundaries. Normal scrolling and deceleration remain native. The component uses passive touch listeners, limits translation to 18px with increasing resistance, and returns with an interruptible Motion spring. It does not change scroll offsets or prevent default touch behavior.

Keep fixed navigation, floating controls, toasts and portaled overlays outside the component. Its outer wrapper clips transformed content so pulling cannot increase document overflow. The surrounding page must provide its background color.

Set `enabled={false}` while an overlay is open. Change `resetKey` when navigating or switching the displayed account or profile. These changes immediately clear any active pull. Reduced motion, multiple touches, horizontal gestures, editable controls and nested scrollers do not trigger the effect.

Disable platform overscroll separately: `overscroll-behavior-y: none` for the document, `UIScrollView.bounces = false` for iOS WebViews, and `View.OVER_SCROLL_NEVER` for Android WebViews. Keep native scrolling and deceleration enabled. The component owns the inner element's inline transform.
