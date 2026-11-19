package io.mykapital.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class VoiceTransactionServiceTest {
    @Test
    public void incomeIncreasesBalanceAndCreatesIncomeRecord() throws Exception {
        JSONObject state = stateWithAccounts(50_000L);
        state.put("incomeDistributionEnabled", false);

        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_INCOME, 1_000_000L),
            "Зарплата"
        );

        assertTrue(result.isSuccess());
        assertEquals(1_050_000L, account(state, "primary").getLong("balance"));
        assertEquals(1_050_000L, state.getLong("availableBalance"));
        assertEquals("income", state.getJSONArray("transactions").getJSONObject(0).getString("type"));
        assertEquals(1_000_000L, state.getJSONArray("transactions").getJSONObject(0).getLong("amount"));
    }

    @Test
    public void expenseDecreasesSelectedBalance() throws Exception {
        JSONObject state = stateWithAccounts(200_000L);

        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_EXPENSE, 125_000L),
            "Продукты"
        );

        assertTrue(result.isSuccess());
        assertEquals(75_000L, account(state, "primary").getLong("balance"));
        assertEquals(75_000L, state.getLong("availableBalance"));
        assertEquals("expense", state.getJSONArray("transactions").getJSONObject(0).getString("type"));
    }

    @Test
    public void insufficientFundsDoNotMutateState() throws Exception {
        JSONObject state = stateWithAccounts(50_000L);

        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_EXPENSE, 100_000L),
            "Покупка"
        );

        assertFalse(result.isSuccess());
        assertEquals(VoiceTransactionService.Failure.INSUFFICIENT_FUNDS, result.failure);
        assertEquals(50_000L, account(state, "primary").getLong("balance"));
        assertEquals(0, state.getJSONArray("transactions").length());
    }

    @Test
    public void distributedIncomePreservesEveryMinorUnit() throws Exception {
        JSONObject state = stateWithAccounts(0L);
        state
            .put("incomeDistributionEnabled", true)
            .put("incomeDistributionBasis", "total_income")
            .put("allocationPercents", new JSONObject()
                .put("balance", 85d)
                .put("safety", 8d)
                .put("capital", 6d)
                .put("sadaka", 1d));

        long income = 1_000_003L;
        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_INCOME, income),
            "Доход"
        );

        assertTrue(result.isSuccess());
        long allocated = account(state, "primary").getLong("balance")
            + account(state, "safety").getLong("balance")
            + account(state, "capital").getLong("balance")
            + account(state, "sadaka").getLong("balance");
        assertEquals(income, allocated);
        assertEquals(850_003L, account(state, "primary").getLong("balance"));
        assertEquals(10_000L, state.getLong("totalSadakaPaid"));
        assertEquals("income", state.getJSONArray("transactions").getJSONObject(0).getString("type"));
    }

    @Test
    public void requiredExpensesAreReservedBeforeIncomeDistribution() throws Exception {
        JSONObject state = stateWithAccounts(0L);
        state
            .put("incomeDistributionEnabled", true)
            .put("incomeDistributionBasis", "free_after_required")
            .put("allocationPercents", defaultAllocation())
            .put("requiredExpenses", new JSONArray().put(new JSONObject().put("amount", 300_000L)));

        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_INCOME, 1_000_000L),
            "Доход"
        );

        assertTrue(result.isSuccess());
        assertEquals(895_000L, account(state, "primary").getLong("balance"));
        assertEquals(300_000L, state.getJSONObject("monthlyCoverage").getLong("requiredCovered"));
        assertEquals(1_000_000L, state.getJSONObject("monthlyCoverage").getLong("incomeTotal"));
        assertEquals(3, state.getJSONArray("transactions").length());
    }

    @Test
    public void missingSadakaAccountKeepsItsShareOnMainBalance() throws Exception {
        JSONObject state = stateWithAccounts(0L);
        removeAccount(state, "sadaka");
        state
            .put("incomeDistributionEnabled", true)
            .put("incomeDistributionBasis", "total_income")
            .put("allocationPercents", defaultAllocation());

        VoiceTransactionService.Result result = service().apply(
            state,
            command(VoiceCommandParser.TYPE_INCOME, 1_000_000L),
            "Доход"
        );

        assertTrue(result.isSuccess());
        assertEquals(860_000L, account(state, "primary").getLong("balance"));
        assertEquals(0L, state.getLong("totalSadakaPaid"));
        assertEquals(1, state.getJSONArray("transactions").length());
    }

    @Test
    public void legacyMoneyVersionIsRefusedWithoutMutation() throws Exception {
        JSONObject state = stateWithAccounts(50_000L).put("moneyVersion", 1);

        try {
            service().apply(state, command(VoiceCommandParser.TYPE_INCOME, 100_000L), "Доход");
            throw new AssertionError("Legacy state must be refused");
        } catch (IllegalStateException error) {
            assertEquals("unsupported_state_version", error.getMessage());
        }

        assertEquals(50_000L, account(state, "primary").getLong("balance"));
        assertEquals(0, state.getJSONArray("transactions").length());
    }

    private VoiceTransactionService service() {
        return new VoiceTransactionService(false);
    }

    private VoiceCommandParser.Result command(String type, long amountMinor) {
        return new VoiceCommandParser.Result(type, amountMinor, "", "primary");
    }

    private JSONObject stateWithAccounts(long primaryBalance) throws Exception {
        JSONArray accounts = new JSONArray()
            .put(new JSONObject()
                .put("id", "primary")
                .put("name", "Основной счёт")
                .put("systemKey", "liquidPrimary")
                .put("includeInSpendable", true)
                .put("isPrimary", true)
                .put("balance", primaryBalance))
            .put(protectedAccount("safety", "Финансовый запас"))
            .put(protectedAccount("capital", "Капитал"))
            .put(protectedAccount("sadaka", "Садака"));

        return new JSONObject()
            .put("moneyVersion", 2)
            .put("accounts", accounts)
            .put("transactions", new JSONArray())
            .put("requiredExpenses", new JSONArray())
            .put("totalSadakaPaid", 0L);
    }

    private JSONObject defaultAllocation() throws Exception {
        return new JSONObject()
            .put("balance", 85d)
            .put("safety", 8d)
            .put("capital", 6d)
            .put("sadaka", 1d);
    }

    private void removeAccount(JSONObject state, String id) throws Exception {
        JSONArray current = state.getJSONArray("accounts");
        JSONArray next = new JSONArray();
        for (int index = 0; index < current.length(); index += 1) {
            JSONObject account = current.getJSONObject(index);
            if (!id.equals(account.getString("id"))) next.put(account);
        }
        state.put("accounts", next);
    }

    private JSONObject protectedAccount(String systemKey, String name) throws Exception {
        return new JSONObject()
            .put("id", systemKey)
            .put("name", name)
            .put("systemKey", systemKey)
            .put("includeInSpendable", false)
            .put("isPrimary", false)
            .put("balance", 0L);
    }

    private JSONObject account(JSONObject state, String id) throws Exception {
        JSONArray accounts = state.getJSONArray("accounts");
        for (int index = 0; index < accounts.length(); index += 1) {
            JSONObject account = accounts.getJSONObject(index);
            if (id.equals(account.getString("id"))) return account;
        }
        throw new AssertionError("Missing account: " + id);
    }
}
