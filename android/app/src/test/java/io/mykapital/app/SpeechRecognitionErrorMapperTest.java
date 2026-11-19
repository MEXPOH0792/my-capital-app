package io.mykapital.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class SpeechRecognitionErrorMapperTest {
    @Test
    public void distinguishesMissingModelFromUnsupportedLanguage() {
        assertEquals("model_missing", SpeechRecognitionErrorMapper.toStatus(13));
        assertEquals("language_unsupported", SpeechRecognitionErrorMapper.toStatus(12));
    }

    @Test
    public void mapsPermissionAndNoMatchPrecisely() {
        assertEquals("permission_denied", SpeechRecognitionErrorMapper.toStatus(9));
        assertEquals("no_match", SpeechRecognitionErrorMapper.toStatus(7));
    }

    @Test
    public void mapsTimeoutAndBusyConditions() {
        assertEquals("timeout", SpeechRecognitionErrorMapper.toStatus(6));
        assertEquals("busy", SpeechRecognitionErrorMapper.toStatus(8));
        assertEquals("busy", SpeechRecognitionErrorMapper.toStatus(10));
    }

    @Test
    public void unknownCodeRemainsUnknown() {
        assertEquals("unknown", SpeechRecognitionErrorMapper.toStatus(999));
    }
}
