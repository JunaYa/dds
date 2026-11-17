package com.dds.audio

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class PlaybackService : MediaSessionService() {
    private lateinit var player: ExoPlayer
    private lateinit var session: MediaSession
    private val prefs by lazy { getSharedPreferences("little-days-audio", Context.MODE_PRIVATE) }
    private val handler = Handler(Looper.getMainLooper())
    private var tracks = JSONArray()
    private var trackId: String? = null
    private var checkpoint = 0L
    private var repeating = true
    private var deadline: Long? = null
    private var error: String? = null
    private var count = 0
    private val pulse = object : Runnable {
        override fun run() {
            expire()
            if (++count % 5 == 0) persist(refresh = false)
            handler.postDelayed(this, 1000)
        }
    }
    override fun onCreate() {
        super.onCreate()
        try {
            tracks = JSONArray(prefs.getString("tracks", "[]"))
            trackId = prefs.getString("trackId", null)
            checkpoint = prefs.getLong("position", 0)
            repeating = prefs.getBoolean("repeat", true)
        } catch (failure: Exception) { error = failure.message }
        player = ExoPlayer.Builder(this).build().apply {
            setWakeMode(C.WAKE_MODE_LOCAL)
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            setHandleAudioBecomingNoisy(true)
            repeatMode = if (repeating) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) { persist() }
                override fun onPlayerError(failure: PlaybackException) { error = failure.localizedMessage; persist() }
            })
        }
        session = MediaSession.Builder(this, player).setCallback(object : MediaSession.Callback {
            override fun onConnect(session: MediaSession, controller: MediaSession.ControllerInfo): MediaSession.ConnectionResult {
                val commands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                if (controller.packageName == packageName) {
                    commands.add(SessionCommand("snapshot", Bundle.EMPTY)); commands.add(SessionCommand("execute", Bundle.EMPTY))
                }
                return MediaSession.ConnectionResult.AcceptedResultBuilder(session).setAvailableSessionCommands(commands.build()).build()
            }
            override fun onCustomCommand(session: MediaSession, controller: MediaSession.ControllerInfo, command: SessionCommand, args: Bundle): ListenableFuture<SessionResult> {
                val extras = Bundle()
                try {
                    require(controller.packageName == packageName) { "Audio command not permitted" }
                    if (command.customAction == "execute") execute(JSONObject(args.getString("command") ?: "{}"))
                    extras.putString("state", snapshot().toString())
                } catch (failure: Exception) { error = failure.message; extras.putString("error", failure.message ?: "Audio command failed") }
                return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS, extras))
            }
        }).build()
        handler.post(pulse)
    }
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = session
    override fun onDestroy() {
        player.pause(); persist(); handler.removeCallbacksAndMessages(null); session.release(); player.release(); super.onDestroy()
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "com.dds.audio.WIDGET") {
            try {
                val category = intent.getStringExtra("category") ?: "sleep"
                val selected = intent.getStringExtra("trackId")
                val id = (0 until tracks.length()).map { tracks.getJSONObject(it) }.firstOrNull { it.optString("category") == category && (selected == null || it.optString("id") == selected) }?.getString("id")
                if (intent.getBooleanExtra("pause", false)) execute(JSONObject().put("op", "pause").put("id", id ?: JSONObject.NULL))
                else if (id != null) execute(JSONObject().put("op", "play").put("id", id))
            } catch (failure: Exception) { error = failure.message; persist() }
        }
        return super.onStartCommand(intent, flags, startId)
    }
    private fun track(id: String?): JSONObject? = (0 until tracks.length()).map { tracks.getJSONObject(it) }.firstOrNull { it.optString("id") == id }
    private fun validID(id: String) = id.matches(Regex("^[a-zA-Z0-9_-]{1,80}$"))
    private fun downloaded(id: String): Uri? {
        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = prefs.getLong("download.$id", -1)
        if (downloadId < 0) return null
        return manager.getUriForDownloadedFile(downloadId)
    }
    private fun downloading(id: String): Boolean {
        val downloadId = prefs.getLong("download.$id", -1)
        if (downloadId < 0) return false
        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.query(DownloadManager.Query().setFilterById(downloadId)).use { cursor ->
            if (!cursor.moveToFirst()) return false
            val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            if (status == DownloadManager.STATUS_FAILED) error = "Download failed. Tap Download to retry."
            return status == DownloadManager.STATUS_PENDING || status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PAUSED
        }
    }
    private fun execute(command: JSONObject) {
        error = null
        when (command.getString("op")) {
            "catalog" -> {
                val incoming = command.getJSONArray("tracks")
                require(incoming.length() <= 500) { "Audio library is too large" }
                val ids = mutableSetOf<String>()
                for (i in 0 until incoming.length()) {
                    val item = incoming.getJSONObject(i); val id = item.getString("id")
                    require(validID(id) && ids.add(id) && Uri.parse(item.getString("url")).scheme == "https" && item.getString("title").isNotBlank() && item.getString("license").isNotBlank()) { "Invalid audio catalog" }
                    require(track(id)?.optString("url")?.let { it == item.getString("url") } ?: true) { "Use a new track ID when changing an audio file." }
                }
                val merged = JSONArray()
                for (i in 0 until tracks.length()) if (!ids.contains(tracks.getJSONObject(i).getString("id"))) merged.put(tracks.getJSONObject(i))
                for (i in 0 until incoming.length()) merged.put(incoming.getJSONObject(i))
                require(merged.length() <= 500) { "Audio library is too large" }
                tracks = merged
            }
            "play" -> {
                val id = command.optString("id").ifEmpty { trackId }
                val item = track(id) ?: throw IllegalArgumentException("Choose a track first.")
                if (trackId != id || player.mediaItemCount == 0 || player.playerError != null || player.playbackState == Player.STATE_IDLE) {
                    val position = if (trackId == id) checkpoint else 0
                    if (trackId != id) deadline = null
                    player.setMediaItem(MediaItem.Builder().setMediaId(id!!).setUri(downloaded(id) ?: Uri.parse(item.getString("url")))
                        .setMediaMetadata(MediaMetadata.Builder().setTitle(item.getString("title")).setArtist(item.optString("artist")).build()).build(), position)
                    trackId = id; player.prepare()
                }
                expire(); player.play()
            }
            "pause" -> { val expected = command.optString("id"); if (expected.isEmpty() || expected == "null" || expected == trackId) player.pause() }
            "stop" -> { player.pause(); player.clearMediaItems(); checkpoint = 0; deadline = null }
            "seek" -> { val seconds = command.getDouble("position"); require(seconds.isFinite() && seconds >= 0); player.seekTo((seconds * 1000).toLong()) }
            "repeat" -> { repeating = command.getBoolean("enabled"); player.repeatMode = if (repeating) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF }
            "timer" -> { val minutes = command.getDouble("minutes"); require(minutes.isFinite() && minutes >= 0 && minutes <= 720); deadline = if (minutes > 0) System.currentTimeMillis() + (minutes * 60000).toLong() else null }
            "download" -> {
                val id = command.getString("id"); val item = track(id) ?: throw IllegalArgumentException("Unknown audio track")
                if (downloaded(id) == null && !downloading(id)) {
                    val target = File(getExternalFilesDir("audio"), "$id.audio")
                    val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    val previous = prefs.getLong("download.$id", -1)
                    if (previous >= 0) manager.remove(previous)
                    if (target.exists()) check(target.delete()) { "Could not clear an incomplete download" }
                    val request = DownloadManager.Request(Uri.parse(item.getString("url"))).setTitle(item.getString("title"))
                        .setDestinationUri(Uri.fromFile(target)).setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                    prefs.edit().putLong("download.$id", manager.enqueue(request)).apply()
                }
            }
            "removeDownload" -> {
                val id = command.getString("id"); require(validID(id))
                require(id != trackId || player.mediaItemCount == 0) { "Choose another track before removing its download." }
                val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                manager.remove(prefs.getLong("download.$id", -1)); prefs.edit().remove("download.$id").apply()
            }
            else -> throw IllegalArgumentException("Unknown audio command")
        }
        persist()
    }
    private fun expire() {
        if (deadline?.let { System.currentTimeMillis() >= it } == true) { player.pause(); deadline = null; persist() }
    }
    private fun snapshot(): JSONObject {
        expire()
        val complete = JSONArray(); val pending = JSONArray()
        for (i in 0 until tracks.length()) {
            val id = tracks.getJSONObject(i).getString("id")
            if (downloaded(id) != null) complete.put(id) else if (downloading(id)) pending.put(id)
        }
        return JSONObject().put("tracks", tracks).put("trackId", trackId ?: JSONObject.NULL).put("playing", player.isPlaying)
            .put("buffering", player.playbackState == Player.STATE_BUFFERING).put("position", (if (player.mediaItemCount > 0) player.currentPosition else checkpoint) / 1000.0)
            .put("duration", if (player.duration > 0) player.duration / 1000.0 else 0).put("repeat", repeating)
            .put("deadline", deadline ?: JSONObject.NULL).put("downloaded", complete).put("downloading", pending).put("error", error ?: JSONObject.NULL)
    }
    private fun persist(refresh: Boolean = true) {
        if (player.mediaItemCount > 0) checkpoint = player.currentPosition
        prefs.edit().putString("tracks", tracks.toString()).putString("trackId", trackId).putLong("position", checkpoint)
            .putBoolean("repeat", repeating).putBoolean("playing", player.isPlaying).putString("title", track(trackId)?.optString("title") ?: "Little days").apply()
        if (refresh) AudioWidget.refresh(this)
    }
}
