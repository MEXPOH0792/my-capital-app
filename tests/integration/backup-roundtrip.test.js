import assert from 'node:assert/strict';
import { addTest } from '../harness/runner.js';
import { completeBaseOnboarding, getSystemAccount, resetStore, useStore } from '../harness/store.js';
import { loadBackupPayload } from '../../src/hooks/workspace/backupFile.js';
import { encryptBackup } from '../../src/utils/backupCrypto.js';
import { toMinorUnits } from '../../src/utils/money.js';

const asFile = (value) => ({ text: async () => JSON.stringify(value) });

const answers = (...list) => {
  const asked = [];
  const askPassword = async (options) => {
    asked.push(options);
    return list.length ? { password: list.shift() } : null;
  };
  return { asked, askPassword };
};

const makeBackup = async () => {
  resetStore();
  completeBaseOnboarding({ startingBalances: { liquidPrimary: toMinorUnits(12345) } });
  return useStore.getState().exportSignedData();
};

addTest('an encrypted backup restores with the right password after a wrong one', async () => {
  const signed = await makeBackup();
  const file = asFile(await encryptBackup(signed, 'correct horse'));
  // Wipe the data but keep the install secret: same device, fresh state.
  useStore.getState().resetData();

  const { asked, askPassword } = answers('wrong-pass', 'correct horse');
  const payload = await loadBackupPayload(file, { isEnglish: false, askPassword });
  assert.equal(asked.length, 2);
  assert.equal(asked[1].error, 'Неверный пароль.');

  const result = await useStore.getState().importDataAsync(payload);
  assert.equal(result.signatureStatus, 'valid');
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(12345));
});

addTest('a backup from another install is reported as foreign, not as broken', async () => {
  const signed = await makeBackup();
  resetStore(); // clears the install secret: this is now "another device"
  await assert.rejects(useStore.getState().importDataAsync(signed), { code: 'BACKUP_SIGNATURE_MISMATCH' });
  const result = await useStore.getState().importDataAsync(signed, { acceptInvalid: true });
  assert.equal(result.signatureStatus, 'invalid');
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(12345));
});

addTest('cancelling the password prompt leaves data untouched', async () => {
  const signed = await makeBackup();
  const file = asFile(await encryptBackup(signed, 'correct horse'));
  resetStore();
  const payload = await loadBackupPayload(file, { isEnglish: true, askPassword: answers().askPassword });
  assert.equal(payload, null);
  assert.equal(getSystemAccount('liquidPrimary').balance, 0);
});

addTest('plain and legacy unsigned backups still import without a password', async () => {
  const signed = await makeBackup();
  const { signature: _signature, ...legacy } = signed;
  void _signature;
  resetStore();
  const { asked, askPassword } = answers();
  const payload = await loadBackupPayload(asFile(legacy), { isEnglish: true, askPassword });
  assert.equal(asked.length, 0);
  const result = await useStore.getState().importDataAsync(payload);
  assert.equal(result.signatureStatus, 'missing');
  assert.equal(getSystemAccount('liquidPrimary').balance, toMinorUnits(12345));
});

addTest('a non-backup file is rejected with a readable message', async () => {
  const file = { text: async () => 'hello' };
  await assert.rejects(
    loadBackupPayload(file, { isEnglish: false, askPassword: answers().askPassword }),
    /не файл резервной копии/,
  );
});
