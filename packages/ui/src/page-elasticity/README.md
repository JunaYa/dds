# PageElasticity

Wrap the document's page content once to add a touch-only pull response at both scroll boundaries. Normal scrolling and deceleration remain native. The component uses passive touch listeners and a viewport-relative pull limit of 24–40px (4.5% of viewport height). A rational resistance curve starts at half the finger's displacement and progressively stiffens. It does not change scroll offsets or prevent default touch behavior.

Reversing direction directly unwinds the current pull; it does not start an animation or discard the gesture. Once the pull reaches zero, subsequent movement can scroll normally or start another edge pull without lifting the finger. Native scrolling remains free to respond throughout the gesture.

On release, a critically damped Motion spring inherits recent rendered velocity. Direction changes replace stale velocity immediately, and a hold longer than 80ms releases from rest. Initial spring velocity is bounded by the current displacement and remaining pull allowance to avoid crossing rest or exceeding the limit. Touching an active return takes over its current position without snapping.

Keep fixed navigation, floating controls, toasts and portaled overlays outside the component. Its outer wrapper clips transformed content so pulling cannot increase document overflow. The surrounding page must provide its background color.

Set `enabled={false}` while an overlay is open. Change `resetKey` when navigating or switching the displayed account or profile. These changes immediately clear any active pull. Reduced motion, multiple touches, horizontal gestures, editable controls and nested scrollers do not trigger the effect.

Disable platform overscroll separately: `overscroll-behavior-y: none` for the document, `UIScrollView.bounces = false` for iOS WebViews, and `View.OVER_SCROLL_NEVER` for Android WebViews. Keep native scrolling and deceleration enabled. The component owns the inner element's inline transform.
