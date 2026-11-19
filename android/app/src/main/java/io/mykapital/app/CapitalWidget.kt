package io.mykapital.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.material3.ColorProviders
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import java.math.BigInteger
import java.text.DecimalFormatSymbols
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

enum class VoiceState {
    IDLE,
    LISTENING,
    SUCCESS,
}

private object WidgetStateKeys {
    val currentBalance = longPreferencesKey("currentBalance")
    val capitalBalance = longPreferencesKey("capitalBalance")
    val todayExpense = longPreferencesKey("todayExpense")
    val voiceState = stringPreferencesKey("voiceState")
    val lastRecognizedText = stringPreferencesKey("lastRecognizedText")
    val showAmounts = booleanPreferencesKey("showAmounts")
    val hasFinancialData = booleanPreferencesKey("hasFinancialData")
    val language = stringPreferencesKey("language")
    val currency = stringPreferencesKey("currency")
}

private object WidgetPalette {
    val background = ColorProvider(Color(0xFF121316))
    val secondary = ColorProvider(Color(0xFF1C1E24))
    val text = ColorProvider(Color(0xFFF4F4F6))
    val muted = ColorProvider(Color(0xFF71717A))
    val outline = ColorProvider(Color(0xFF30333A))
    val accent = ColorProvider(Color(0xFF12A87A))
    val negative = ColorProvider(Color(0xFFD9656D))

    private val materialScheme = darkColorScheme(
        primary = Color(0xFFF4F4F6),
        onPrimary = Color(0xFF121316),
        primaryContainer = Color(0xFF1C1E24),
        onPrimaryContainer = Color(0xFFF4F4F6),
        secondary = Color(0xFF71717A),
        onSecondary = Color(0xFFF4F4F6),
        secondaryContainer = Color(0xFF1C1E24),
        onSecondaryContainer = Color(0xFFF4F4F6),
        background = Color(0xFF121316),
        onBackground = Color(0xFFF4F4F6),
        surface = Color(0xFF121316),
        onSurface = Color(0xFFF4F4F6),
        surfaceVariant = Color(0xFF1C1E24),
        onSurfaceVariant = Color(0xFF71717A),
        outline = Color(0xFF71717A),
        error = Color(0xFF71717A),
        onError = Color(0xFFF4F4F6),
    )

    val glanceColors = ColorProviders(light = materialScheme, dark = materialScheme)

}

private data class WidgetUiState(
    val currentBalance: Long,
    val capitalBalance: Long,
    val todayExpense: Long,
    val voiceState: VoiceState,
    val lastRecognizedText: String,
    val showAmounts: Boolean,
    val hasFinancialData: Boolean,
    val language: String,
    val currency: String,
)

class CapitalWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override val sizeMode: SizeMode = SizeMode.Responsive(
        setOf(SMALL_PILL, MEDIUM_ROW, LARGE_HUB),
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        CapitalWidgetUpdater.syncMirrorIntoState(context, id)
        provideContent {
            val state = currentState<Preferences>().toWidgetUiState()
            GlanceTheme(colors = WidgetPalette.glanceColors) {
                CapitalWidgetContent(state)
            }
        }
    }

    companion object {
        // Launchers report the usable content box after applying their own
        // margins. These buckets intentionally sit below the visual target
        // sizes (220x64, 320x84, 320x176) so Huawei/Honor launchers can select
        // all three layouts instead of stretching the smallest one.
        val SMALL_PILL = DpSize(180.dp, 56.dp)
        val MEDIUM_ROW = DpSize(250.dp, 88.dp)
        val LARGE_HUB = DpSize(250.dp, 168.dp)
    }
}

class CapitalWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CapitalWidget()
}

class VoiceWidgetActionCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        CapitalWidgetUpdater.setVoiceState(context, glanceId, VoiceState.LISTENING, "")
        val intent = Intent(context, VoiceExpenseActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        try {
            context.startActivity(intent)
        } catch (_: RuntimeException) {
            CapitalWidgetUpdater.setVoiceState(context, glanceId, VoiceState.IDLE, "")
        }
    }
}

class OpenIncomeWidgetActionCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.Builder()
                .scheme("my-capital")
                .authority("widget")
                .appendQueryParameter("action", "income")
                .build()
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        context.startActivity(intent)
    }
}

object CapitalWidgetUpdater {
    const val WIDGET_PREFS_NAME = "my_capital_widget"

