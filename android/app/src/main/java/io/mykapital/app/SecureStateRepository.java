package io.mykapital.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Single Android boundary for encrypted app state.
 *
 * <p>The encrypted payload format intentionally matches every previously
 * released build: Base64(GCM IV + ciphertext/tag), backed by the existing
 * Android Keystore alias.</p>
 */
final class SecureStateRepository {
    static final String NATIVE_STATE_REVISION_KEY = "native_state_revision";

    private static final String SECURE_PREFS_NAME = "my_capital_secure_storage";
    private static final String KEY_ALIAS = "my_capital_master_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String CORRUPT_SUFFIX = "__corrupt_";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;

    private final SharedPreferences preferences;
    private volatile String status = "ok";

    SecureStateRepository(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(
            SECURE_PREFS_NAME,
            Context.MODE_PRIVATE
        );
    }

    long getNativeStateRevision() {
        return preferences.getLong(NATIVE_STATE_REVISION_KEY, 0L);
    }

    String getStatus() {
        return status;
    }

    /**
     * Bridge read: unreadable ciphertext is quarantined instead of being
     * overwritten by the web layer's default state.
     */
    String getItem(String key) {
        if (key == null || key.isEmpty()) return null;
        String stored = preferences.getString(key, null);
        if (stored == null) return null;

        try {
            String plain = decryptValue(stored, true);
            if (plain == null) quarantine(key, stored);
            return plain;
        } catch (Exception error) {
            quarantine(key, stored);
            return null;
        }
    }

    /**
     * Widget read: do not mutate storage when the app has never created a key
     * or when recovery is required. The capture screen will show a safe error.
     */
    String getExistingItemOrThrow(String key) throws Exception {
        if (key == null || key.isEmpty()) return null;
        String stored = preferences.getString(key, null);
        if (stored == null) return null;
        return decryptValue(stored, false);
    }

    String setItem(String key, String value) {
        if (key == null || key.isEmpty()) return "error:empty_key";
        if (value == null || value.isEmpty()) {
            preferences.edit().remove(key).apply();
            return "ok";
        }

        try {
            preferences.edit().putString(key, encryptValue(value)).apply();
            return "ok";
        } catch (Exception error) {
            status = "encrypt_failed";
            return "error:encrypt";
        }
    }

    void setItemCommittedWithRevision(String key, String value) throws Exception {
        if (key == null || key.isEmpty()) throw new IllegalArgumentException("empty_key");
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("empty_value");
        String encryptedValue = encryptValue(value);
        boolean committed = preferences.edit()
            .putString(key, encryptedValue)
            .putLong(NATIVE_STATE_REVISION_KEY, System.currentTimeMillis())
            .commit();
        if (!committed) {
            status = "encrypt_failed";
            throw new IllegalStateException("storage_write_failed");
        }
    }

    void removeItem(String key) {
        if (key == null || key.isEmpty()) return;
        preferences.edit().remove(key).apply();
    }

    String clearAll() {
        if (!preferences.edit().clear().commit()) return "error:secure_storage_clear";

        try {
            KeyStore keyStore = loadKeyStore();
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);
            status = "ok";
            return "ok";
        } catch (Exception error) {
            return "error:keystore_clear";
        }
    }

    private void quarantine(String key, String rawValue) {
        status = "decrypt_failed";
        preferences.edit()
            .putString(key + CORRUPT_SUFFIX + System.currentTimeMillis(), rawValue)
            .remove(key)
            .apply();
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = loadKeyStore();
        if (keyStore.containsAlias(KEY_ALIAS)) return getKeyEntry(keyStore);

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

    private SecretKey getExistingSecretKey() throws Exception {
        KeyStore keyStore = loadKeyStore();
        if (!keyStore.containsAlias(KEY_ALIAS)) throw new IllegalStateException("missing_key");
        return getKeyEntry(keyStore);
    }

    private KeyStore loadKeyStore() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        return keyStore;
    }

    private SecretKey getKeyEntry(KeyStore keyStore) throws Exception {
        KeyStore.SecretKeyEntry entry = (KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null);
        if (entry == null) throw new IllegalStateException("missing_key");
        return entry.getSecretKey();
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

    private String decryptValue(String encryptedValue, boolean createKeyIfMissing) throws Exception {
        byte[] combined = Base64.decode(encryptedValue, Base64.NO_WRAP);
        if (combined.length <= GCM_IV_LENGTH_BYTES) return null;

        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        byte[] encrypted = new byte[combined.length - GCM_IV_LENGTH_BYTES];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH_BYTES);
        System.arraycopy(combined, GCM_IV_LENGTH_BYTES, encrypted, 0, encrypted.length);

        SecretKey key = createKeyIfMissing ? getOrCreateSecretKey() : getExistingSecretKey();
        Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
        byte[] decrypted = cipher.doFinal(encrypted);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
}
