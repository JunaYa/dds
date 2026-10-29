package com.dds.app

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.isVerticalScrollBarEnabled = false
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
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
