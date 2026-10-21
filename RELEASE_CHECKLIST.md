# Release Checklist

## Before every beta or production build

- Run `npm run verify`
- Open the app from a clean preview build
- Check first launch onboarding flow
- Check PIN setup, lock and unlock flow
- Check backup export and import on a clean state
- Check income, expense and transfer flows
- Check debt payment and rollback flows
- Check RU and EN switching
- Check dark and light themes
- Check mobile-width layout for home, accounts and onboarding

## Data compatibility

- Confirm `appVersion` is updated if release behavior changed
- Confirm backup payload still imports on the current build
- Confirm destructive flows show explicit confirmation

## Release notes

- Update user-facing changes summary
- Note any migration or backup compatibility changes
- Note any known limitations still left in the build

## 1.11.0 — fixes from docs/TZ-fixes.md

### User-facing changes

- Debts move real money: a loan "added to balance" lands on the chosen account, lending takes money from it, a returned loan comes back to it. Deleting the record that opened a debt rolls the money back and removes the debt (blocked while payments against it exist).
- Loans, lending and returns are no longer counted as income or spending in reports and limits. Paying down your own loan still counts as spending.
- The sadaka share is shown in reports as "Set aside for sadaka", not as spending.
- Backups: export asks for a password (min. 8 chars) and saves an encrypted `.mcbackup`; "save without password" is still possible with a warning. Every export is signed. Import asks for the password, treats a file from another device as a question, and offers "Undo import" until the app restarts.
- Home shows a "Save a backup" card when the last backup is older than 14 days (or never) and there are more than 10 operations.
- "Available now" keeps other cards' balances and can be set to 0; values below what other cards hold are refused with a hint.
- Security: auto-lock after leaving the app (immediately / 1 min / 5 min / never, default 1 min); after 5 wrong PINs a pause of 30 s that doubles up to 15 min and survives restarts; "Forgot PIN?" lets you erase data (type УДАЛИТЬ / DELETE) or restore from a backup.
- With a PIN set, the home-screen widget shows •••• instead of amounts (opt-in setting to show them) and FLAG_SECURE hides the app in recent apps and blocks screenshots.
- Amounts above 10 trillion are refused with "Amount is too large".

### Migration and compatibility

- Loaded data is upgraded in place, idempotently: old debt records get `meta.debtKind`, reserve and sadaka records get `meta.system` (recognised by category text in RU and EN), legacy distributed incomes are linked to their sadaka/reserve records.
- Accounts named "Карта" / "Наличные" / "Card" / "Cash" are no longer merged into the main account unless the data is in the pre-system-accounts format (previously a user account with such a name vanished on every restart).
- Old debt records written without rollback data cannot be deleted; the history modal explains why.
- Plain `.json` backups from older versions still import (reported as "no signature").
- Android bridge: `secureStorageSetItem` now returns `"ok"` / `"error:<reason>"`; new `secureStorageStatus()` and `setSecureWindow(boolean)`. Unreadable data is moved to `<key>__corrupt_<timestamp>` instead of being deleted, and the app shows a recovery screen with writes suspended.

### Must be checked on a real Android device before release

- [ ] Clean install → onboarding → income → restart: data is intact.
- [ ] Delete the Keystore key (or clear the app's Keystore via `adb shell cmd keystore2` / reinstall over an old data dir): the recovery screen appears, `__corrupt_*` entries remain in `my_capital_secure_storage`, nothing is overwritten until a choice is made.
- [ ] Restore from an encrypted `.mcbackup` on the recovery screen and via Settings.
- [ ] Share sheet saves `.mcbackup` files and the file picker can open them.
- [ ] PIN on: widget shows ••••, recent-apps preview is blank, screenshots are blocked.
- [ ] Auto-lock fires after backgrounding for the selected time.
- [ ] Biometric unlock still works and resets the wrong-PIN counter.

### Known limitations

- The Android project was not built with Gradle in the development environment (Gradle could not open a loopback connection there). `MainActivity.java` was compiled with `javac` against the cached dependencies; `androidx.biometric` was not in the local Gradle cache and was stubbed for that check.

## 1.12.0 — family budget (docs/TZ-family-budget.md)

### User-facing changes

- The report screen can send your own month of spending as a `.mcfamily` file through the system share sheet: total for the month plus categories, nothing else. The screen says outright that the file contains your figures.
- Importing the partner's file (Settings → Family) creates a partner and stores their months. Re-importing a month asks before replacing it, so a total never doubles.
- With a partner present, the report screen gains a "Mine / Family" switch. The family view shows the combined total for a month, who spent how much (with shares), and categories merged across both sides.
- A month the partner has not shared yet is labelled as such, so a smaller total is never mistaken for the full picture.
- The partner's figures never touch accounts, the available balance, the safety fund, capital, the tree, the advisor, limits or the widget.

### Migration and compatibility

- New state: `familyMember`, `familyReports`, `familySenderName`. Saved data from earlier versions loads with an empty family section.
- Family data travels in the backup and is validated by the backup schema.
- A report in a currency other than the app's is refused: figures in two currencies cannot be added.
- A report for an existing partner arriving from a different install asks for confirmation. The sender id is not proof of identity — the file is not signed, and nothing in the UI claims it is.
- New secure-storage key: `capital-tree-pro-v9:family-sender-id`.

### Must be checked on two real devices before release

- [ ] Phone A sends a month → the file arrives through Telegram/WhatsApp → phone B opens it from the chat.
- [ ] Phone B: the partner appears, the month is listed, the report screen shows the combined total.
- [ ] Phone B: balances, safety fund, capital and the advisor are unchanged after the import.
- [ ] Re-sending the same month replaces it after the confirmation.
- [ ] A file from a third device asks for confirmation.
- [ ] Backup export on phone B and import on a clean install keeps the partner and their months.

### Known limitations

- No password on the family file yet (the backup's encryption and password dialog can be reused when needed).
- One partner only; no incomes or savings in the shared report; the family total is not shown on the home screen.
