package io.mykapital.app;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Currency;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * A small, translucent voice-capture surface launched directly by the widget.
 * It uses only Android's guaranteed on-device recognizer, updates the same
 * encrypted Zustand state as the web app, redraws the widget and closes.
 */
public class VoiceExpenseActivity extends Activity {
    private static final int MICROPHONE_PERMISSION_REQUEST = 4208;
    private static final String STATE_KEY = "capital-tree-pro-v9";

    private OnDeviceSpeechService speechService;
    private ObjectAnimator pulse;
    private TextView titleView;
    private TextView hintView;
    private boolean isEnglish;
    private SecureStateRepository secureRepository;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        secureRepository = new SecureStateRepository(this);
        speechService = new OnDeviceSpeechService(this);
        setContentView(R.layout.activity_voice_expense);
        titleView = findViewById(R.id.voice_capture_title);
        hintView = findViewById(R.id.voice_capture_hint);
        ImageView icon = findViewById(R.id.voice_capture_icon);
        pulse = ObjectAnimator.ofFloat(icon, View.ALPHA, 1f, 0.48f, 1f);
        pulse.setDuration(1100);
        pulse.setRepeatCount(ObjectAnimator.INFINITE);
        pulse.start();

        isEnglish = readLanguage().equals("en");
        titleView.setText(isEnglish ? "Listening…" : "Слушаю…");
        hintView.setText(isEnglish ? "Say the category, amount and account" : "Назови категорию, сумму и счёт");

