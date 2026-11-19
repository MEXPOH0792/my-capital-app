package io.mykapital.app

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Test

class CapitalWidgetLayoutTest {
    @Test
    fun `small launcher box selects pill`() {
        assertEquals(WidgetLayout.SMALL_PILL, widgetLayoutFor(DpSize(180.dp, 56.dp)))
    }

    @Test
    fun `four by two launcher box selects medium row`() {
        assertEquals(WidgetLayout.MEDIUM_ROW, widgetLayoutFor(DpSize(290.dp, 112.dp)))
    }

    @Test
    fun `tall launcher box selects large hub`() {
        assertEquals(WidgetLayout.LARGE_HUB, widgetLayoutFor(DpSize(290.dp, 180.dp)))
    }
}