    private const val KEY_CURRENT_BALANCE_MINOR = "current_balance_minor"
    private const val KEY_CAPITAL_BALANCE_MINOR = "capital_balance_minor"
    private const val KEY_TODAY_EXPENSE_MINOR = "today_expense_minor"
    private const val KEY_TODAY_EXPENSE_DATE = "today_expense_date"
    private const val KEY_SHOW_AMOUNTS = "show_amounts"
    private const val KEY_LANGUAGE = "language"
    private const val KEY_CURRENCY = "currency"
    private const val KEY_UPDATED_AT = "updated_at"

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @JvmStatic
    fun requestRedraw(context: Context) {
        val appContext = context.applicationContext
        applicationScope.launch { updateAllFromMirror(appContext) }
    }

    @JvmStatic
    fun showIdle(context: Context) {
        val appContext = context.applicationContext
        applicationScope.launch { updateAllVoiceStates(appContext, VoiceState.IDLE, "") }
    }

    @JvmStatic
    fun showSuccess(
        context: Context,
        currentBalanceMinor: Long,
        capitalBalanceMinor: Long,
        todayExpenseMinor: Long,
        operationType: String,
        operationAmountMinor: Long,
        currencyCode: String,
        language: String,
    ) {
        val appContext = context.applicationContext
        applicationScope.launch {
            val mirror = readMirror(appContext)
            val sign = if (operationType == "income") "+" else "−"
            val confirmation = if (mirror.showAmounts) {
                val prefix = if (language == "en") "Saved: " else "Записано: "
                prefix + sign + formatMoney(operationAmountMinor, currencyCode, language)
            } else {
                if (language == "en") "Saved" else "Записано"
            }
            updateAllVoiceStates(
                context = appContext,
                voiceState = VoiceState.SUCCESS,
                lastRecognizedText = confirmation,
                financialOverride = MirrorState(
                    currentBalance = currentBalanceMinor,
                    capitalBalance = capitalBalanceMinor,
                    todayExpense = todayExpenseMinor,
                    showAmounts = mirror.showAmounts,
                    hasFinancialData = true,
                    language = language,
                    currency = currencyCode,
                ),
            )
        }
    }

    internal suspend fun syncMirrorIntoState(context: Context, glanceId: GlanceId) {
        val mirror = readMirror(context)
        updateAppWidgetState(context, glanceId) { state ->
            state[WidgetStateKeys.currentBalance] = mirror.currentBalance
            state[WidgetStateKeys.capitalBalance] = mirror.capitalBalance
            state[WidgetStateKeys.todayExpense] = mirror.todayExpense
            state[WidgetStateKeys.showAmounts] = mirror.showAmounts
            state[WidgetStateKeys.hasFinancialData] = mirror.hasFinancialData
            state[WidgetStateKeys.language] = mirror.language
            state[WidgetStateKeys.currency] = mirror.currency
            if (state[WidgetStateKeys.voiceState] == null) {
                state[WidgetStateKeys.voiceState] = VoiceState.IDLE.name
            }
            if (state[WidgetStateKeys.lastRecognizedText] == null) {
                state[WidgetStateKeys.lastRecognizedText] = ""
            }
        }
    }

    internal suspend fun setVoiceState(
        context: Context,
        glanceId: GlanceId,
        voiceState: VoiceState,
        lastRecognizedText: String,
    ) {
        updateAppWidgetState(context, glanceId) { state ->
            state[WidgetStateKeys.voiceState] = voiceState.name
            state[WidgetStateKeys.lastRecognizedText] = lastRecognizedText.take(80)
        }
        CapitalWidget().update(context, glanceId)
    }

    private suspend fun updateAllFromMirror(context: Context) {
        val ids = GlanceAppWidgetManager(context).getGlanceIds(CapitalWidget::class.java)
        ids.forEach { id ->
            syncMirrorIntoState(context, id)
            CapitalWidget().update(context, id)
        }
    }

