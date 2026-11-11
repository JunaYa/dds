package com.dds.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

class RecentRecordConfiguration : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val manager = AppWidgetManager.getInstance(this)
        if (manager.getAppWidgetInfo(id)?.provider != ComponentName(this, RecentRecordWidget::class.java)) {
            finish()
            return
        }
        title = getString(R.string.recent_record)
        val store = WidgetStore(this)
        val snapshot = store.snapshot
        val scroll = ScrollView(this)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val padding = (20 * resources.displayMetrics.density).toInt()
        layout.setPadding(padding, padding, padding, padding)
        scroll.addView(layout)
        setContentView(scroll)
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        layout.addView(TextView(this).apply { text = title; textSize = 24f })
        val children = store.choices(snapshot, "children")
        val types = store.choices(snapshot, "types")
        if (children.isEmpty() || types.isEmpty()) {
            layout.addView(Button(this).apply {
                setText(R.string.widget_setup)
                setOnClickListener { startActivity(Intent(context, MainActivity::class.java)); finish() }
            })
            return
        }
        fun picker(label: Int, options: List<WidgetStore.Choice>, selected: String): Spinner {
            val spinner = Spinner(this).apply {
                this.id = android.view.View.generateViewId()
                minimumHeight = (48 * resources.displayMetrics.density).toInt()
                adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, options)
                setSelection(options.indexOfFirst { it.id == selected }.coerceAtLeast(0))
            }
            layout.addView(TextView(this).apply { setText(label); labelFor = spinner.id })
            layout.addView(spinner)
            return spinner
        }
        val selection = store.selection(id)
        val child = picker(R.string.widget_child, children, savedInstanceState?.getString("child")
            ?: selection?.optString("child") ?: snapshot.optString("currentChild"))
        val type = picker(R.string.widget_type, types, savedInstanceState?.getString("type") ?: selection?.optString("type").orEmpty())
        selections = { JSONObject().put("child", (child.selectedItem as WidgetStore.Choice).id)
            .put("type", (type.selectedItem as WidgetStore.Choice).id) }
        layout.addView(Button(this).apply {
            setText(R.string.widget_save)
            setOnClickListener {
                store.prefs.edit().putString("selection.$id", selections!!().toString()).apply()
                RecentRecordWidget().onUpdate(context, manager, intArrayOf(id))
                setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id))
                finish()
            }
        })
    }
    private var selections: (() -> JSONObject)? = null
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        selections?.invoke()?.let { outState.putString("child", it.getString("child")); outState.putString("type", it.getString("type")) }
    }
}
