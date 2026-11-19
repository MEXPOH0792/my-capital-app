package io.mykapital.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;

/** Owns one strictly on-device Android speech-recognition session. */
final class OnDeviceSpeechService {
    interface Callback {
        void onResult(String status, String transcript);
    }

    private final Context context;
    private SpeechRecognizer recognizer;
    private Callback activeCallback;

    OnDeviceSpeechService(Context context) {
        this.context = context;
    }

    static boolean isAvailable(Context context) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
    }

    static String availabilityStatus(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return "unsupported_os";
        return SpeechRecognizer.isOnDeviceRecognitionAvailable(context) ? "available" : "service_unavailable";
    }

    void start(String languageTag, Callback callback) {
        if (!isAvailable(context)) {
            callback.onResult("unavailable", "");
            return;
        }

        destroy();
        activeCallback = callback;
        try {
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onPartialResults(Bundle partialResults) {}
                @Override public void onEvent(int eventType, Bundle params) {}

                @Override
                public void onError(int error) {
                    finish(callback, SpeechRecognitionErrorMapper.toStatus(error), "");
                }

                @Override
                public void onResults(Bundle results) {
                    ArrayList<String> matches = results == null
                        ? null
                        : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    String transcript = matches == null || matches.isEmpty() ? "" : matches.get(0);
                    if (transcript == null || transcript.trim().isEmpty()) {
                        finish(callback, "no_match", "");
                    } else {
                        finish(callback, "ok", transcript.trim());
                    }
                }
            });

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, normalizeLanguageTag(languageTag));
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            recognizer.startListening(intent);
        } catch (Exception error) {
            finish(callback, "unavailable", "");
        }
    }

    void destroy() {
        SpeechRecognizer current = recognizer;
        recognizer = null;
        activeCallback = null;
        if (current != null) {
            current.cancel();
            current.destroy();
        }
    }

    private void finish(Callback callback, String status, String transcript) {
        if (activeCallback != callback) return;
        activeCallback = null;
        SpeechRecognizer current = recognizer;
        recognizer = null;
        if (current != null) current.destroy();
        callback.onResult(status, transcript);
    }

    private String normalizeLanguageTag(String languageTag) {
        return languageTag == null || languageTag.trim().isEmpty() ? "ru-RU" : languageTag.trim();
    }
}
