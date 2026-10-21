package io.mykapital.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.BridgeActivity;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class MainActivity extends BridgeActivity {
    private static final int DARK_BG = Color.parseColor("#020402");
    private static final int LIGHT_BG = Color.parseColor("#EFF5EF");
    private static final String SECURE_PREFS_NAME = "my_capital_secure_storage";
    private static final String KEY_ALIAS = "my_capital_master_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final String CORRUPT_SUFFIX = "__corrupt_";

    /**
     * Last storage problem seen in this process: "ok", "decrypt_failed" or
     * "encrypt_failed". The JS layer reads it on start to decide whether to
     * show the recovery screen instead of a fresh onboarding.
     */
    private volatile String storageStatus = "ok";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars(true);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            // Use the default cache so the bundled web assets are served from
            // the WebView cache on subsequent launches. Wiping the cache on
            // every onCreate forced a fresh asset load and added perceptible
            // start-up latency without any user-visible benefit. The bundle
            // itself is shipped with content-hashed filenames, so cache
            // invalidation is handled by Vite on update.
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.addJavascriptInterface(new SystemUiBridge(), "SystemUiBridge");
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

    private void quarantine(String key, String rawValue) {
        storageStatus = "decrypt_failed";
        getSecurePreferences()
            .edit()
            .putString(key + CORRUPT_SUFFIX + System.currentTimeMillis(), rawValue)
            .remove(key)
            .apply();
    }

    private SharedPreferences getSecurePreferences() {
        return getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE);
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.SecretKeyEntry entry = (KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null);
            return entry.getSecretKey();
        }

        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        keyGenerator.init(
            new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        );
        return keyGenerator.generateKey();
    }

    private String encryptValue(String plainText) throws Exception {
        Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey());

        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        byte[] combined = new byte[iv.length + encrypted.length];

        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

        return Base64.encodeToString(combined, Base64.NO_WRAP);
    }

    private String decryptValue(String encryptedValue) throws Exception {
        byte[] combined = Base64.decode(encryptedValue, Base64.NO_WRAP);
        if (combined.length <= GCM_IV_LENGTH_BYTES) {
            return null;
        }

        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        byte[] encrypted = new byte[combined.length - GCM_IV_LENGTH_BYTES];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH_BYTES);
        System.arraycopy(combined, GCM_IV_LENGTH_BYTES, encrypted, 0, encrypted.length);

        Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    private final class SystemUiBridge {
        @JavascriptInterface
        public void setDarkMode(boolean isDarkMode) {
            runOnUiThread(() -> applySystemBars(isDarkMode));
        }

        @JavascriptInterface
        public String secureStorageGetItem(String key) {
            if (key == null || key.isEmpty()) {
                return null;
            }

            String stored = getSecurePreferences().getString(key, null);
            if (stored == null) {
                return null;
            }

            try {
                String plain = decryptValue(stored);
                if (plain == null) {
                    quarantine(key, stored);
                }
                return plain;
            } catch (Exception error) {
                // Never delete what we cannot read: the Keystore key may come
                // back, or the user may need the raw copy for support. Park it
                // under a quarantine key and report the failure to JS.
                quarantine(key, stored);
                return null;
            }
        }

        /**
         * Returns "ok" or "error:<reason>". A failed encryption keeps the
         * previous value untouched instead of wiping it.
         */
        @JavascriptInterface
        public String secureStorageSetItem(String key, String value) {
            if (key == null || key.isEmpty()) {
                return "error:empty_key";
            }

            if (value == null || value.isEmpty()) {
                getSecurePreferences().edit().remove(key).apply();
                return "ok";
            }

            try {
                String encryptedValue = encryptValue(value);
                getSecurePreferences().edit().putString(key, encryptedValue).apply();
                return "ok";
            } catch (Exception error) {
                storageStatus = "encrypt_failed";
                return "error:encrypt";
            }
        }

        @JavascriptInterface
        public String secureStorageStatus() {
            return storageStatus;
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
            if (key == null || key.isEmpty()) {
                return;
            }

            getSecurePreferences().edit().remove(key).apply();
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
                CapitalWidgetProvider.WIDGET_PREFS_NAME,
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
            runOnUiThread(() -> CapitalWidgetProvider.requestRedraw(MainActivity.this));
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

    private void deliverBiometricResult(String callbackId, String result) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String safeResult = result == null ? "" : result.replace("\\", "\\\\").replace("'", "\\'");
        String safeId = callbackId == null ? "" : callbackId.replace("\\", "\\\\").replace("'", "\\'");
        String script = "window.SystemUiBridge && window.SystemUiBridge.__resolveBiometric"
            + " && window.SystemUiBridge.__resolveBiometric('" + safeId + "', '" + safeResult + "');";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
    }
}
