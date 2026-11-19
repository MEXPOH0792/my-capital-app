package io.mykapital.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.Executor;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int DARK_BG = Color.parseColor("#020402");
    private static final int LIGHT_BG = Color.parseColor("#EFF5EF");
    private static final int SPEECH_PERMISSION_REQUEST = 4107;
    private static final String RUNTIME_PREFS_NAME = "my_capital_runtime";
    private static final String WEB_CACHE_VERSION_KEY = "web_cache_version";

    private OnDeviceSpeechService onDeviceSpeechService;
    private String pendingSpeechCallbackId;
    private String pendingSpeechLanguageTag;
    private long loadedNativeStateRevision;
    private SecureStateRepository secureRepository;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        secureRepository = new SecureStateRepository(this);
        onDeviceSpeechService = new OnDeviceSpeechService(this);
        loadedNativeStateRevision = secureRepository.getNativeStateRevision();
        applySystemBars(true);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            clearWebCacheAfterUpgrade(webView);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.addJavascriptInterface(new SystemUiBridge(), "SystemUiBridge");
        }
    }

    /**
     * The bundled Vite assets are content-hashed, but a cached index.html can
     * still point at the previous bundle after an in-place APK update. Clear
     * only WebView's HTTP cache once per Android version; financial data lives
     * in encrypted SharedPreferences and remains untouched.
     */
    private void clearWebCacheAfterUpgrade(WebView webView) {
        SharedPreferences runtimePrefs = getSharedPreferences(RUNTIME_PREFS_NAME, Context.MODE_PRIVATE);
        long currentVersion;
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            currentVersion = PackageInfoCompat.getLongVersionCode(packageInfo);
        } catch (PackageManager.NameNotFoundException error) {
            webView.clearCache(true);
            return;
        }

        if (runtimePrefs.getLong(WEB_CACHE_VERSION_KEY, -1L) == currentVersion) return;

        webView.clearCache(true);
        runtimePrefs.edit().putLong(WEB_CACHE_VERSION_KEY, currentVersion).apply();
    }

    @Override
    public void onResume() {
        super.onResume();
        long revision = secureRepository.getNativeStateRevision();
        if (revision <= loadedNativeStateRevision) return;
        loadedNativeStateRevision = revision;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().post(() ->
            getBridge().getWebView().evaluateJavascript("window.location.reload();", null)
        );
    }

    @Override
    public void onDestroy() {
        if (onDeviceSpeechService != null) onDeviceSpeechService.destroy();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != SPEECH_PERMISSION_REQUEST) return;

        String callbackId = pendingSpeechCallbackId;
        String languageTag = pendingSpeechLanguageTag;
        pendingSpeechCallbackId = null;
        pendingSpeechLanguageTag = null;

        if (callbackId == null || callbackId.isEmpty()) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startOnDeviceSpeechInternal(callbackId, languageTag);
        } else {
            deliverOnDeviceSpeechResult(callbackId, "permission_denied", "");
        }
    }

    private void applySystemBars(boolean isDarkMode) {
        int backgroundColor = isDarkMode ? DARK_BG : LIGHT_BG;

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(backgroundColor);
        getWindow().setNavigationBarColor(backgroundColor);
        getWindow().getDecorView().setBackgroundColor(backgroundColor);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }

        controller.setAppearanceLightStatusBars(!isDarkMode);
        controller.setAppearanceLightNavigationBars(!isDarkMode);
        controller.show(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(backgroundColor);
        }
    }

    private final class SystemUiBridge {
        @JavascriptInterface
        public void setDarkMode(boolean isDarkMode) {
            runOnUiThread(() -> applySystemBars(isDarkMode));
        }

        @JavascriptInterface
        public String secureStorageGetItem(String key) {
            return secureRepository.getItem(key);
        }

        /**
         * Returns "ok" or "error:<reason>". A failed encryption keeps the
         * previous value untouched instead of wiping it.
         */
        @JavascriptInterface
        public String secureStorageSetItem(String key, String value) {
            return secureRepository.setItem(key, value);
        }

        @JavascriptInterface
        public String secureStorageStatus() {
            return secureRepository.getStatus();
        }

        /**
         * FLAG_SECURE while a PIN is set: blocks screenshots and blanks the
         * app preview in the recent-apps switcher, where balances would show.
         */
        @JavascriptInterface
        public void setSecureWindow(boolean isSecure) {
            runOnUiThread(() -> {
                if (isSecure) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }

        @JavascriptInterface
        public void secureStorageRemoveItem(String key) {
            secureRepository.removeItem(key);
        }

        /**
         * Full local erase used by the explicit "forgot PIN" flow. This also
         * removes quarantined ciphertext, the Keystore key and widget values.
         */
        @JavascriptInterface
        public String secureStorageClearAppData() {
            String secureResult = secureRepository.clearAll();
            boolean widgetCleared = getSharedPreferences(
                CapitalWidgetUpdater.WIDGET_PREFS_NAME,
                Context.MODE_PRIVATE
            ).edit().clear().commit();
            CapitalWidgetUpdater.requestRedraw(MainActivity.this);

            if (!"ok".equals(secureResult)) return secureResult;
            return widgetCleared ? "ok" : "error:widget_storage_clear";
        }

        /**
         * Mirror a single display string into the home-screen widget prefs.
         * Plain SharedPreferences (no encryption) because these values are
         * already public from the user's standpoint (shown on the widget).
         */
        @JavascriptInterface
        public void widgetSetValue(String key, String value) {
            if (key == null || key.isEmpty()) return;
            SharedPreferences prefs = getSharedPreferences(
                CapitalWidgetUpdater.WIDGET_PREFS_NAME,
                Context.MODE_PRIVATE
            );
            if (value == null) {
                prefs.edit().remove(key).apply();
            } else {
                prefs.edit().putString(key, value).apply();
            }
        }

        /**
         * Ask every installed widget instance to redraw now. Cheap: just a
         * broadcast — the launcher coalesces multiple updates.
         */
        @JavascriptInterface
        public void widgetUpdate() {
            CapitalWidgetUpdater.requestRedraw(MainActivity.this);
        }

        /**
         * Deliberately reports only the Android 12+ recognizer that guarantees
         * on-device processing. The generic recognizer is not used because it
         * may stream audio to a remote speech service.
         */
        @JavascriptInterface
        public boolean onDeviceSpeechAvailable() {
            return OnDeviceSpeechService.isAvailable(MainActivity.this);
        }

        @JavascriptInterface
        public void startOnDeviceSpeech(String callbackId, String languageTag) {
            final String finalCallbackId = callbackId == null ? "" : callbackId;
            final String finalLanguageTag = languageTag == null || languageTag.isEmpty() ? "ru-RU" : languageTag;
            runOnUiThread(() -> {
                if (finalCallbackId.isEmpty()) return;
                if (!onDeviceSpeechAvailable()) {
                    deliverOnDeviceSpeechResult(finalCallbackId, "unavailable", "");
                    return;
                }

                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                    pendingSpeechCallbackId = finalCallbackId;
                    pendingSpeechLanguageTag = finalLanguageTag;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] { Manifest.permission.RECORD_AUDIO },
                        SPEECH_PERMISSION_REQUEST
                    );
                    return;
                }

                startOnDeviceSpeechInternal(finalCallbackId, finalLanguageTag);
            });
        }

        /**
         * Returns one of: "available", "no_hardware", "hw_unavailable",
         * "none_enrolled", "security_update_required", "unsupported", "unknown".
         * Strong (class 3) authenticators only.
         */
        @JavascriptInterface
        public String biometricStatus() {
            BiometricManager manager = BiometricManager.from(MainActivity.this);
            int status = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
            switch (status) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    return "available";
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    return "no_hardware";
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    return "hw_unavailable";
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    return "none_enrolled";
                case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                    return "security_update_required";
                case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                    return "unsupported";
                default:
                    return "unknown";
            }
        }

        /**
         * Shows the system biometric prompt. The JS side passes a callbackId; this
         * method posts a result back via `window.SystemUiBridge.__resolveBiometric`.
         * Result is either "ok" or "error:<code>".
         */
        @JavascriptInterface
        public void biometricAuthenticate(String callbackId, String title, String subtitle, String cancelLabel) {
            final String finalCallbackId = callbackId == null ? "" : callbackId;
            runOnUiThread(() -> {
                if (!(MainActivity.this instanceof FragmentActivity)) {
                    deliverBiometricResult(finalCallbackId, "error:unsupported_activity");
                    return;
                }

                Executor executor = ContextCompat.getMainExecutor(MainActivity.this);
                BiometricPrompt prompt = new BiometricPrompt(
                    MainActivity.this,
                    executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            deliverBiometricResult(finalCallbackId, "ok");
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, CharSequence errString) {
                            deliverBiometricResult(finalCallbackId, "error:" + errorCode);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            // Single rejection (e.g. unrecognized finger). Do not resolve;
                            // the prompt remains open until the user retries or cancels.
                        }
                    }
                );

                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title == null || title.isEmpty() ? "Unlock" : title)
                    .setSubtitle(subtitle == null ? "" : subtitle)
                    .setNegativeButtonText(cancelLabel == null || cancelLabel.isEmpty() ? "Cancel" : cancelLabel)
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                    .setConfirmationRequired(false)
                    .build();

                try {
                    prompt.authenticate(info);
                } catch (Exception error) {
                    deliverBiometricResult(finalCallbackId, "error:exception");
                }
            });
        }
    }

    private void startOnDeviceSpeechInternal(String callbackId, String languageTag) {
        onDeviceSpeechService.start(
            languageTag,
            (status, transcript) -> deliverOnDeviceSpeechResult(callbackId, status, transcript)
        );
    }

    private void deliverOnDeviceSpeechResult(String callbackId, String status, String payload) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String script = "window.SystemUiBridge && window.SystemUiBridge.__resolveOnDeviceSpeech"
            + " && window.SystemUiBridge.__resolveOnDeviceSpeech("
            + JSONObject.quote(callbackId == null ? "" : callbackId) + ","
            + JSONObject.quote(status == null ? "unknown" : status) + ","
            + JSONObject.quote(payload == null ? "" : payload) + ");";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
    }

    private void deliverBiometricResult(String callbackId, String result) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String safeResult = result == null ? "" : result.replace("\\", "\\\\").replace("'", "\\'");
        String safeId = callbackId == null ? "" : callbackId.replace("\\", "\\\\").replace("'", "\\'");
        String script = "window.SystemUiBridge && window.SystemUiBridge.__resolveBiometric"
            + " && window.SystemUiBridge.__resolveBiometric('" + safeId + "', '" + safeResult + "');";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
    }
}
