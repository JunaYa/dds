package com.dds.app

internal enum class RecordWidgetKind(val provider: String, val defaultType: String?) {
    FEEDING("com.dds.app.FeedingRecordWidget", "feed"),
    SLEEP("com.dds.app.SleepRecordWidget", "sleep"),
    CUSTOM("com.dds.app.RecentRecordWidget", null);

    companion object {
        fun fromProvider(provider: String): RecordWidgetKind? = entries.find { it.provider == provider }
    }
}