    private suspend fun updateAllVoiceStates(
        context: Context,
        voiceState: VoiceState,
        lastRecognizedText: String,
        financialOverride: MirrorState? = null,
    ) {
        val ids = GlanceAppWidgetManager(context).getGlanceIds(CapitalWidget::class.java)
        ids.forEach { id ->
            updateAppWidgetState(context, id) { state ->
                financialOverride?.let { financial ->
                    state[WidgetStateKeys.currentBalance] = financial.currentBalance
                    state[WidgetStateKeys.capitalBalance] = financial.capitalBalance
                    state[WidgetStateKeys.todayExpense] = financial.todayExpense
                    state[WidgetStateKeys.showAmounts] = financial.showAmounts
                    state[WidgetStateKeys.hasFinancialData] = financial.hasFinancialData
                    state[WidgetStateKeys.language] = financial.language
                    state[WidgetStateKeys.currency] = financial.currency
                }
                state[WidgetStateKeys.voiceState] = voiceState.name
                state[WidgetStateKeys.lastRecognizedText] = lastRecognizedText.take(80)
            }
            CapitalWidget().update(context, id)
        }
    }

    private fun readMirror(context: Context): MirrorState {
        val preferences = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE)
        val hasData = preferences.getString(KEY_UPDATED_AT, null) != null
        val oldAvailable = preferences.getString("available_value", "") ?: ""
        val showAmounts = if (preferences.contains(KEY_SHOW_AMOUNTS)) {
            preferences.getString(KEY_SHOW_AMOUNTS, "false") == "true"
        } else {
            hasData && !oldAvailable.contains('•')
        }
        val todayExpense = if (preferences.getString(KEY_TODAY_EXPENSE_DATE, "") == currentLocalDateKey()) {
            preferences.getString(KEY_TODAY_EXPENSE_MINOR, null)?.toLongOrNull() ?: 0L
        } else {
            0L
        }
        return MirrorState(
            currentBalance = preferences.getString(KEY_CURRENT_BALANCE_MINOR, null)?.toLongOrNull() ?: 0L,
            capitalBalance = preferences.getString(KEY_CAPITAL_BALANCE_MINOR, null)?.toLongOrNull() ?: 0L,
            todayExpense = todayExpense,
            showAmounts = showAmounts,
            hasFinancialData = hasData,
            language = preferences.getString(KEY_LANGUAGE, "ru")?.takeIf { it == "en" } ?: "ru",
            currency = preferences.getString(KEY_CURRENCY, "RUB")?.take(3)?.uppercase(Locale.ROOT) ?: "RUB",
        )
    }

    private data class MirrorState(
        val currentBalance: Long,
        val capitalBalance: Long,
        val todayExpense: Long,
        val showAmounts: Boolean,
        val hasFinancialData: Boolean,
        val language: String,
        val currency: String,
    )

    private fun currentLocalDateKey(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())
}

@Composable
private fun CapitalWidgetContent(state: WidgetUiState) {
    when (widgetLayoutFor(LocalSize.current)) {
        WidgetLayout.LARGE_HUB -> LargeHub(state)
        WidgetLayout.MEDIUM_ROW -> MediumRow(state)
        WidgetLayout.SMALL_PILL -> SmallPill(state)
    }
}

internal enum class WidgetLayout {
    SMALL_PILL,
    MEDIUM_ROW,
    LARGE_HUB,
}

internal fun widgetLayoutFor(size: DpSize): WidgetLayout = when {
    size.height >= CapitalWidget.LARGE_HUB.height -> WidgetLayout.LARGE_HUB
    size.height >= CapitalWidget.MEDIUM_ROW.height -> WidgetLayout.MEDIUM_ROW
    else -> WidgetLayout.SMALL_PILL
}

@Composable
private fun SmallPill(state: WidgetUiState) {
    WidgetSurface(GlanceModifier.fillMaxSize().padding(2.dp)) {
        Row(
            modifier = GlanceModifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VoiceIconButton(state.voiceState, state.language)
            Spacer(GlanceModifier.width(6.dp))
            Text(
                text = voiceLabel(state),
                modifier = GlanceModifier.defaultWeight(),
                maxLines = 1,
                style = TextStyle(
                    color = WidgetPalette.text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                ),
            )
            Spacer(GlanceModifier.width(6.dp))
            IconButton(
                drawable = R.drawable.ic_widget_plus,
                contentDescription = if (state.language == "en") "Add income" else "Добавить доход",
                background = WidgetPalette.secondary,
                tint = WidgetPalette.text,
                action = actionRunCallback<OpenIncomeWidgetActionCallback>(),
            )
        }
    }
}

