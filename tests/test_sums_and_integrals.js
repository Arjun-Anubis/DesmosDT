const fs = require('fs');
const assert = require('assert');

// Mock browser environment
global.window = global;
global.self = global;

eval(fs.readFileSync('js/cas_math.js', 'utf8'));

console.log('=== TEST SUITE: SUMS AND INTEGRALS ===\n');

// 1. LaTeX to Math conversion tests
console.log('--- Test 1: latexToMath for Sums and Integrals ---');
const sumLatex1 = '\\sum_{k=1}^{10}{k^2}';
const sumMath1 = OmniMath.latexToMath(sumLatex1);
console.log('1.1 Sum:', sumLatex1, '=>', sumMath1);
assert.ok(sumMath1.includes('sum(k=1, 10'), `Expected sum conversion, got ${sumMath1}`);

const sumLatex2 = '\\sum_{k=0}^{n} (0.5)^k';
const sumMath2 = OmniMath.latexToMath(sumLatex2);
console.log('1.2 Discrete Sum:', sumLatex2, '=>', sumMath2);
assert.ok(sumMath2.includes('sum(k=0, n'), `Expected sum conversion, got ${sumMath2}`);

const intLatex1 = '\\int_{0}^{1} x^2 dx';
const intMath1 = OmniMath.latexToMath(intLatex1);
console.log('1.3 Definite Integral:', intLatex1, '=>', intMath1);
assert.ok(intMath1.includes('integral(0, 1'), `Expected integral conversion, got ${intMath1}`);

const intLatex2 = '\\int_{0}^{x} \\cos(t) dt';
const intMath2 = OmniMath.latexToMath(intLatex2);
console.log('1.4 Continuous Integral:', intLatex2, '=>', intMath2);
assert.ok(intMath2.includes('integral(0, x'), `Expected integral conversion, got ${intMath2}`);

const intLatex3 = '\\int x^2 dx';
const intMath3 = OmniMath.latexToMath(intLatex3);
console.log('1.5 Indefinite Integral:', intLatex3, '=>', intMath3);
assert.ok(intMath3.includes('integrate('), `Expected symbolic integrate, got ${intMath3}`);
console.log('PASS: Test 1\n');

// 2. Math to LaTeX conversion tests
console.log('--- Test 2: mathToLatex Serialization ---');
const mathSum = 'sum(k=0, 10, k^2)';
const latexSum = OmniMath.mathToLatex(mathSum);
console.log('2.1 Sum to LaTeX:', mathSum, '=>', latexSum);
assert.ok(latexSum.includes('\\sum_{k=0}^{10}'), `Expected \\sum, got ${latexSum}`);

const mathInt = 'integral(0, x, (t) => cos(t))';
const latexInt = OmniMath.mathToLatex(mathInt);
console.log('2.2 Integral to LaTeX:', mathInt, '=>', latexInt);
assert.ok(latexInt.includes('\\int_{0}^{x}'), `Expected \\int, got ${latexInt}`);

const mathInt4 = 'int(0, 1, x^2, x)';
const latexInt4 = OmniMath.mathToLatex(mathInt4);
console.log('2.3 4-arg Int to LaTeX:', mathInt4, '=>', latexInt4);
assert.ok(latexInt4.includes('\\int_{0}^{1}'), `Expected \\int, got ${latexInt4}`);
console.log('PASS: Test 2\n');

// 3. Execution & Evaluation tests via compileAll
console.log('--- Test 3: compileAll and Evaluation ---');

// 3.1 Scalar definite integral: \int_{0}^{1} x^2 dx = 1/3
const items = [
  { id: 'item_int_scalar', text: OmniMath.latexToMath('I = \\int_{0}^{1} x^2 dx') },
  { id: 'item_int_curve', text: OmniMath.latexToMath('y = \\int_{0}^{x} \\cos(t) dt') },
  { id: 'item_sum_signal', text: OmniMath.latexToMath('s1[n] = \\sum_{k=0}^{n} (0.5)^k') },
  { id: 'item_sum_curve', text: OmniMath.latexToMath('y = \\sum_{k=1}^{5} \\frac{\\sin(k x)}{k}') },
  { id: 'item_sum_scalar', text: OmniMath.latexToMath('S = \\sum_{k=1}^{10} k') }
];

const compiled = OmniMath.compileAll(items);

// Check 3.1: Scalar definite integral
const scalarInt = compiled.get('item_int_scalar');
assert.ok(scalarInt, 'Scalar integral compiled');
const valInt = scalarInt.eval();
console.log('3.1 Scalar Integral value:', valInt);
assert.ok(Math.abs(valInt - 1/3) < 1e-10, `Expected 1/3, got ${valInt}`);

