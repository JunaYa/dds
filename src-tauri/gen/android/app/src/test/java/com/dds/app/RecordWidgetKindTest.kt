package com.dds.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RecordWidgetKindTest {
    @Test fun dedicatedWidgetsFixTheirRecordType() {
        assertEquals("feed", RecordWidgetKind.fromProvider("com.dds.app.FeedingRecordWidget")?.defaultType)
        assertEquals("sleep", RecordWidgetKind.fromProvider("com.dds.app.SleepRecordWidget")?.defaultType)
    }
    @Test fun existingGenericWidgetsKeepCustomTypeSelection() {
        assertEquals(RecordWidgetKind.CUSTOM, RecordWidgetKind.fromProvider("com.dds.app.RecentRecordWidget"))
        assertNull(RecordWidgetKind.CUSTOM.defaultType)
    }
    @Test fun configurationRejectsUnknownProviders() {
        assertNull(RecordWidgetKind.fromProvider("com.other.app.FeedingRecordWidget"))
        assertNull(RecordWidgetKind.fromProvider(""))
    }
}
