package com.dds.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date
import java.util.Locale

internal class WidgetStore(context: Context) {
    val prefs = context.getSharedPreferences("recent-record-widget", Context.MODE_PRIVATE)
    val snapshot get() = JSONObject(prefs.getString("snapshot", "{}")!!)
    fun selection(id: Int) = prefs.getString("selection.$id", null)?.let(::JSONObject)

    data class Choice(val id: String, val name: String) {
        override fun toString() = name
    }
    fun choices(snapshot: JSONObject, field: String): List<Choice> {
        val array = snapshot.optJSONArray(field) ?: return emptyList()
        return (0 until array.length()).map { index ->
            val choice = array.getJSONObject(index)
            Choice(choice.getString("id"), choice.getString("name"))
        }
    }
}

open class RecentRecordWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val store = WidgetStore(context)
        val snapshot = store.snapshot
        ids.forEach { id ->
            val selection = store.selection(id)
            val child = store.choices(snapshot, "children").find { it.id == selection?.optString("child") }
            val type = store.choices(snapshot, "types").find { it.id == selection?.optString("type") }
            val locale = Locale.forLanguageTag(snapshot.optString("locale", Locale.getDefault().toLanguageTag()))
            val localized = android.content.res.Configuration(context.resources.configuration).apply { setLocale(locale) }
            val strings = context.createConfigurationContext(localized)
            val views = RemoteViews(context.packageName, R.layout.recent_record_widget)
            views.setTextViewText(R.id.widget_baby, child?.name ?: strings.getString(R.string.recent_record))
            views.setTextViewText(R.id.widget_record_type, type?.name ?: "")
            val times = snapshot.optJSONObject("latest")?.optJSONObject(child?.id ?: "")
            val time = type?.let { times?.optDouble(it.id) }?.takeIf { it.isFinite() }?.let { Date((it * 1000).toLong()) }
            val valid = child != null && type != null
            val clock = when {
                !valid -> strings.getString(R.string.widget_reconfigure)
                time == null -> strings.getString(R.string.widget_empty)
                else -> DateFormat.getTimeInstance(DateFormat.SHORT, locale).format(time)
            }
            views.setTextViewText(R.id.widget_record_time, clock)
            views.setTextViewText(R.id.widget_record_date, time?.let { DateFormat.getDateInstance(DateFormat.MEDIUM, locale).format(it) } ?: "")
            val target = if (valid) Intent(context, MainActivity::class.java).setAction(OPEN)
                else Intent(context, RecentRecordConfiguration::class.java).setAction(AppWidgetManager.ACTION_APPWIDGET_CONFIGURE)
            target.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            views.setOnClickPendingIntent(R.id.recent_widget, PendingIntent.getActivity(context, id, target,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            manager.updateAppWidget(id, views)
        }
    }
    override fun onDeleted(context: Context, ids: IntArray) {
        val editor = WidgetStore(context).prefs.edit()
        ids.forEach { editor.remove("selection.$it") }
        editor.apply()
    }
    companion object {
        const val OPEN = "com.dds.app.OPEN_RECENT_RECORD"
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            RecordWidgetKind.entries.forEach { kind ->
                val ids = manager.getAppWidgetIds(ComponentName(context, kind.provider))
                RecentRecordWidget().onUpdate(context, manager, ids)
            }
        }
    }
}

class FeedingRecordWidget : RecentRecordWidget()
class SleepRecordWidget : RecentRecordWidget()
