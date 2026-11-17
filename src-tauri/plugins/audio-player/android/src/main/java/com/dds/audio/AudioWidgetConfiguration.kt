package com.dds.audio

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import org.json.JSONArray

class AudioWidgetConfiguration : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        val manager = AppWidgetManager.getInstance(this)
        val category = if (manager.getAppWidgetInfo(id)?.provider?.className == SongsAudioWidget::class.java.name) "songs" else "sleep"
        val prefs = getSharedPreferences("little-days-audio", Context.MODE_PRIVATE)
        val tracks = JSONArray(prefs.getString("tracks", "[]"))
        val choices = (0 until tracks.length()).map { tracks.getJSONObject(it) }.filter { it.optString("category") == category }
        if (choices.isEmpty()) {
            AlertDialog.Builder(this).setMessage(R.string.audio_choose).setPositiveButton(android.R.string.ok) { _, _ -> finish() }.setOnCancelListener { finish() }.show()
            return
        }
        AlertDialog.Builder(this).setTitle(if (category == "sleep") R.string.audio_sleep else R.string.audio_songs)
            .setItems(choices.map { it.getString("title") }.toTypedArray()) { _, index ->
                prefs.edit().putString("widget.$id", choices[index].getString("id")).apply()
                AudioWidget.refresh(this)
                setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)); finish()
            }.setOnCancelListener { finish() }.show()
    }
}