        String availability = OnDeviceSpeechService.availabilityStatus(this);
        if (!"available".equals(availability)) {
            showFailure(speechFailureMessage(availability));
            return;
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.RECORD_AUDIO },
                MICROPHONE_PERMISSION_REQUEST
            );
        } else {
            startListening();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MICROPHONE_PERMISSION_REQUEST) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startListening();
        } else {
            showFailure(isEnglish ? "Microphone access is required" : "Разреши доступ к микрофону");
        }
    }

    private void startListening() {
        speechService.start(isEnglish ? "en-US" : "ru-RU", (status, transcript) -> {
            if ("ok".equals(status)) {
                titleView.setText(isEnglish ? "Recognizing…" : "Распознаю…");
                saveRecognizedExpense(transcript);
                return;
            }
            showFailure(speechFailureMessage(status));
        });
    }

    private String speechFailureMessage(String status) {
        if (isEnglish) {
            switch (status) {
                case "unsupported_os":
                    return "This Android version has no guaranteed local recognition";
                case "service_unavailable":
                case "unavailable":
                    return "The phone firmware does not provide a local speech service";
                case "model_missing":
                    return "The offline language model is not downloaded";
                case "language_unsupported":
                    return "This language is not supported locally";
                case "permission_denied":
                    return "Microphone access is required";
                case "no_match":
                case "timeout":
                    return "I couldn't understand. Try again.";
                case "busy":
                    return "Speech recognition is busy. Try again.";
                case "audio":
                    return "The microphone could not start";
                default:
                    return "Local speech recognition failed";
            }
        }

        switch (status) {
            case "unsupported_os":
                return "Эта версия Android не гарантирует локальное распознавание";
            case "service_unavailable":
            case "unavailable":
                return "Прошивка телефона не предоставляет локальный речевой сервис";
            case "model_missing":
                return "Офлайн-модель русского языка не загружена";
            case "language_unsupported":
                return "Русский язык не поддерживается локально";
            case "permission_denied":
                return "Разреши доступ к микрофону";
            case "no_match":
            case "timeout":
                return "Не расслышал. Повтори ещё раз.";
            case "busy":
                return "Распознавание занято. Повтори ещё раз.";
            case "audio":
                return "Не удалось включить микрофон";
            default:
                return "Не удалось локально распознать речь";
        }
    }

    private void saveRecognizedExpense(String transcript) {
        try {
            String raw = decryptState();
            if (raw == null || raw.isEmpty()) throw new IllegalStateException("empty_state");
            JSONObject envelope = new JSONObject(raw);
            JSONObject state = envelope.optJSONObject("state");
            if (state == null) throw new IllegalStateException("missing_state");

            JSONArray accounts = state.optJSONArray("accounts");
            JSONArray transactions = state.optJSONArray("transactions");
            if (accounts == null || accounts.length() == 0) throw new IllegalStateException("missing_accounts");
            if (transactions == null) transactions = new JSONArray();

            VoiceCommandParser.Result parsed = parseTransaction(transcript, accounts, transactions);
            if (parsed.amountMinor <= 0) {
                String heard = transcript == null ? "" : transcript.trim();
                if (heard.length() > 90) heard = heard.substring(0, 90) + "…";
                showFailure(isEnglish
                    ? "Heard: “" + heard + "”, but couldn't find an amount"
                    : "Услышал: «" + heard + "», но не нашёл сумму");
                return;
            }

            if ("unknown".equals(parsed.type)) {
                showFailure(isEnglish
                    ? "Say whether this is income or an expense"
                    : "Скажи «доход» или «расход»");
                return;
            }
            if ("conflict".equals(parsed.type)) {
                showFailure(isEnglish
                    ? "I heard both income and expense. Please try again."
                    : "Услышал и доход, и расход. Повтори фразу.");
                return;
            }

            String category = parsed.category.isEmpty()
                ? ("income".equals(parsed.type) ? (isEnglish ? "Income" : "Доход") : (isEnglish ? "Expense" : "Расход"))
                : parsed.category;

            VoiceTransactionService.Result result = new VoiceTransactionService(isEnglish).apply(state, parsed, category);
            if (!result.isSuccess()) {
                showFailure(isEnglish
                    ? "There isn't enough money on the selected account"
                    : "На выбранном счёте недостаточно денег");
                return;
            }

            envelope.put("state", state);
            encryptAndStoreState(envelope.toString());
            WidgetStateProjector.Snapshot widgetSnapshot = refreshWidget(state);

            String formatted = formatMoney(parsed.amountMinor, state.optString("currency", "RUB"));
            titleView.setText(isEnglish ? "Saved" : "Записано");
            hintView.setText(category + " · " + formatted);
            if (pulse != null) pulse.cancel();
            String savedLabel = "income".equals(parsed.type)
                ? (isEnglish ? "Income saved: " : "Доход записан: ")
                : (isEnglish ? "Expense saved: " : "Расход записан: ");
            Toast.makeText(this, savedLabel + category + " · " + formatted, Toast.LENGTH_SHORT).show();
            CapitalWidgetUpdater.showSuccess(
                this,
                widgetSnapshot.currentBalanceMinor,
                widgetSnapshot.capitalBalanceMinor,
                widgetSnapshot.todayExpenseMinor,
                parsed.type,
                parsed.amountMinor,
                state.optString("currency", "RUB"),
                isEnglish ? "en" : "ru"
            );
            new Handler(Looper.getMainLooper()).postDelayed(this::finish, 1100);
        } catch (Exception error) {
            showFailure(isEnglish ? "Open the app once and try again" : "Открой приложение один раз и повтори");
        }
    }

    private VoiceCommandParser.Result parseTransaction(String transcript, JSONArray accounts, JSONArray transactions) {
        ArrayList<VoiceCommandParser.AccountCandidate> accountCandidates = new ArrayList<>();
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.optJSONObject(index);
            if (account == null) continue;
            accountCandidates.add(new VoiceCommandParser.AccountCandidate(
                account.optString("id", ""),
                account.optString("name", ""),
                account.optBoolean("includeInSpendable", false)
            ));
        }

        ArrayList<VoiceCommandParser.CategoryCandidate> categoryCandidates = new ArrayList<>();
        for (int index = 0; index < transactions.length(); index += 1) {
            JSONObject transaction = transactions.optJSONObject(index);
            if (transaction == null) continue;
            categoryCandidates.add(new VoiceCommandParser.CategoryCandidate(
                transaction.optString("type", ""),
                transaction.optString("category", "")
            ));
        }

        return new VoiceCommandParser(isEnglish).parse(transcript, accountCandidates, categoryCandidates);
    }

    private String readLanguage() {
        try {
            String raw = decryptState();
            if (raw == null) return "ru";
            JSONObject state = new JSONObject(raw).optJSONObject("state");
            return state == null ? "ru" : state.optString("language", "ru");
        } catch (Exception error) {
            return "ru";
        }
    }

    private String decryptState() throws Exception {
        return secureRepository.getExistingItemOrThrow(STATE_KEY);
    }

    private void encryptAndStoreState(String plainText) throws Exception {
        secureRepository.setItemCommittedWithRevision(STATE_KEY, plainText);
    }

    private WidgetStateProjector.Snapshot refreshWidget(JSONObject state) {
        try {
            WidgetStateProjector.Snapshot snapshot = WidgetStateProjector.project(
                state,
                System.currentTimeMillis(),
                java.util.TimeZone.getDefault()
            );
            SharedPreferences widget = getSharedPreferences(CapitalWidgetUpdater.WIDGET_PREFS_NAME, Context.MODE_PRIVATE);
            String oldAvailable = widget.getString("available_value", "");
            String oldCapital = widget.getString("capital_value", "");
            boolean showAmounts = widget.contains("show_amounts")
                ? "true".equals(widget.getString("show_amounts", "false"))
                : oldAvailable != null && !oldAvailable.contains("•");
            String currency = state.optString("currency", "RUB");
            SharedPreferences.Editor editor = widget.edit()
                .putString("updated_at", isoNow())
                .putString("current_balance_minor", String.valueOf(snapshot.currentBalanceMinor))
                .putString("capital_balance_minor", String.valueOf(snapshot.capitalBalanceMinor))
                .putString("today_expense_minor", String.valueOf(snapshot.todayExpenseMinor))
                .putString("today_expense_date", localDateKey())
                .putString("show_amounts", showAmounts ? "true" : "false")
                .putString("language", isEnglish ? "en" : "ru")
                .putString("currency", currency);
            if (showAmounts) {
                editor.putString("available_value", formatMoney(snapshot.currentBalanceMinor, currency));
            }
            if (showAmounts && oldCapital != null && !oldCapital.contains("•")) {
                long target = Math.max(0L, state.optLong("targetCapital", 0L));
                int progress = target > 0L
                    ? (int) Math.max(0d, Math.min(100d, Math.round(snapshot.capitalBalanceMinor * 100d / target)))
                    : 0;
                editor
                    .putString("capital_value", formatMoney(snapshot.capitalBalanceMinor, currency))
                    .putString("progress_text", progress + "%")
                    .putString("progress_percent", String.valueOf(progress));
            }
            editor.apply();
            return snapshot;
        } catch (Exception ignored) {
            return new WidgetStateProjector.Snapshot(
                state.optLong("availableBalance", 0L),
                state.optLong("capital", 0L),
                0L
            );
        }
    }

    private String formatMoney(long amountMinor, String currencyCode) {
        try {
            Locale locale = isEnglish ? Locale.US : new Locale("ru", "RU");
            NumberFormat formatter = NumberFormat.getCurrencyInstance(locale);
            formatter.setCurrency(Currency.getInstance(currencyCode));
            formatter.setMinimumFractionDigits(amountMinor % 100L == 0 ? 0 : 2);
            formatter.setMaximumFractionDigits(2);
            return formatter.format(amountMinor / 100d);
        } catch (Exception error) {
            return String.format(Locale.US, "%.2f", amountMinor / 100d);
        }
    }

    private String isoNow() {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formatter.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return formatter.format(new java.util.Date());
    }

    private String localDateKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date());
    }

    private void showFailure(String message) {
        CapitalWidgetUpdater.showIdle(this);
        if (pulse != null) pulse.cancel();
        titleView.setText(isEnglish ? "Couldn't save" : "Не записано");
        hintView.setText(message);
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        new Handler(Looper.getMainLooper()).postDelayed(this::finish, 1900);
    }

    @Override
    protected void onDestroy() {
        if (pulse != null) pulse.cancel();
        if (speechService != null) speechService.destroy();
        super.onDestroy();
    }

}