@Composable
private fun MediumRow(state: WidgetUiState) {
    WidgetSurface(GlanceModifier.fillMaxSize().padding(4.dp)) {
        Row(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = GlanceModifier.defaultWeight().fillMaxHeight(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (state.language == "en") "My capital" else "Мой капитал",
                    maxLines = 1,
                    style = TextStyle(color = WidgetPalette.muted, fontSize = 12.sp),
                )
                Text(
                    text = financialValue(state.capitalBalance, state),
                    maxLines = 1,
                    style = TextStyle(
                        color = WidgetPalette.text,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                )
                Text(
                    text = todayExpenseLabel(state),
                    maxLines = 1,
                    style = TextStyle(
                        color = WidgetPalette.negative,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                )
            }
            Spacer(GlanceModifier.width(12.dp))
            VoiceIconButton(
                state = state.voiceState,
                language = state.language,
                background = WidgetPalette.accent,
                tint = WidgetPalette.text,
                size = 58,
                cornerRadius = 16,
            )
        }
    }
}

@Composable
private fun LargeHub(state: WidgetUiState) {
    WidgetSurface(GlanceModifier.fillMaxSize().padding(4.dp)) {
        Column(
            modifier = GlanceModifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = if (state.language == "en") "My capital" else "Мой капитал",
                maxLines = 1,
                style = TextStyle(color = WidgetPalette.muted, fontSize = 12.sp),
            )
            Text(
                text = financialValue(state.capitalBalance, state),
                maxLines = 1,
                style = TextStyle(
                    color = WidgetPalette.text,
                    fontSize = 25.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                ),
            )
            Spacer(GlanceModifier.height(6.dp))
            Row(modifier = GlanceModifier.fillMaxWidth()) {
                MetricChip(
                    label = if (state.language == "en") "Available" else "Свободно",
                    value = financialValue(state.currentBalance, state),
                    modifier = GlanceModifier.defaultWeight(),
                )
                Spacer(GlanceModifier.width(8.dp))
                MetricChip(
                    label = if (state.language == "en") "Today" else "Сегодня",
                    value = expenseValue(state.todayExpense, state),
                    modifier = GlanceModifier.defaultWeight(),
                )
            }
            Spacer(GlanceModifier.height(8.dp))
            VoiceCallToAction(state)
        }
    }
}

@Composable
private fun WidgetSurface(modifier: GlanceModifier, content: @Composable () -> Unit) {
    Box(
        modifier = modifier
            .appWidgetBackground()
            .background(WidgetPalette.outline)
            .cornerRadius(26.dp)
            .padding(1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetPalette.background)
                .cornerRadius(25.dp),
            contentAlignment = Alignment.Center,
        ) {
            content()
        }
    }
}

@Composable
private fun MetricChip(label: String, value: String, modifier: GlanceModifier) {
    Box(
        modifier = modifier
            .height(38.dp)
            .background(WidgetPalette.outline)
            .cornerRadius(12.dp)
            .padding(1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetPalette.secondary)
                .cornerRadius(11.dp)
                .padding(horizontal = 9.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "$label: $value",
                maxLines = 1,
                style = TextStyle(color = WidgetPalette.text, fontSize = 12.sp, fontWeight = FontWeight.Medium),
            )
        }
    }
}

@Composable
private fun VoiceCallToAction(state: WidgetUiState) {
    val icon = if (state.voiceState == VoiceState.SUCCESS) R.drawable.ic_widget_check else R.drawable.ic_widget_mic
    val label = when (state.voiceState) {
        VoiceState.IDLE -> if (state.language == "en") "Record by voice" else "Записать голосом"
        VoiceState.LISTENING -> if (state.language == "en") "Listening…" else "Слушаю…"
        VoiceState.SUCCESS -> voiceLabel(state)
    }
    Row(
        modifier = GlanceModifier
            .fillMaxWidth()
            .height(44.dp)
            .background(WidgetPalette.text)
            .cornerRadius(22.dp)
            .clickable(actionRunCallback<VoiceWidgetActionCallback>()),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            maxLines = 1,
            style = TextStyle(
                color = WidgetPalette.background,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
        Spacer(GlanceModifier.width(8.dp))
        Image(
            provider = ImageProvider(icon),
            contentDescription = if (state.language == "en") "Voice input" else "Голосовой ввод",
            modifier = GlanceModifier.size(20.dp),
            colorFilter = ColorFilter.tint(WidgetPalette.background),
        )
    }
}

@Composable
private fun VoiceIconButton(
    state: VoiceState,
    language: String,
    background: ColorProvider = WidgetPalette.text,
    tint: ColorProvider = WidgetPalette.background,
    size: Int = 48,
    cornerRadius: Int = size / 2,
) {
    val drawable = if (state == VoiceState.SUCCESS) R.drawable.ic_widget_check else R.drawable.ic_widget_mic
    IconButton(
        drawable = drawable,
        contentDescription = if (language == "en") "Voice input" else "Голосовой ввод",
        background = background,
        tint = tint,
        action = actionRunCallback<VoiceWidgetActionCallback>(),
        size = size,
        cornerRadius = cornerRadius,
    )
}

@Composable
private fun IconButton(
    drawable: Int,
    contentDescription: String,
    background: ColorProvider,
    tint: ColorProvider,
    action: androidx.glance.action.Action,
    size: Int = 48,
    cornerRadius: Int = size / 2,
) {
    Box(
        modifier = GlanceModifier
            .size(size.dp)
            .background(background)
            .cornerRadius(cornerRadius.dp)
            .clickable(action),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            provider = ImageProvider(drawable),
            contentDescription = contentDescription,
            modifier = GlanceModifier.size(22.dp),
            colorFilter = ColorFilter.tint(tint),
        )
    }
}

