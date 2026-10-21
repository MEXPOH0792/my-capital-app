// Entry point for the project test suite.
//
// Tests are split across thematic files under tests/unit, tests/integration,
// tests/ui. Each file imports `addTest` from harness/runner and registers its
// cases on import. This entry file:
//   1. installs the DOM + globals + __APP_VERSION__ shim
//   2. imports every test file so they register themselves
//   3. invokes the runner, then tears down the Vite SSR server
//
// To add a new test, create a `*.test.js` under one of the thematic folders
// and add a line below.

import './harness/setup.js';

// Unit tests (pure functions, store reducers, schema validation)
import './unit/money.test.js';
import './unit/split-rounding.test.js';
import './unit/goals.test.js';
import './unit/transactions.test.js';
import './unit/rollback-edge.test.js';
import './unit/sanitize.test.js';
import './unit/sanitize-edge.test.js';
import './unit/categories.test.js';
import './unit/reports.test.js';
import './unit/limits.test.js';
import './unit/backup-schema.test.js';
import './unit/backup-hmac.test.js';
import './unit/backup-crypto.test.js';
import './unit/backup-migrations.test.js';
import './unit/security.test.js';
import './unit/advisor.test.js';
import './unit/diagnostics.test.js';
import './unit/debounced-storage.test.js';
import './unit/app-shell-store.test.js';
import './unit/storage-recovery.test.js';
import './unit/security-policy.test.js';
import './unit/family.test.js';

// Integration (full store + actions)
import './integration/store-flow.test.js';
import './integration/debts-flow.test.js';
import './integration/backup-roundtrip.test.js';
import './integration/family-flow.test.js';

// UI rendering and interaction
import './ui/lock-screen.test.js';
import './ui/onboarding.test.js';
import './ui/finance-setup.test.js';
import './ui/accounts.test.js';
import './ui/sections-smoke.test.js';
import './ui/family-report.test.js';
import './ui/app-modal.test.js';

import { runAllTests } from './harness/runner.js';
import { closeViteServer } from './harness/ui.js';

await runAllTests({ onBeforeExit: closeViteServer });
