package com.dds.cloudsync

import android.app.Activity
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@InvokeArg
class SecretArgs { var value: String? = null }

@TauriPlugin
class CloudSyncPlugin(private val activity: Activity): Plugin(activity) {
    private val alias = "little-days-cloud-v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun file() = File(activity.noBackupFilesDir, "alipan-credential")
    @Command
    fun readSecret(invoke: Invoke) {
        try {
            val file = file()
            if (!file.exists()) { invoke.resolve(JSObject()); return }
            val data = file.readBytes()
            require(data.size in 29..65536)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, data.copyOfRange(0, 12)))
            invoke.resolve(JSObject().put("value", String(cipher.doFinal(data.copyOfRange(12, data.size)), Charsets.UTF_8)))
        } catch (_: Exception) { invoke.reject("Secure storage is unavailable") }
    }
    @Command
    fun writeSecret(invoke: Invoke) {
        try {
            val value = invoke.parseArgs(SecretArgs::class.java).value
            val file = file()
            if (value == null) {
                if (file.exists() && !file.delete()) throw IllegalStateException()
            } else {
                require(value.toByteArray().size < 60000)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, key())
                val temporary = File(file.parentFile, file.name + ".tmp")
                temporary.outputStream().use { it.write(cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8))); it.fd.sync() }
                if (!temporary.renameTo(file)) throw IllegalStateException()
            }
            invoke.resolve()
        } catch (_: Exception) { invoke.reject("Could not save secure credentials") }
    }
}
