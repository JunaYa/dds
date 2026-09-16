/**
 * Environment-independent identity atoms — the single source of truth for the
 * canonical product/marketing URLs and the native store/app identifiers.
 * App config derives its own presentation shapes from these; never hardcode
 * these values in an app. Pure data (no React) so Astro and Node can import it.
 *
 * Per-environment values (dev/staging API origins) are NOT here — those stay on
 * `VITE_*` env vars.
 */

/** Marketing site origin. */
export const SITE_URL = 'https://ancher.ai'
/** Product app production origin. */
export const APP_URL = 'https://app.ancher.ai'

/** Apple App Store numeric ID (iOS Smart App Banner `app-id`). */
export const APP_STORE_ID = '6759999347'
/** Android applicationId, used as the Intent URL `package`. */
export const ANDROID_PACKAGE = 'one.streamify.app'
/** Custom URL scheme the native app registers. */
export const URL_SCHEME = 'streamify'
/** Chrome Web Store extension ID assigned to the published listing. */
export const CHROME_EXTENSION_ID = 'mgikcgjogcmompkcppkpdolnlbckpeno'

/** Canonical bare App Store listing URL. */
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}` as const
/** Canonical Play Store listing URL. */
export const PLAY_STORE_URL =
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}` as const
/**
 * Canonical bare Chrome Web Store listing URL. The ID-only form is used
 * deliberately — it survives listing-title changes (the store redirects it to
 * the current slug) and carries no share-tracking query.
 */
export const CHROME_STORE_URL =
  `https://chromewebstore.google.com/detail/${CHROME_EXTENSION_ID}` as const
