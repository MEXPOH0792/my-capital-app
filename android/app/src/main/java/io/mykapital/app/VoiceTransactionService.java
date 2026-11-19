package io.mykapital.app;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Locale;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Applies a parsed voice command to the persisted finance state.
 *
 * <p>This class owns the native finance mutation rules. The Activity remains
 * responsible only for speech capture, user feedback and persistence.</p>
 */
final class VoiceTransactionService {
    private static final int SUPPORTED_MONEY_VERSION = 2;
    private static final long MAX_AMOUNT_MINOR = 1_000_000_000_000_000L;

    enum Failure {
        NONE,
        INSUFFICIENT_FUNDS
    }

    static final class Result {
        final Failure failure;

        private Result(Failure failure) {
            this.failure = failure;
        }

        static Result success() {
            return new Result(Failure.NONE);
        }

        static Result failure(Failure failure) {
            return new Result(failure);
        }

        boolean isSuccess() {
            return failure == Failure.NONE;
        }
    }

    private final boolean isEnglish;

    VoiceTransactionService(boolean isEnglish) {
        this.isEnglish = isEnglish;
    }

    Result apply(JSONObject state, VoiceCommandParser.Result command, String category) throws Exception {
        validateStateAndCommand(state, command);
        JSONArray accounts = state.optJSONArray("accounts");
        JSONArray transactions = state.optJSONArray("transactions");
        if (accounts == null || accounts.length() == 0) {
            throw new IllegalStateException("missing_accounts");
        }
        if (transactions == null) transactions = new JSONArray();

        if ("income".equals(command.type)) {
            applyIncome(state, accounts, transactions, command.amountMinor, category);
            return Result.success();
        }

        JSONObject account = selectAccount(accounts, command.accountId, command.amountMinor);
        if (account == null) return Result.failure(Failure.INSUFFICIENT_FUNDS);
        applyExpense(state, transactions, account, command.amountMinor, category);
        return Result.success();
    }

    private void validateStateAndCommand(JSONObject state, VoiceCommandParser.Result command) {
        if (state == null || state.optInt("moneyVersion", 0) != SUPPORTED_MONEY_VERSION) {
            throw new IllegalStateException("unsupported_state_version");
        }
        if (command == null || command.amountMinor <= 0L || command.amountMinor > MAX_AMOUNT_MINOR) {
            throw new IllegalArgumentException("invalid_amount");
        }
        if (!"income".equals(command.type) && !"expense".equals(command.type)) {
            throw new IllegalArgumentException("invalid_transaction_type");
        }
    }

