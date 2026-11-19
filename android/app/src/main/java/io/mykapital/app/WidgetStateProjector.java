package io.mykapital.app;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/** Builds the small read-only financial projection shown by the home-screen widget. */
final class WidgetStateProjector {
    private static final Set<String> NON_REPORTED_DEBT_KINDS = new HashSet<>();

    static {
        NON_REPORTED_DEBT_KINDS.add("created");
        NON_REPORTED_DEBT_KINDS.add("lent");
        NON_REPORTED_DEBT_KINDS.add("repaid_to_me");
    }

    static final class Snapshot {
        final long currentBalanceMinor;
        final long capitalBalanceMinor;
        final long todayExpenseMinor;

        Snapshot(long currentBalanceMinor, long capitalBalanceMinor, long todayExpenseMinor) {
            this.currentBalanceMinor = currentBalanceMinor;
            this.capitalBalanceMinor = capitalBalanceMinor;
            this.todayExpenseMinor = todayExpenseMinor;
        }
    }

    private WidgetStateProjector() {}

    static Snapshot project(JSONObject state, long nowMillis, TimeZone timeZone) {
        if (state == null) return new Snapshot(0L, 0L, 0L);
        long currentBalance = state.optLong("availableBalance", 0L);
        long capitalBalance = state.optLong("capital", 0L);
        long todayExpense = sumTodayExpenses(state.optJSONArray("transactions"), nowMillis, timeZone);
        return new Snapshot(currentBalance, capitalBalance, todayExpense);
    }

    private static long sumTodayExpenses(JSONArray transactions, long nowMillis, TimeZone timeZone) {
        if (transactions == null) return 0L;
        long total = 0L;
        for (int index = 0; index < transactions.length(); index += 1) {
            JSONObject transaction = transactions.optJSONObject(index);
            if (!isReportedExpense(transaction)) continue;
            long timestamp = parseIsoTimestamp(transaction.optString("date", ""));
            if (timestamp < 0L || !isSameLocalDay(timestamp, nowMillis, timeZone)) continue;
            long amount = Math.max(0L, transaction.optLong("amount", 0L));
            total = saturatedAdd(total, amount);
        }
        return total;
    }

    private static boolean isReportedExpense(JSONObject transaction) {
        if (transaction == null || !"expense".equals(transaction.optString("type", ""))) return false;
        JSONObject meta = transaction.optJSONObject("meta");
        if (meta == null) return true;
        if (!meta.optString("system", "").isEmpty()) return false;
        return !NON_REPORTED_DEBT_KINDS.contains(meta.optString("debtKind", ""));
    }

    private static boolean isSameLocalDay(long leftMillis, long rightMillis, TimeZone timeZone) {
        Calendar left = Calendar.getInstance(timeZone, Locale.ROOT);
        Calendar right = Calendar.getInstance(timeZone, Locale.ROOT);
        left.setTimeInMillis(leftMillis);
        right.setTimeInMillis(rightMillis);
        return left.get(Calendar.ERA) == right.get(Calendar.ERA)
            && left.get(Calendar.YEAR) == right.get(Calendar.YEAR)
            && left.get(Calendar.DAY_OF_YEAR) == right.get(Calendar.DAY_OF_YEAR);
    }

    private static long parseIsoTimestamp(String value) {
        if (value == null || value.trim().isEmpty()) return -1L;
        String[] patterns = {
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
        };
        for (String pattern : patterns) {
            SimpleDateFormat parser = new SimpleDateFormat(pattern, Locale.US);
            parser.setLenient(false);
            if (pattern.endsWith("'Z'")) parser.setTimeZone(TimeZone.getTimeZone("UTC"));
            try {
                Date parsed = parser.parse(value);
                if (parsed != null) return parsed.getTime();
            } catch (ParseException ignored) {
                // Try the next supported ISO-8601 form.
            }
        }
        return -1L;
    }

    private static long saturatedAdd(long left, long right) {
        if (right > 0L && left > Long.MAX_VALUE - right) return Long.MAX_VALUE;
        return left + right;
    }
}
