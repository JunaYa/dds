package com.dds.app

import android.app.Activity
import androidx.annotation.Keep
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@Keep
@TauriPlugin
class RecentRecordPlugin(private val activity: Activity) : Plugin(activity) {
    private val store = WidgetStore(activity)

    @Command fun updateWidgetSnapshot(invoke: Invoke) {
        val raw = invoke.getArgs().toString()
        if (store.prefs.getString("snapshot", null) != raw) {
            store.prefs.edit().putString("snapshot", raw).apply()
            RecentRecordWidget.refresh(activity)
        }
        invoke.resolve()
    }
    @Command fun nextWidgetRequest(invoke: Invoke) {
        val pending = store.prefs.getString("pending", null)
        if (pending == null) invoke.resolve() else invoke.resolve(JSObject(pending))
    }
    @Command fun dismissWidgetRequest(invoke: Invoke) {
        synchronized(WidgetStore::class.java) {
            val pending = store.prefs.getString("pending", null)
            if (pending != null && JSObject(pending).getString("id") == invoke.getArgs().getString("id"))
                store.prefs.edit().remove("pending").apply()
        }
        invoke.resolve()
    }
}
