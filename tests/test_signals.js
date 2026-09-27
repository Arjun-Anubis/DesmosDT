const assert = require('assert');
const path = require('path');
const OmniMath = require(path.resolve(__dirname, '../js/cas_math.js'));

console.log('--- Testing Multi-Signal Referencing in OmniMath ---');

// Define 3 signals:
// s1[n] = (0.5^n) * u[n]
// s2[n] = delta[n] + delta[n-1]
// s3[n] = s1[n] - s2[n]
const items = [
  { id: '1', text: 's1[n] = (0.5^n) * u[n]' },
  { id: '2', text: 's2[n] = delta[n] + delta[n-1]' },
  { id: '3', text: 's3[n] = s1[n] - s2[n]' }
];

const compiled = OmniMath.compileAll(items);

const s1 = compiled.get('1');
const s2 = compiled.get('2');
const s3 = compiled.get('3');

assert.strictEqual(s1.kind, 'discrete');
assert.strictEqual(s2.kind, 'discrete');
assert.strictEqual(s3.kind, 'discrete');

// At n = 0:
// s1[0] = 0.5^0 * 1 = 1
// s2[0] = delta[0] + delta[-1] = 1 + 0 = 1
// s3[0] = s1[0] - s2[0] = 1 - 1 = 0
assert.strictEqual(s1.eval(0, 0), 1, 's1[0] should be 1');
assert.strictEqual(s2.eval(0, 0), 1, 's2[0] should be 1');
assert.strictEqual(s3.eval(0, 0), 0, 's3[0] = s1[0] - s2[0] should be 0');
console.log('✓ n = 0: s1 = 1, s2 = 1 => s3 = 0 (Passed)');

// At n = 1:
// s1[1] = 0.5^1 * 1 = 0.5
// s2[1] = delta[1] + delta[0] = 0 + 1 = 1
// s3[1] = 0.5 - 1 = -0.5
assert.strictEqual(s1.eval(1, 1), 0.5, 's1[1] should be 0.5');
assert.strictEqual(s2.eval(1, 1), 1, 's2[1] should be 1');
assert.strictEqual(s3.eval(1, 1), -0.5, 's3[1] = s1[1] - s2[1] should be -0.5');
console.log('✓ n = 1: s1 = 0.5, s2 = 1 => s3 = -0.5 (Passed)');

// At n = 2:
// s1[2] = 0.25
// s2[2] = 0
// s3[2] = 0.25
assert.strictEqual(s3.eval(2, 2), 0.25, 's3[2] should be 0.25');
console.log('✓ n = 2: s1 = 0.25, s2 = 0 => s3 = 0.25 (Passed)');

// Also test time-shifting: s4[n] = s1[n - 2]
const itemsShift = [
  { id: '1', text: 's1[n] = (0.5^n) * u[n]' },
  { id: '4', text: 's4[n] = s1[n - 2]' }
];
const compiledShift = OmniMath.compileAll(itemsShift);
const s4 = compiledShift.get('4');
assert.strictEqual(s4.eval(2, 2), 1, 's1[2 - 2] = s1[0] = 1');
assert.strictEqual(s4.eval(3, 3), 0.5, 's1[3 - 2] = s1[1] = 0.5');
console.log('✓ Time-shift s1[n - 2] works properly!');

console.log('--- ALL MULTI-SIGNAL REFERENCING TESTS PASSED! ---');