private fun Preferences.toWidgetUiState(): WidgetUiState {
    val parsedVoiceState = runCatching {
        VoiceState.valueOf(this[WidgetStateKeys.voiceState] ?: VoiceState.IDLE.name)
    }.getOrDefault(VoiceState.IDLE)
    return WidgetUiState(
        currentBalance = this[WidgetStateKeys.currentBalance] ?: 0L,
        capitalBalance = this[WidgetStateKeys.capitalBalance] ?: 0L,
        todayExpense = this[WidgetStateKeys.todayExpense] ?: 0L,
        voiceState = parsedVoiceState,
        lastRecognizedText = this[WidgetStateKeys.lastRecognizedText].orEmpty(),
        showAmounts = this[WidgetStateKeys.showAmounts] ?: false,
        hasFinancialData = this[WidgetStateKeys.hasFinancialData] ?: false,
        language = this[WidgetStateKeys.language] ?: "ru",
        currency = this[WidgetStateKeys.currency] ?: "RUB",
    )
}

private fun voiceLabel(state: WidgetUiState): String = when (state.voiceState) {
    VoiceState.IDLE -> if (state.language == "en") "Tap and speak…" else "Нажмите и говорите…"
    VoiceState.LISTENING -> if (state.language == "en") "Listening…" else "Слушаю…"
    VoiceState.SUCCESS -> state.lastRecognizedText.ifBlank {
        if (state.language == "en") "Saved" else "Записано"
    }
}

private fun financialValue(amountMinor: Long, state: WidgetUiState): String {
    if (!state.hasFinancialData) return "—"
    if (!state.showAmounts) return "••••"
    return formatMoney(amountMinor, state.currency, state.language)
}

private fun expenseValue(amountMinor: Long, state: WidgetUiState): String {
    if (!state.hasFinancialData) return "—"
    if (!state.showAmounts) return "••••"
    return if (amountMinor > 0L) "−${formatMoney(amountMinor, state.currency, state.language)}" else formatMoney(0L, state.currency, state.language)
}

private fun todayExpenseLabel(state: WidgetUiState): String {
    val label = if (state.language == "en") "Today" else "Сегодня"
    return "$label: ${expenseValue(state.todayExpense, state)}"
}

private fun formatMoney(amountMinor: Long, currencyCode: String, language: String): String {
    val locale = if (language == "en") Locale.US else Locale.forLanguageTag("ru-RU")
    val absolute = BigInteger.valueOf(amountMinor).abs()
    val division = absolute.divideAndRemainder(BigInteger.valueOf(100L))
    val whole = NumberFormat.getIntegerInstance(locale).format(division[0])
    val fraction = division[1].toInt()
    val decimalSeparator = DecimalFormatSymbols.getInstance(locale).decimalSeparator
    val number = if (fraction == 0) whole else "$whole$decimalSeparator${fraction.toString().padStart(2, '0')}"
    val symbol = runCatching { Currency.getInstance(currencyCode).getSymbol(locale) }.getOrDefault(currencyCode)
    val sign = if (amountMinor < 0L) "−" else ""
    return "$sign$number $symbol"
}
