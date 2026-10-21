// Minimal test runner: registers tests via addTest, executes them sequentially
// with full async support, prints PASS/FAIL, and exits non-zero on any failure.

const tests = [];

export const addTest = (name, fn) => {
  tests.push({ name, fn });
};

export const runAllTests = async ({ onBeforeExit } = {}) => {
  let failed = 0;
  try {
    for (const { name, fn } of tests) {
      try {
        await fn();
        console.log(`PASS ${name}`);
      } catch (error) {
        failed += 1;
        console.error(`FAIL ${name}`);
        console.error(error);
      }
    }
  } finally {
    if (typeof onBeforeExit === 'function') {
      try {
        await onBeforeExit();
      } catch (error) {
        console.error('onBeforeExit failed:', error);
      }
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${tests.length} tests passed.`);
  }
};
