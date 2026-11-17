package com.dds.audio

import android.app.Activity
import android.content.ComponentName
import android.os.Bundle
import androidx.annotation.Keep
import androidx.media3.session.MediaController
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionToken
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@Keep
@TauriPlugin
class AudioPlayerPlugin(private val activity: Activity) : Plugin(activity) {
    private val connection by lazy { MediaController.Builder(activity, SessionToken(activity, ComponentName(activity, PlaybackService::class.java))).buildAsync() }
    override fun onDestroy() { MediaController.releaseFuture(connection) }
    @Command fun snapshot(invoke: Invoke) = dispatch(invoke, "snapshot", "{}")
    @Command fun execute(invoke: Invoke) = dispatch(invoke, "execute", invoke.getArgs().getJSONObject("command").toString())
    private fun dispatch(invoke: Invoke, operation: String, json: String) {
        activity.runOnUiThread {
            val future = connection
            val executor = java.util.concurrent.Executor { runnable -> activity.runOnUiThread(runnable) }
            future.addListener({
                try {
                    val controller = future.get()
                    val args = Bundle().apply { putString("command", json) }
                    val result = controller.sendCustomCommand(SessionCommand(operation, Bundle.EMPTY), args)
                    result.addListener({
                        try {
                            val response = result.get()
                            val error = response.extras.getString("error")
                            if (error != null) invoke.reject(error)
                            else invoke.resolve(JSObject(response.extras.getString("state") ?: "{}"))
                        } catch (error: Exception) { invoke.reject(error.message ?: "Audio command failed") }

                    }, executor)
                } catch (error: Exception) { invoke.reject(error.message ?: "Audio service unavailable") }
            }, executor)
        }
    }
}
