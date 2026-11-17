package com.dds.audio

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONArray

open class AudioWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { render(context, manager, ids, if (this is SongsAudioWidget) "songs" else "sleep") }
    companion object {
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            listOf(SleepAudioWidget::class.java to "sleep", SongsAudioWidget::class.java to "songs").forEach { (type, category) ->
                render(context, manager, manager.getAppWidgetIds(ComponentName(context, type)), category)
            }
        }
        private fun render(context: Context, manager: AppWidgetManager, ids: IntArray, category: String) {
            val prefs = context.getSharedPreferences("little-days-audio", Context.MODE_PRIVATE)
            val tracks = JSONArray(prefs.getString("tracks", "[]"))
            val available = (0 until tracks.length()).any { tracks.getJSONObject(it).optString("category") == category }
            val current = (0 until tracks.length()).map { tracks.getJSONObject(it) }.firstOrNull { it.optString("id") == prefs.getString("trackId", null) }
            val playing = prefs.getBoolean("playing", false) && current?.optString("category") == category
            ids.forEach { id ->
                val selected = prefs.getString("widget.$id", null)
                val chosen = (0 until tracks.length()).map { tracks.getJSONObject(it) }.firstOrNull { it.optString("id") == selected && it.optString("category") == category }
                val views = RemoteViews(context.packageName, R.layout.audio_widget)
                views.setTextViewText(R.id.audio_category, context.getString(if (category == "sleep") R.string.audio_sleep else R.string.audio_songs))
                views.setTextViewText(R.id.audio_title, if (chosen != null) chosen.optString("title") else context.getString(R.string.audio_choose))
                views.setTextViewText(R.id.audio_action, context.getString(if (playing) R.string.audio_pause else R.string.audio_play))
                val pending = if (available) {
                    val intent = Intent(context, PlaybackService::class.java).setAction("com.dds.audio.WIDGET").putExtra("category", category).putExtra("pause", playing).putExtra("trackId", chosen?.getString("id"))
                    if (!playing && android.os.Build.VERSION.SDK_INT >= 26) PendingIntent.getForegroundService(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    else PendingIntent.getService(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                } else PendingIntent.getActivity(context, id, context.packageManager.getLaunchIntentForPackage(context.packageName), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.audio_action, pending)
                manager.updateAppWidget(id, views)
            }
        }
    }
}
class SleepAudioWidget : AudioWidget()
class SongsAudioWidget : AudioWidget()
