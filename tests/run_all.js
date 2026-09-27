/**
 * OmniGraph Master Test Runner
 * Executes all test suites and provides a clear, comprehensive summary.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testFiles = [
  'test_ease_of_use.js',
  'test_sums_and_integrals.js',
  'test_complex_and_point_preview.js',
  'test_complete_qol.js',
  'test_desmos_mathquill_and_empty.js',
  'test_menus_and_svg_icons.js',
  'test_desmos_ui.js',
  'test_browser_sim.js',
  'test_dynamic_viewport_and_qol.js',
  'test_signals.js',
  'test_webapp.js',
  'test_cas.js',
  'test_qol.js',
  'test_cond.js',
  'test_regex.js',
  'test_suite.js'
];

console.log('===============================================================');
console.log('           OMNIGRAPH MASTER TEST SUITE RUNNER                  ');
console.log('===============================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

const startTime = Date.now();

for (const testFile of testFiles) {
  const filePath = path.join(__dirname, testFile);
  if (!fs.existsSync(filePath)) {
    console.error(`[SKIP] Missing test file: ${testFile}`);
    continue;
  }

  process.stdout.write(` Running: ${testFile.padEnd(38, ' ')} `);
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [filePath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
  const duration = Date.now() - t0;

  if (res.status === 0) {
    totalPassed++;
    console.log(`[PASS] (${duration}ms)`);
    results.push({ name: testFile, status: 'PASS', duration });
  } else {
    totalFailed++;
    console.log(`[FAIL] (${duration}ms)`);
    results.push({ name: testFile, status: 'FAIL', duration, error: res.stderr || res.stdout });
  }
}

const totalDuration = Date.now() - startTime;

console.log('\n===============================================================');
console.log('                       TEST SUMMARY                            ');
console.log('===============================================================');
console.log(` Total Suites Run: ${testFiles.length}`);
console.log(` Passed:           ${totalPassed}`);
console.log(` Failed:           ${totalFailed}`);
console.log(` Total Time:       ${totalDuration}ms`);
console.log('===============================================================');

if (totalFailed > 0) {
  console.log('\nFailed Test Details:');
  for (const r of results) {
    if (r.status === 'FAIL') {
      console.log(`\n--- ${r.name} ---`);
      console.log(r.error);
    }
  }
  process.exit(1);
} else {
  console.log('\n🎉 ALL TEST SUITES PASSED FLAWLESSLY!\n');
  process.exit(0);
}