    private JSONObject selectAccount(JSONArray accounts, String requestedId, long amountMinor) {
        JSONObject primary = null;
        JSONObject fallback = null;
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.optJSONObject(index);
            if (account == null || !account.optBoolean("includeInSpendable", false)) continue;
            long balance = account.optLong("balance", 0L);
            if (!requestedId.isEmpty() && requestedId.equals(account.optString("id", ""))) {
                return balance >= amountMinor ? account : null;
            }
            if (balance < amountMinor) continue;
            if (account.optBoolean("isPrimary", false)) primary = account;
            if (fallback == null) fallback = account;
        }
        return primary != null ? primary : fallback;
    }

    private void applyExpense(
        JSONObject state,
        JSONArray transactions,
        JSONObject account,
        long amountMinor,
        String category
    ) throws Exception {
        account.put("balance", account.optLong("balance", 0L) - amountMinor);

        JSONArray effects = new JSONArray();
        effects.put(createEffect(account, -amountMinor));
        JSONObject meta = new JSONObject()
            .put("accountId", account.optString("id", ""))
            .put("accountName", account.optString("name", ""))
            .put("effects", effects);
        JSONObject record = new JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("type", "expense")
            .put("amount", amountMinor)
            .put("category", category)
            .put("date", isoNow())
            .put("meta", meta);

        state.put("transactions", prependRecords(transactions, record));
        syncAccountTotals(state, state.optJSONArray("accounts"));
    }

    private void applyIncome(
        JSONObject state,
        JSONArray accounts,
        JSONArray transactions,
        long amountMinor,
        String category
    ) throws Exception {
        JSONObject primary = findSystemAccount(accounts, "liquidPrimary");
        if (primary == null) primary = findPrimarySpendableAccount(accounts);
        if (primary == null) throw new IllegalStateException("missing_primary_account");

        JSONObject coverage = syncMonthlyCoverage(state.optJSONObject("monthlyCoverage"));
        String monthKey = coverage.optString("monthKey", currentMonthKey());
        String date = isoNow();
        String incomeId = UUID.randomUUID().toString();
        JSONArray records = new JSONArray();

        if (!state.optBoolean("incomeDistributionEnabled", false)) {
            primary.put("balance", primary.optLong("balance", 0L) + amountMinor);
            coverage.put("incomeTotal", coverage.optLong("incomeTotal", 0L) + amountMinor);

            JSONArray effects = new JSONArray().put(createEffect(primary, amountMinor));
            JSONObject meta = new JSONObject()
                .put("accountId", primary.optString("id", ""))
                .put("accountName", primary.optString("name", ""))
                .put("effects", effects)
                .put("coverage", createCoverageEffect(monthKey, amountMinor, 0L));
            records.put(createTransaction(incomeId, "income", amountMinor, category, date, meta));
        } else {
            long reservedForRequired = 0L;
            if ("free_after_required".equals(state.optString("incomeDistributionBasis", ""))) {
                JSONArray required = state.optJSONArray("requiredExpenses");
                long totalRequired = 0L;
                if (required != null) {
                    for (int index = 0; index < required.length(); index += 1) {
                        JSONObject item = required.optJSONObject(index);
                        if (item != null) totalRequired += Math.max(0L, item.optLong("amount", 0L));
                    }
                }
                long uncovered = Math.max(0L, totalRequired - coverage.optLong("requiredCovered", 0L));
                reservedForRequired = Math.min(amountMinor, uncovered);
            }

            long distributable = Math.max(0L, amountMinor - reservedForRequired);
            SplitAmounts split = splitIncome(distributable, state.optJSONObject("allocationPercents"));
            JSONObject safety = findSystemAccount(accounts, "safety");
            JSONObject capital = findSystemAccount(accounts, "capital");
            JSONObject sadaka = findSystemAccount(accounts, "sadaka");
            long sadakaShare = sadaka == null ? 0L : split.sadaka;
            long primaryDelta = reservedForRequired + split.balance + (sadaka == null ? split.sadaka : 0L);

            addToBalance(primary, primaryDelta);
            addToBalance(safety, split.safety);
            addToBalance(capital, split.capital);
            addToBalance(sadaka, sadakaShare);
            coverage.put("incomeTotal", coverage.optLong("incomeTotal", 0L) + amountMinor);
            coverage.put("requiredCovered", coverage.optLong("requiredCovered", 0L) + reservedForRequired);
            state.put("totalSadakaPaid", state.optLong("totalSadakaPaid", 0L) + sadakaShare);

            JSONArray effects = new JSONArray();
            putEffect(effects, primary, primaryDelta);
            putEffect(effects, safety, split.safety);
            putEffect(effects, capital, split.capital);
            putEffect(effects, sadaka, sadakaShare);
            JSONObject meta = new JSONObject()
                .put("accountId", primary.optString("id", ""))
                .put("accountName", primary.optString("name", ""))
                .put("distributed", true)
                .put("effects", effects)
                .put("coverage", createCoverageEffect(monthKey, amountMinor, reservedForRequired));
            if (sadakaShare > 0L) meta.put("sadakaPaidDelta", sadakaShare);
            records.put(createTransaction(incomeId, "income", amountMinor, category, date, meta));

            if (reservedForRequired > 0L) {
                JSONObject reserveMeta = new JSONObject().put("parentId", incomeId).put("system", "reserve");
                records.put(createTransaction(
                    UUID.randomUUID().toString(),
                    "expense",
                    reservedForRequired,
                    isEnglish ? "Reserve for required expenses" : "Резерв под обязательные расходы",
                    date,
                    reserveMeta
                ));
            }
            if (sadakaShare > 0L && sadaka != null) {
                JSONObject sadakaMeta = new JSONObject()
                    .put("parentId", incomeId)
                    .put("system", "sadaka")
                    .put("accountId", sadaka.optString("id", ""))
                    .put("accountName", sadaka.optString("name", ""));
                records.put(createTransaction(
                    UUID.randomUUID().toString(),
                    "expense",
                    sadakaShare,
                    isEnglish ? "Automatic sadaka allocation" : "Авто-отчисление на садака",
                    date,
                    sadakaMeta
                ));
            }
        }

        state.put("monthlyCoverage", coverage);
        state.put("transactions", prependRecords(transactions, records));
        syncAccountTotals(state, accounts);
    }

    private JSONObject findSystemAccount(JSONArray accounts, String systemKey) {
        if (accounts == null) return null;
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.optJSONObject(index);
            if (account != null && systemKey.equals(account.optString("systemKey", ""))) return account;
        }
        return null;
    }

    private JSONObject findPrimarySpendableAccount(JSONArray accounts) {
        JSONObject fallback = null;
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.optJSONObject(index);
            if (account == null || !account.optBoolean("includeInSpendable", false)) continue;
            if (account.optBoolean("isPrimary", false)) return account;
            if (fallback == null) fallback = account;
        }
        return fallback;
    }

    private void addToBalance(JSONObject account, long delta) throws Exception {
        if (account != null && delta != 0L) account.put("balance", account.optLong("balance", 0L) + delta);
    }

    private JSONObject createEffect(JSONObject account, long delta) throws Exception {
        return new JSONObject().put("accountId", account.optString("id", "")).put("delta", delta);
    }

    private void putEffect(JSONArray effects, JSONObject account, long delta) throws Exception {
        if (account != null && delta != 0L) effects.put(createEffect(account, delta));
    }

    private JSONObject createCoverageEffect(String monthKey, long incomeDelta, long requiredDelta) throws Exception {
        return new JSONObject()
            .put("monthKey", monthKey)
            .put("incomeTotalDelta", incomeDelta)
            .put("requiredCoveredDelta", requiredDelta);
    }

    private JSONObject createTransaction(
        String id,
        String type,
        long amount,
        String category,
        String date,
        JSONObject meta
    ) throws Exception {
        return new JSONObject()
            .put("id", id)
            .put("type", type)
            .put("amount", amount)
            .put("category", category)
            .put("date", date)
            .put("meta", meta);
    }

    private JSONArray prependRecords(JSONArray previous, JSONObject record) throws Exception {
        return prependRecords(previous, new JSONArray().put(record));
    }

    private JSONArray prependRecords(JSONArray previous, JSONArray records) throws Exception {
        JSONArray merged = new JSONArray();
        for (int index = 0; index < records.length(); index += 1) merged.put(records.get(index));
        for (int index = 0; index < previous.length(); index += 1) merged.put(previous.get(index));
        return merged;
    }

    private void syncAccountTotals(JSONObject state, JSONArray accounts) throws Exception {
        long available = 0L;
        long safety = 0L;
        long capital = 0L;
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.optJSONObject(index);
            if (account == null) continue;
            long balance = account.optLong("balance", 0L);
            if (account.optBoolean("includeInSpendable", false)) available += balance;
            if ("safety".equals(account.optString("systemKey", ""))) safety += balance;
            if ("capital".equals(account.optString("systemKey", ""))) capital += balance;
        }
        state.put("accounts", accounts);
        state.put("availableBalance", available);
        state.put("safetyFund", safety);
        state.put("capital", capital);
    }

    private JSONObject syncMonthlyCoverage(JSONObject current) throws Exception {
        String monthKey = currentMonthKey();
        if (current == null || !monthKey.equals(current.optString("monthKey", ""))) {
            return new JSONObject().put("monthKey", monthKey).put("incomeTotal", 0L).put("requiredCovered", 0L);
        }
        return current;
    }

    private String currentMonthKey() {
        Calendar now = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d", now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1);
    }

    private SplitAmounts splitIncome(long amount, JSONObject percents) {
        String[] keys = { "balance", "safety", "capital", "sadaka" };
        double[] defaults = { 85d, 8d, 6d, 1d };
        ArrayList<AllocationPart> parts = new ArrayList<>();
        long allocated = 0L;
        for (int index = 0; index < keys.length; index += 1) {
            double percent = percents == null ? defaults[index] : Math.max(0d, percents.optDouble(keys[index], 0d));
            double exact = amount * (percent / 100d);
            long base = (long) Math.floor(exact);
            parts.add(new AllocationPart(keys[index], base, exact - base, index));
            allocated += base;
        }
        long leftover = amount - allocated;
        Collections.sort(parts, new Comparator<AllocationPart>() {
            @Override
            public int compare(AllocationPart left, AllocationPart right) {
                int byRemainder = Double.compare(right.remainder, left.remainder);
                return byRemainder != 0 ? byRemainder : Integer.compare(left.order, right.order);
            }
        });
        for (AllocationPart part : parts) {
            if (leftover <= 0L) break;
            part.amount += 1L;
            leftover -= 1L;
        }
        SplitAmounts result = new SplitAmounts();
        for (AllocationPart part : parts) {
            if ("balance".equals(part.key)) result.balance = part.amount;
            else if ("safety".equals(part.key)) result.safety = part.amount;
            else if ("capital".equals(part.key)) result.capital = part.amount;
            else if ("sadaka".equals(part.key)) result.sadaka = part.amount;
        }
        // Invalid custom percentages must never make money disappear.
        if (leftover > 0L) result.balance += leftover;
        return result;
    }

    private String isoNow() {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formatter.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return formatter.format(new java.util.Date());
    }

    private static final class SplitAmounts {
        long balance;
        long safety;
        long capital;
        long sadaka;
    }

    private static final class AllocationPart {
        final String key;
        final double remainder;
        final int order;
        long amount;

        AllocationPart(String key, long amount, double remainder, int order) {
            this.key = key;
            this.amount = amount;
            this.remainder = remainder;
            this.order = order;
        }
    }
}
