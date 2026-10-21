import assert from 'node:assert/strict';
import React from 'react';
import { addTest } from '../harness/runner.js';
import {
  act,
  baseTheme,
  fireEvent,
  loadUiModules,
  noop,
  panelStyle,
  render,
  resetDom,
  rootStyle,
  screen,
  softPanelStyle,
  waitFor,
} from '../harness/ui.js';
import { getCopy } from '../../src/i18n.js';
import { hashPin, serializePinRecord, verifyPinHash } from '../../src/utils/security.js';

addTest('AppLockScreen interaction rejects wrong PIN and unlocks on correct PIN', async () => {
  resetDom();
  const { AppLockScreen } = await loadUiModules();
  getCopy('en');
  const hash = serializePinRecord(await hashPin('1234'));
  let unlocked = false;

  render(
    React.createElement(AppLockScreen, {
      isEnglish: true,
      isDarkMode: true,
      theme: baseTheme,
      rootStyle,
      panelStyle,
      softPanelStyle,
      onUnlock: async (pin) => {
        const result = await verifyPinHash(pin, hash);
        if (result) unlocked = true;
        return result;
      },
      onToggleTheme: noop,
      onSetLanguage: noop,
    }),
  );

  fireEvent.change(screen.getByPlaceholderText('PIN code'), { target: { value: '4321' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Unlock app' }));
  });
  assert.ok(await screen.findByText('Invalid PIN.'));
  assert.equal(unlocked, false);

  fireEvent.change(screen.getByPlaceholderText('PIN code'), { target: { value: '1234' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Unlock app' }));
  });
  await waitFor(() => assert.equal(unlocked, true));
  resetDom();
});
