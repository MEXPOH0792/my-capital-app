package io.mykapital.app;

/** Maps Android SpeechRecognizer error integers to stable app statuses. */
final class SpeechRecognitionErrorMapper {
    private SpeechRecognitionErrorMapper() {}

    static String toStatus(int error) {
        switch (error) {
            case 9: // SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
                return "permission_denied";
            case 7: // SpeechRecognizer.ERROR_NO_MATCH
                return "no_match";
            case 6: // SpeechRecognizer.ERROR_SPEECH_TIMEOUT
            case 1: // SpeechRecognizer.ERROR_NETWORK_TIMEOUT
                return "timeout";
            case 8: // SpeechRecognizer.ERROR_RECOGNIZER_BUSY
            case 10: // SpeechRecognizer.ERROR_TOO_MANY_REQUESTS
                return "busy";
            case 3: // SpeechRecognizer.ERROR_AUDIO
                return "audio";
            case 5: // SpeechRecognizer.ERROR_CLIENT
                return "cancelled";
            case 12: // SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED
                return "language_unsupported";
            case 13: // SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE
                return "model_missing";
            case 11: // SpeechRecognizer.ERROR_SERVER_DISCONNECTED
                return "service_disconnected";
            case 2: // SpeechRecognizer.ERROR_NETWORK
            case 4: // SpeechRecognizer.ERROR_SERVER
                return "offline_unavailable";
            default:
                return "unknown";
        }
    }
}
