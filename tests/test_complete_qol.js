/**
 * Complete Verification Test Suite for OmniGraph:
 * - Implicit Multiplication
 * - Fault-tolerant Partial Expression Recovery
 * - In-line CAS Suggestions Engine
 * - Discrete Convolution conv(s1, s2)
 * - Piecewise conditionals { cond: val, ... }
 * - Finite Summation sum(...) and Product prod(...)
 * - Signal Metrics (Energy, Power, Periodicity)
 * - DTFT Frequency Spectrum
 * - Clean Slate (Zero Preloaded Signals) & Removal of Old CAS
 * - Graphpaper Vector SVG Export & Dark Mode
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const OmniMath = require('../js/cas_math.js');
const Graphpaper = require('../js/graphpaper.js');

console.log('========================================================');
console.log(' STARTING COMPLETE VERIFICATION OF ALL QOL FEATURES     ');
console.log('========================================================\n');

// Mock HTML5 Canvas for Graphpaper testing
function createMockCanvas(width = 800, height = 600) {
  const ctx = {
    setTransform: () => {},
    scale: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    roundRect: () => {},
    rect: () => {},
    stroke: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    setLineDash: () => {},
    fillText: () => {},
    measureText: (str) => ({ width: str.length * 7 }),
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1
  };
  return {
    getContext: () => ctx,
    parentElement: { getBoundingClientRect: () => ({ width, height }) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    addEventListener: () => {},
    style: {}
  };
}

// ----------------------------------------------------
// TEST 1: Implicit Multiplication
// ----------------------------------------------------
console.log('Test 1: Implicit Multiplication...');
{
  const testCases = [
    { expr: 'y = 2x', at: 3, expected: 6 },
    { expr: 'y = 3(x + 2)', at: 4, expected: 18 },
    { expr: 'y = (x + 1)(x - 1)', at: 5, expected: 24 },
    { expr: 'y = x(x + 1)', at: 3, expected: 12 },
    { expr: 's[n] = 3n', at: 4, expected: 12 },
    { expr: 's[n] = 0.5u[n]', at: 2, expected: 0.5 },
    { expr: 'y = pi x', at: 2, expected: 2 * Math.PI },
    { expr: 'y = sin(2x)', at: Math.PI / 4, expected: 1 },
    { expr: 'y = 2pi x', at: 1, expected: 2 * Math.PI }
  ];

  testCases.forEach(({ expr, at, expected }) => {
    const compiled = OmniMath.compileExpression(expr);
    assert(compiled, `Failed to compile: ${expr}`);
    const result = compiled.eval(at, at);
    assert(
      Math.abs(result - expected) < 1e-5,
      `Implicit multiplication failed for "${expr}" at ${at}: got ${result}, expected ${expected}`
    );
  });

  // Verify reserved words like sin, cos, diff are NOT mistakenly converted into sin*(...)
  const trigCheck = OmniMath.compileExpression('y = sin(x) + cos(x)');
  assert(Math.abs(trigCheck.eval(0, 0) - 1) < 1e-6, 'Trig functions should evaluate correctly without broken syntax');

  console.log('  ✓ 2x, 3(x+2), (x+1)(x-1), x(x+1), 3n, 0.5u[n], pi x, sin(2x) all evaluated perfectly!');
}

// ----------------------------------------------------
// TEST 2: Fault-Tolerant Partial Expression Recovery
// ----------------------------------------------------
console.log('\nTest 2: Graphing Partially Complete Expressions...');
{
  // Test recoverPartialExpression directly
  const partials = [
    { input: '2x + ', expectedNonCrash: true },
    { input: 'y = sin(', expectedNonCrash: true },
    { input: 's[n] = 0.5^n * ', expectedNonCrash: true },
    { input: '3*x^', expectedNonCrash: true },
    { input: '(x + 2', expectedNonCrash: true },
    { input: 'sin(x) + cos(', expectedNonCrash: true }
  ];

  partials.forEach(({ input }) => {
    const recovered = OmniMath.recoverPartialExpression(input);
    assert(typeof recovered === 'string' && recovered.length > 0, `Failed to recover string from "${input}"`);
    // Compiling the recovered or partial expression should NOT throw
    const compiled = OmniMath.compileExpression(input);
    assert(compiled, `compileExpression threw on partial input: "${input}"`);
    assert(typeof compiled.eval === 'function', 'compiled.eval must be a callable function');
    const val = compiled.eval(1, 1);
    // Should return a number or NaN, never throw an exception
    assert(typeof val === 'number', `Evaluation of partial "${input}" returned non-number: ${val}`);
  });

  // Specific check: '2x + ' recovered as '2x' evaluates to 4 at x=2
  const rec1 = OmniMath.compileExpression('2x + ');
  assert.strictEqual(rec1.eval(2, 2), 4, "'2x + ' should gracefully evaluate as 2*x");

  console.log('  ✓ Partially complete expressions gracefully recovered without throwing SyntaxErrors!');
}

// ----------------------------------------------------
// TEST 3: In-line CAS Suggestions Engine
// ----------------------------------------------------
console.log('\nTest 3: In-line CAS Autocomplete Suggestions...');
{
  // 1. Built-in query suggestions
  const trigSugg = OmniMath.getSuggestions('sin');
  assert(trigSugg.some(s => s.text === 'sin(x)'), 'Suggestions should contain sin(x)');
  assert(trigSugg.some(s => s.text === 'sinc(n)'), 'Suggestions should contain sinc(n)');

  const casSugg = OmniMath.getSuggestions('dif');
  assert(casSugg.some(s => s.text.includes('diff')), 'Suggestions should contain diff for "dif" query');

  const convSugg = OmniMath.getSuggestions('conv');
  assert(convSugg.some(s => s.text.includes('conv(s1, s2)')), 'Suggestions should contain conv(s1, s2)');

  // 2. Context-aware dynamic suggestions from active user items
  const activeUserItems = [
    { text: 's1[n] = 0.5^n * u[n]' },
    { text: 'myFunc(x) = x^3 - 2x' },
    { text: 'alpha = 4.5', sliderVal: 4.5 }
  ];

  const userSignalSugg = OmniMath.getSuggestions('s1', activeUserItems);
  assert(userSignalSugg.some(s => s.text === 's1[n]'), 'User signal s1[n] must appear in autocomplete suggestions');

  const userFuncSugg = OmniMath.getSuggestions('myF', activeUserItems);
  assert(userFuncSugg.some(s => s.text === 'myFunc(x)'), 'User function myFunc(x) must appear in autocomplete suggestions');

  const userSliderSugg = OmniMath.getSuggestions('alp', activeUserItems);
  assert(userSliderSugg.some(s => s.text === 'alpha'), 'User slider variable alpha must appear in autocomplete suggestions');

  console.log('  ✓ In-line CAS autocomplete correctly proposes built-ins, CAS tools, user signals, and sliders!');
}

// ----------------------------------------------------
// TEST 4: Discrete Convolution Operator conv(s1, s2)
// ----------------------------------------------------
console.log('\nTest 4: Discrete Convolution Operator conv(s1, s2)...');
{
  // Define s1: rect of width 3 (n in [0, 2]: 1, else 0)
  // Define s2: rect of width 2 (n in [0, 1]: 1, else 0)
  // Convolution of [1, 1, 1] * [1, 1] is [1, 2, 2, 1] at n=0, 1, 2, 3
  const items = [
    { id: 's1', text: 's1[n] = { n >= 0 && n <= 2: 1, 0 }' },
    { id: 's2', text: 's2[n] = { n >= 0 && n <= 1: 1, 0 }' },
    { id: 's3', text: 's3[n] = conv(s1, s2)' }
  ];

  const compiledMap = OmniMath.compileAll(items);
  const s3 = compiledMap.get('s3');
  assert(s3, 's3 should be compiled');

  assert.strictEqual(s3.eval(0, 0), 1, 'conv[0] should be 1');
  assert.strictEqual(s3.eval(1, 1), 2, 'conv[1] should be 2');
  assert.strictEqual(s3.eval(2, 2), 2, 'conv[2] should be 2');
  assert.strictEqual(s3.eval(3, 3), 1, 'conv[3] should be 1');
  assert.strictEqual(s3.eval(4, 4), 0, 'conv[4] should be 0');
  assert.strictEqual(s3.eval(-1, -1), 0, 'conv[-1] should be 0');

  console.log('  ✓ Discrete convolution conv(s1, s2) accurately computed [1, 2, 2, 1]!');
}

// ----------------------------------------------------
// TEST 5: Piecewise Conditionals
// ----------------------------------------------------
console.log('\nTest 5: Desmos Piecewise Conditionals { cond: val, default }...');
{
  // Two-branch piecewise
  const pw1 = OmniMath.compileExpression('y = { x < 0: -5, 5 }');
  assert.strictEqual(pw1.eval(-2, -2), -5);
  assert.strictEqual(pw1.eval(3, 3), 5);

  // Multi-branch piecewise
  const pw2 = OmniMath.compileExpression('y = { x < -1: -10, x > 1: 10, 0 }');
  assert.strictEqual(pw2.eval(-5, -5), -10);
  assert.strictEqual(pw2.eval(5, 5), 10);
  assert.strictEqual(pw2.eval(0, 0), 0);

  console.log('  ✓ Piecewise conditionals evaluated all branches accurately!');
}

// ----------------------------------------------------
// TEST 6: Finite Summation and Product Operators
// ----------------------------------------------------
console.log('\nTest 6: Finite Summation and Product Operators...');
{
  // sum(k=0, 5, k) = 0 + 1 + 2 + 3 + 4 + 5 = 15
  const sumItem = OmniMath.compileExpression('y = sum(k=0, 5, k)');
  assert.strictEqual(sumItem.eval(0, 0), 15, 'sum(k=0, 5, k) must equal 15');

  // sum(k=0, 4, 2^k) = 1 + 2 + 4 + 8 + 16 = 31
  const sumGeo = OmniMath.compileExpression('y = sum(k=0, 4, 2^k)');
  assert.strictEqual(sumGeo.eval(0, 0), 31, 'sum(k=0, 4, 2^k) must equal 31');

  // prod(k=1, 4, k) = 1 * 2 * 3 * 4 = 24
  const prodItem = OmniMath.compileExpression('y = prod(k=1, 4, k)');
  assert.strictEqual(prodItem.eval(0, 0), 24, 'prod(k=1, 4, k) must equal 24');

  console.log('  ✓ Summation Σ and Product ∏ operators evaluated accurately!');
}

// ----------------------------------------------------
// TEST 7: Signal Metrics (Energy, Power, Periodicity)
// ----------------------------------------------------
console.log('\nTest 7: Signal Metrics Computation...');
{
  // Pulse of length 3: samples = [1, 1, 1] -> Energy = 3
  const pulseFn = (n) => (n >= 0 && n <= 2 ? 1 : 0);
  const metrics = OmniMath.computeSignalMetrics(pulseFn, 20);
  assert.strictEqual(metrics.energy, 3, 'Energy of 3-sample unit pulse should be 3');
  assert(metrics.power < 1, 'Power of finite energy pulse should approach 0 over window');

  // Periodic square wave with period N0 = 4
  const periodicFn = (n) => ((n % 4 + 4) % 4 < 2 ? 1 : -1);
  const perMetrics = OmniMath.computeSignalMetrics(periodicFn, 40);
  assert(perMetrics.period.includes('4 samples'), `Expected period of 4 samples, got: ${perMetrics.period}`);

  console.log(`  ✓ Signal metrics correctly computed Energy: ${metrics.energy} and Period: ${perMetrics.period}`);
}

// ----------------------------------------------------
// TEST 8: DTFT Frequency Spectrum
// ----------------------------------------------------
console.log('\nTest 8: DTFT Frequency Spectrum...');
{
  // Delta function δ[n]: DTFT should be 1 across all frequencies
  const deltaFn = (n) => (n === 0 ? 1 : 0);
  const spectrum = OmniMath.computeDTFT(deltaFn, 50, 10);
  assert(spectrum.length > 0, 'DTFT spectrum should have frequency points');
  spectrum.forEach(pt => {
    assert(Math.abs(pt.mag - 1.0) < 1e-4, `Delta DTFT magnitude at omega=${pt.omega} must be 1.0 (got ${pt.mag})`);
  });

  console.log('  ✓ DTFT spectrum magnitude computed correctly (Delta sequence DTFT = 1.0 at all frequencies)!');
}

// ----------------------------------------------------
// TEST 9: Clean Slate Verification (Zero Preloaded Signals)
// ----------------------------------------------------
console.log('\nTest 9: Clean Slate Verification (Zero Preloaded Signals)...');
{
  const appJs = fs.readFileSync(fs.existsSync('./js/app.js') ? './js/app.js' : path.join(__dirname, '../js/app.js'), 'utf8');
  const indexHtml = fs.readFileSync(fs.existsSync('./index.html') ? './index.html' : path.join(__dirname, '../index.html'), 'utf8');

  // Check initial items in app.js
  const hasOnlyBlankInitialRow = appJs.includes("text: '',") && !appJs.includes("text: 's1[n] =");
  assert(hasOnlyBlankInitialRow, 'app.js must initialize with an empty blank row, without preloaded signals!');

  // Check that old CAS modal and presets modal are completely removed
  assert(!indexHtml.includes('id="cas-modal"'), 'index.html must not contain old cas-modal');
  assert(!indexHtml.includes('id="presets-modal"'), 'index.html must not contain old presets-modal');
  assert(!indexHtml.includes('btn-presets'), 'index.html must not contain presets button');
  assert(!indexHtml.includes('btn-cas'), 'index.html must not contain cas button');

  console.log('  ✓ Verified 100% clean-slate startup: 0 preloaded signals, and legacy CAS/presets modals removed!');
}

// ----------------------------------------------------
// TEST 10: Graphpaper Features (SVG Export, Dark Theme, Intersections)
// ----------------------------------------------------
console.log('\nTest 10: Graphpaper Features (SVG Export, Dark Mode, Intersections)...');
{
  const canvas = createMockCanvas(800, 600);
  const gp = new Graphpaper(canvas, { xMin: -5, xMax: 5, yMin: -5, yMax: 5 });

  // 1. SVG Export
  const svg = gp.exportSVG();
  assert(typeof svg === 'string', 'exportSVG must return string');
  assert(svg.includes('<svg') && svg.endsWith('</svg>'), 'exportSVG must return valid SVG markup');
  assert(svg.includes('viewBox="0 0 800 600"'), 'SVG must include correct viewBox dimensions');

  // 2. Dark Mode Theme Switching
  gp.setDarkMode(true);
  assert.strictEqual(gp.darkMode, true, 'Dark mode should be active');

  gp.setDarkMode(false);
  assert.strictEqual(gp.darkMode, false, 'Light mode should be active');

  // 3. Curve Intersections Detection in computeKeyPoints
  const items = [
    { id: 'f1', text: 'y = x^2', color: '#2d70b3', visible: true },
    { id: 'f2', text: 'y = 4', color: '#c74440', visible: true }
  ];
  const compiledMap = OmniMath.compileAll(items);
  items[0].compiled = compiledMap.get('f1');
  items[1].compiled = compiledMap.get('f2');
  gp.updateState(items, {});

  const pois = gp.computeKeyPoints();
  const intersections = pois.filter(p => p.type === 'intersection');
  assert(intersections.length >= 2, `Should detect both intersection points of y = x^2 and y = 4 (found ${intersections.length})`);
  const xCoords = intersections.map(p => Math.round(p.xVal)).sort();
  assert(xCoords.includes(-2) && xCoords.includes(2), 'Intersections should be at x = -2 and x = 2');

  console.log('  ✓ Vector SVG export, Dark mode theme, and Curve Intersections verified 100%!');
}

console.log('\n========================================================');
console.log(' ALL 10 COMPREHENSIVE QOL TESTS PASSED WITH ZERO ERRORS! ');
console.log('========================================================\n');
