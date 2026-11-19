package io.mykapital.app;

import static org.junit.Assert.assertEquals;

import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class WidgetStateProjectorTest {
    private static final long NOW = 1793880000000L; // 2026-11-05T12:00:00Z

    @Test
    public void projectsBalanceCapitalAndOnlyReportedTodayExpenses() throws Exception {
        JSONArray transactions = new JSONArray()
            .put(transaction("expense", 45000L, "2026-11-05T09:00:00.000Z", new JSONObject()))
            .put(transaction("expense", 5000L, "2026-11-05T10:00:00.000Z", new JSONObject().put("debtKind", "payment")))
            .put(transaction("expense", 9000L, "2026-11-05T10:30:00.000Z", new JSONObject().put("system", "reserve")))
            .put(transaction("expense", 7000L, "2026-11-05T11:00:00.000Z", new JSONObject().put("debtKind", "lent")))
            .put(transaction("expense", 12000L, "2026-11-04T23:00:00.000Z", new JSONObject()))
            .put(transaction("income", 100000L, "2026-11-05T08:00:00.000Z", new JSONObject()));
        JSONObject state = new JSONObject()
            .put("availableBalance", 4850000L)
            .put("capital", 12040000L)
            .put("transactions", transactions);

        WidgetStateProjector.Snapshot snapshot = WidgetStateProjector.project(
            state,
            NOW,
            TimeZone.getTimeZone("UTC")
        );

        assertEquals(4850000L, snapshot.currentBalanceMinor);
        assertEquals(12040000L, snapshot.capitalBalanceMinor);
        assertEquals(50000L, snapshot.todayExpenseMinor);
    }

    @Test
    public void invalidDatesAndNegativeAmountsDoNotReachTheWidget() throws Exception {
        JSONArray transactions = new JSONArray()
            .put(transaction("expense", 5000L, "not-a-date", new JSONObject()))
            .put(transaction("expense", -9000L, "2026-11-05T10:00:00.000Z", new JSONObject()));
        JSONObject state = new JSONObject().put("transactions", transactions);

        WidgetStateProjector.Snapshot snapshot = WidgetStateProjector.project(
            state,
            NOW,
            TimeZone.getTimeZone("UTC")
        );

        assertEquals(0L, snapshot.todayExpenseMinor);
    }

    private JSONObject transaction(String type, long amount, String date, JSONObject meta) throws Exception {
        return new JSONObject().put("type", type).put("amount", amount).put("date", date).put("meta", meta);
    }
}
