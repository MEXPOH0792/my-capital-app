package io.mykapital.app;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collections;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class VoiceCommandParserTest {
    private final VoiceCommandParser parser = new VoiceCommandParser(false);

    @Test
    public void numericThousandsStayIncome() {
        VoiceCommandParser.Result result = parse("доход 10 тысяч зарплата");

        assertEquals(VoiceCommandParser.TYPE_INCOME, result.type);
        assertEquals(1_000_000L, result.amountMinor);
        assertEquals("Зарплата", result.category);
    }

    @Test
    public void wordThousandsStayIncome() {
        VoiceCommandParser.Result result = parse("доход десять тысяч зарплата");

        assertEquals(VoiceCommandParser.TYPE_INCOME, result.type);
        assertEquals(1_000_000L, result.amountMinor);
    }

    @Test
    public void honorGroupedNumberCreatesExpense() {
        VoiceCommandParser.Result result = parse("расход 1 250 продукты");

        assertEquals(VoiceCommandParser.TYPE_EXPENSE, result.type);
        assertEquals(125_000L, result.amountMinor);
        assertEquals("Продукты", result.category);
    }

    @Test
    public void conflictingTypeIsRejected() {
        VoiceCommandParser.Result result = parse("доход расход 1000");

        assertEquals(VoiceCommandParser.TYPE_CONFLICT, result.type);
    }

    @Test
    public void missingTypeRemainsUnknown() {
        VoiceCommandParser.Result result = parse("1000 ремонт");

        assertEquals(VoiceCommandParser.TYPE_UNKNOWN, result.type);
        assertEquals(100_000L, result.amountMinor);
    }

    @Test
    public void knownCategoryCanDetermineType() {
        VoiceCommandParser.Result result = parser.parse(
            "зарплата десять тысяч",
            Collections.emptyList(),
            Collections.singletonList(new VoiceCommandParser.CategoryCandidate("income", "Зарплата"))
        );

        assertEquals(VoiceCommandParser.TYPE_INCOME, result.type);
        assertEquals("Зарплата", result.category);
    }

    @Test
    public void spokenAccountIsSeparatedFromCategory() {
        VoiceCommandParser.Result result = parser.parse(
            "расход 500 продукты с основной карты",
            Arrays.asList(
                new VoiceCommandParser.AccountCandidate("primary", "Основная карта", true),
                new VoiceCommandParser.AccountCandidate("reserve", "Финансовый запас", false)
            ),
            Collections.emptyList()
        );

        assertEquals("primary", result.accountId);
        assertEquals("Продукты", result.category);
    }

    @Test
    public void amountAboveWebCeilingIsRejected() {
        VoiceCommandParser.Result result = parse("доход 99999999999999999");

        assertEquals(0L, result.amountMinor);
    }

    @Test
    public void matchesSharedWebAndroidGoldenFixtures() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("voice-command-golden.json");
        if (stream == null) throw new AssertionError("Missing voice-command-golden.json");
        JSONObject golden = new JSONObject(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
        JSONArray accountJson = golden.getJSONArray("accounts");
        JSONArray categoryJson = golden.getJSONArray("categories");
        JSONArray cases = golden.getJSONArray("cases");

        java.util.ArrayList<VoiceCommandParser.AccountCandidate> accounts = new java.util.ArrayList<>();
        for (int index = 0; index < accountJson.length(); index += 1) {
            JSONObject item = accountJson.getJSONObject(index);
            accounts.add(new VoiceCommandParser.AccountCandidate(
                item.getString("id"),
                item.getString("name"),
                item.getBoolean("includeInSpendable")
            ));
        }

        java.util.ArrayList<VoiceCommandParser.CategoryCandidate> categories = new java.util.ArrayList<>();
        for (int index = 0; index < categoryJson.length(); index += 1) {
            JSONObject item = categoryJson.getJSONObject(index);
            categories.add(new VoiceCommandParser.CategoryCandidate(item.getString("type"), item.getString("name")));
        }

        for (int index = 0; index < cases.length(); index += 1) {
            JSONObject fixture = cases.getJSONObject(index);
            JSONObject expected = fixture.getJSONObject("expected");
            VoiceCommandParser.Result result = parser.parse(fixture.getString("transcript"), accounts, categories);
            String id = fixture.getString("id");

            assertEquals(id + ":type", expected.getString("type"), result.type);
            assertEquals(id + ":amountMinor", expected.getLong("amountMinor"), result.amountMinor);
            assertEquals(id + ":category", expected.getString("category"), result.category);
            assertEquals(id + ":accountId", expected.getString("accountId"), result.accountId);
        }
    }

    private VoiceCommandParser.Result parse(String transcript) {
        return parser.parse(transcript, Collections.emptyList(), Collections.emptyList());
    }
}