// Check 3.2: Continuous integral curve y = \int_0^x cos(t) dt (= sin(x))
const curveInt = compiled.get('item_int_curve');
assert.ok(curveInt, 'Continuous integral compiled');
const y0 = curveInt.eval(0, 0);
const yPiHalf = curveInt.eval(Math.PI / 2, Math.PI / 2);
const yPi = curveInt.eval(Math.PI, Math.PI);
const yNegPiHalf = curveInt.eval(-Math.PI / 2, -Math.PI / 2);
console.log('3.2 Curve Integral: y(0) =', y0, ', y(pi/2) =', yPiHalf, ', y(pi) =', yPi, ', y(-pi/2) =', yNegPiHalf);
assert.ok(Math.abs(y0) < 1e-10, `Expected y(0) ~ 0, got ${y0}`);
assert.ok(Math.abs(yPiHalf - 1.0) < 1e-10, `Expected y(pi/2) ~ 1.0, got ${yPiHalf}`);
assert.ok(Math.abs(yPi) < 1e-10, `Expected y(pi) ~ 0, got ${yPi}`);
assert.ok(Math.abs(yNegPiHalf - (-1.0)) < 1e-10, `Expected y(-pi/2) ~ -1.0, got ${yNegPiHalf}`);

// Check 3.3: Discrete stem signal s1[n] = \sum_{k=0}^n (0.5)^k
const signalSum = compiled.get('item_sum_signal');
assert.ok(signalSum, 'Discrete sum signal compiled');
assert.strictEqual(signalSum.kind, 'discrete', 'Kind should be discrete');
const s0 = signalSum.eval(0, 0);
const s1 = signalSum.eval(1, 1);
const s2 = signalSum.eval(2, 2);
const s3 = signalSum.eval(3, 3);
console.log('3.3 Signal Sum: s1[0] =', s0, ', s1[1] =', s1, ', s1[2] =', s2, ', s1[3] =', s3);
assert.strictEqual(s0, 1.0, `Expected s1[0]=1.0, got ${s0}`);
assert.strictEqual(s1, 1.5, `Expected s1[1]=1.5, got ${s1}`);
assert.strictEqual(s2, 1.75, `Expected s1[2]=1.75, got ${s2}`);
assert.strictEqual(s3, 1.875, `Expected s1[3]=1.875, got ${s3}`);

// Check 3.4: Continuous Fourier sum curve
const curveSum = compiled.get('item_sum_curve');
assert.ok(curveSum, 'Continuous sum curve compiled');
const ySumAt1 = curveSum.eval(1, 1);
console.log('3.4 Continuous Sum at x=1:', ySumAt1);
assert.ok(typeof ySumAt1 === 'number' && !isNaN(ySumAt1), 'Valid numerical evaluation');

// Check 3.5: Scalar sum: sum_{k=1}^{10} k = 55
const scalarSum = compiled.get('item_sum_scalar');
assert.ok(scalarSum, 'Scalar sum compiled');
const valSum = scalarSum.eval();
console.log('3.5 Scalar Sum 1..10:', valSum);
assert.strictEqual(valSum, 55, `Expected 55, got ${valSum}`);
console.log('PASS: Test 3\n');

// 4. Complex number integration & summation
console.log('--- Test 4: Complex Integration & Summation ---');
const complexItems = [
  { id: 'c_sum', text: 'z = sum(k=0, 3, i^k)' }
];
const cCompiled = OmniMath.compileAll(complexItems);
const cSum = cCompiled.get('c_sum');
assert.ok(cSum, 'Complex sum compiled');
console.log('4.1 Complex Sum sum_{k=0}^3 i^k:', cSum.value.toString());
assert.ok(Math.abs(cSum.value.re) < 1e-10 && Math.abs(cSum.value.im) < 1e-10, 'Expected 0');

// Complex definite integral \int_0^\pi e^{it} dt = 2i
const complexInt = OmniMath.numericalIntegral(0, Math.PI, (t) => {
  return new OmniMath.Complex(Math.cos(t), Math.sin(t));
});
console.log('4.2 Complex Integral int_0^pi e^{it} dt:', complexInt.toString());
assert.ok(Math.abs(complexInt.re) < 1e-10 && Math.abs(complexInt.im - 2) < 1e-10, 'Expected 2i');
console.log('PASS: Test 4\n');

// 5. Suggestions
console.log('--- Test 5: Autocomplete Suggestions ---');
const suggs = OmniMath.getSuggestions('int');
console.log('Found suggestions for "int":', suggs.map(s => s.text));
assert.ok(suggs.some(s => s.text.includes('integral') || s.text.includes('int')), 'Found integral in suggestions');

const sumSuggs = OmniMath.getSuggestions('sum');
console.log('Found suggestions for "sum":', sumSuggs.map(s => s.text));
assert.ok(sumSuggs.some(s => s.text.includes('sum')), 'Found sum in suggestions');
console.log('PASS: Test 5\n');

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
