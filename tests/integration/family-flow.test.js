import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import {
  completeBaseOnboarding,
  getSystemAccount,
  resetStore,
  sanitizeImportedState,
  useStore,
} from '../harness/store.js';
import { buildFamilyReportFile, parseFamilyReportFile } from '../../src/domain/family.js';
import { toMinorUnits } from '../../src/utils/money.js';

const state = () => useStore.getState();

const partnerFile = (expenses, { senderId = 'wife-1', monthKey = '2026-09', currency = 'RUB' } = {}) =>
  buildFamilyReportFile({
    senderId,
    senderName: 'Аиша',
    currency,
    summary: {
      monthKey,
      expensesTotal: expenses,
      categories: [{ category: 'Еда', amount: expenses }],
    },
  });

const start = () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(50000) } });
};

addTest('importing a partner report creates the member and leaves money untouched', () => {
  start();
  const before = {
    available: state().availableBalance,
    capital: state().capital,
    safety: state().safetyFund,
    primary: getSystemAccount('liquidPrimary').balance,
  };

  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(45000)), 'RUB'));

  assert.equal(state().familyMember.name, 'Аиша');
  assert.equal(state().familyReports.length, 1);
  assert.equal(state().familyReports[0].expensesTotal, toMinorUnits(45000));
  assert.deepEqual(
    {
      available: state().availableBalance,
      capital: state().capital,
      safety: state().safetyFund,
      primary: getSystemAccount('liquidPrimary').balance,
    },
    before,
  );
  assert.equal(state().transactions.length, 0);
});

addTest('re-importing the same month replaces it instead of doubling', () => {
  start();
  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(45000)), 'RUB'));
  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(45000)), 'RUB'));
  assert.equal(state().familyReports.length, 1);

  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(52000)), 'RUB'));
  assert.equal(state().familyReports.length, 1);
  assert.equal(state().familyReports[0].expensesTotal, toMinorUnits(52000));

  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(1000), { monthKey: '2026-08' }), 'RUB'));
  assert.deepEqual(
    state().familyReports.map((item) => item.monthKey),
    ['2026-09', '2026-08'],
  );
});

addTest('a report from another device needs confirmation', () => {
  start();
  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(45000)), 'RUB'));
  const foreign = parseFamilyReportFile(partnerFile(toMinorUnits(1000), { senderId: 'other-phone' }), 'RUB');

  assert.throws(() => state().importFamilyReport(foreign), { code: 'other_device' });
  assert.equal(state().familyReports[0].expensesTotal, toMinorUnits(45000));

  state().importFamilyReport(foreign, { acceptForeign: true });
  assert.equal(state().familyReports[0].expensesTotal, toMinorUnits(1000));
  assert.equal(state().familyMember.senderId, 'other-phone');
});

addTest('family data survives a backup roundtrip and member removal clears it', () => {
  start();
  state().importFamilyReport(parseFamilyReportFile(partnerFile(toMinorUnits(45000)), 'RUB'));
  state().renameFamilyMember('Жена');

  const restored = sanitizeImportedState(JSON.parse(JSON.stringify(state())));
  assert.equal(restored.familyMember.name, 'Жена');
  assert.equal(restored.familyReports[0].expensesTotal, toMinorUnits(45000));

  state().removeFamilyMember();
  assert.equal(state().familyMember, null);
  assert.deepEqual(state().familyReports, []);
});

addTest('state saved before the family feature still loads', () => {
  const legacy = sanitizeImportedState({ moneyVersion: 2, language: 'ru', accounts: [], transactions: [] });
  assert.equal(legacy.familyMember, null);
  assert.deepEqual(legacy.familyReports, []);
  assert.equal(legacy.familySenderName, '');
});
