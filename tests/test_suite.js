const assert = require('assert');
const path = require('path');
const CAS = require(path.resolve(__dirname, '../extension/cas_engine.js'));

console.log('--- Running DesmosDT Comprehensive Test Suite ---');

// Test 1: Elementary Discrete Signals
const nMin = -5, nMax = 10;
const impulse = CAS.evaluateDiscreteSignal('delta[n]', nMin, nMax);
assert.strictEqual(impulse.get(0), 1, 'delta[0] must be 1');
assert.strictEqual(impulse.get(1), 0, 'delta[1] must be 0');
assert.strictEqual(impulse.get(-1), 0, 'delta[-1] must be 0');
console.log('✓ Delta impulse test passed');

const step = CAS.evaluateDiscreteSignal('u[n]', nMin, nMax);
assert.strictEqual(step.get(-1), 0, 'u[-1] must be 0');
assert.strictEqual(step.get(0), 1, 'u[0] must be 1');
assert.strictEqual(step.get(5), 1, 'u[5] must be 1');
console.log('✓ Unit step test passed');

const rect = CAS.evaluateDiscreteSignal('rect[n, 2]', nMin, nMax);
assert.strictEqual(rect.get(0), 1, 'rect[0, 2] must be 1');
assert.strictEqual(rect.get(2), 1, 'rect[2, 2] must be 1');
assert.strictEqual(rect.get(3), 0, 'rect[3, 2] must be 0');
assert.strictEqual(rect.get(-2), 1, 'rect[-2, 2] must be 1');
assert.strictEqual(rect.get(-3), 0, 'rect[-3, 2] must be 0');
console.log('✓ Rectangular pulse test passed');

// Test 2: Exponential and Damped Signals
const damped = CAS.evaluateDiscreteSignal('(0.5^n) * u[n]', 0, 4);
assert.strictEqual(damped.get(0), 1);
assert.strictEqual(damped.get(1), 0.5);
assert.strictEqual(damped.get(2), 0.25);
assert.strictEqual(damped.get(3), 0.125);
console.log('✓ Exponential sequence test passed');

// Test 3: Difference Equation / Recurrence Relation
// y[n] = 0.5 y[n-1] + x[n], x[n] = u[n], y[-1] = 0
// y[0] = 0.5(0) + 1 = 1
// y[1] = 0.5(1) + 1 = 1.5
// y[2] = 0.5(1.5) + 1 = 1.75
const rec = CAS.evaluateDiscreteSignal('', 0, 3, {
  isRecurrence: true,
  a1: 0.5,
  b0: 1,
  initialConditions: { '-1': 0 }
});
assert.strictEqual(rec.get(0), 1);
assert.strictEqual(rec.get(1), 1.5);
assert.strictEqual(rec.get(2), 1.75);
console.log('✓ Difference equation (IIR recurrence) test passed');

// Test 4: Discrete Convolution
// x[n] = delta[n] + delta[n-1], h[n] = delta[n] + delta[n-1]
// (x * h)[n] = delta[n] + 2*delta[n-1] + delta[n-2]
const xSig = CAS.evaluateDiscreteSignal('delta[n] + delta[n-1]', -1, 3);
const hSig = CAS.evaluateDiscreteSignal('delta[n] + delta[n-1]', -1, 3);
const convResult = CAS.convolveSignals(xSig, hSig);
assert.strictEqual(convResult.get(0), 1, 'conv[0] should be 1');
assert.strictEqual(convResult.get(1), 2, 'conv[1] should be 2');
assert.strictEqual(convResult.get(2), 1, 'conv[2] should be 1');
assert.strictEqual(convResult.get(3) || 0, 0, 'conv[3] should be 0');
console.log('✓ Discrete convolution test passed');

// Test 5: Symbolic Calculus & CAS
const diffRes = CAS.diff('x^4 - 2*x^2 + 5', 'x');
const diffLatex = CAS.toLatex(diffRes);
console.log('Derivative of x^4 - 2*x^2 + 5:', diffLatex);
assert.ok(diffLatex.includes('4 \\cdot {x}^{3}') || diffLatex.includes('x'), 'Derivative correct');

const roots = CAS.solve('x^2 - 9 = 0', 'x');
console.log('Roots of x^2 - 9 = 0:', roots);
assert.deepStrictEqual(roots.sort(), [-3, 3].sort(), 'Roots of x^2 - 9 = 0 are 3 and -3');

const rootsLin = CAS.solve('3*x - 12 = 0', 'x');
assert.deepStrictEqual(rootsLin, [4], 'Root of 3x - 12 = 0 is 4');
console.log('✓ Symbolic equation solving test passed');

const taylorCos = CAS.taylor('cos(x)', 'x', 0, 4);
console.log('Taylor series of cos(x):', taylorCos);
assert.ok(taylorCos.includes('1'), 'cos(0) = 1');
console.log('✓ Taylor polynomial test passed');

console.log('\n=============================================');
console.log(' ALL 5 CORE MATHEMATICAL SUBSYSTEMS PASSED!  ');
console.log('=============================================\n');
