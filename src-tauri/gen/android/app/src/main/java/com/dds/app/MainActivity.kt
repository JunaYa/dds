package com.dds.app

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private var journalWebView: WebView? = null

  private fun receiveWidget(intent: Intent?) {
    if (intent?.action != RecentRecordWidget.OPEN) return
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    val store = WidgetStore(this)
    val request = store.selection(id) ?: return
    request.put("id", java.util.UUID.randomUUID().toString())
    synchronized(WidgetStore::class.java) {
      store.prefs.edit().putString("pending", request.toString()).apply()
    }
    journalWebView?.evaluateJavascript("window.dispatchEvent(new Event('little-days-widget-request'))", null)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    receiveWidget(intent)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    journalWebView = webView
    webView.isVerticalScrollBarEnabled = false
    webView.overScrollMode = View.OVER_SCROLL_NEVER
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    if (savedInstanceState == null) receiveWidget(intent)
    super.onCreate(savedInstanceState)

    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, windowInsets ->
      val types = WindowInsetsCompat.Type.systemBars() or
        WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
      val insets = windowInsets.getInsets(types)
      view.setPadding(insets.left, insets.top, insets.right, insets.bottom)

      // The native container owns these insets, including on older WebViews.
      // Forward zero values so CSS and visualViewport do not apply them twice.
      WindowInsetsCompat.Builder(windowInsets)
        .setInsets(types, Insets.NONE)
        .build()
    }
    ViewCompat.requestApplyInsets(content)
  }
}
