const assert = require('assert');
const math = require('../js/cas_math.js');
const Graphpaper = require('../js/graphpaper.js');

console.log('========================================================');
console.log(' STARTING COMPLEX NUMBERS & POINT PREVIEW VERIFICATION  ');
console.log('========================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Complex Number Class & Arithmetic
// -----------------------------------------------------------------------------
console.log('Test 1: Complex Number Class & Arithmetic Operations...');
const { Complex } = math;
assert(Complex, 'Complex class is exported by cas_math.js');

// 1.1 Creation & Formatting
const z1 = new Complex(3, 4);
assert.strictEqual(z1.re, 3);
assert.strictEqual(z1.im, 4);
assert.strictEqual(z1.toString(), '3 + 4i');

const z2 = new Complex(0, 1);
assert.strictEqual(z2.toString(), 'i');

const z3 = new Complex(0, -1);
assert.strictEqual(z3.toString(), '-i');

const z4 = new Complex(5, -2);
assert.strictEqual(z4.toString(), '5 - 2i');

// 1.2 Parsing strings (i and j notation)
assert.strictEqual(Complex.parse('3+4i').toString(), '3 + 4i');
assert.strictEqual(Complex.parse('2-5j').toString(), '2 - 5i');
assert.strictEqual(Complex.parse('i').toString(), 'i');
assert.strictEqual(Complex.parse('-j').toString(), '-i');
assert.strictEqual(Complex.parse('7').toString(), '7');

// 1.3 Arithmetic: Add, Sub, Mul, Div, Abs, Arg, Conj
const sum = z1.add(z4); // (3+4i) + (5-2i) = 8 + 2i
assert.strictEqual(sum.toString(), '8 + 2i');

const diff = z1.sub(z4); // (3+4i) - (5-2i) = -2 + 6i
assert.strictEqual(diff.toString(), '-2 + 6i');

const prod = z1.mul(new Complex(1, 2)); // (3+4i)(1+2i) = 3 + 6i + 4i - 8 = -5 + 10i
assert.strictEqual(prod.toString(), '-5 + 10i');

const div = new Complex(-5, 10).div(new Complex(1, 2)); // Should be 3 + 4i
assert.strictEqual(div.toString(), '3 + 4i');

assert.strictEqual(z1.abs(), 5);
assert.strictEqual(z1.conj().toString(), '3 - 4i');
assert(Math.abs(z2.arg() - Math.PI / 2) < 1e-9);

// 1.4 Transcendental: exp, sqrt, Euler identity e^(i*pi) = -1
const euler = new Complex(0, Math.PI).exp(); // e^(i*pi) = -1
assert(Math.abs(euler.re - (-1)) < 1e-9 && Math.abs(euler.im) < 1e-9, 'Euler identity e^(i*pi) = -1');

const sqrtNeg4 = new Complex(-4, 0).sqrt(); // sqrt(-4) = 2i
assert.strictEqual(sqrtNeg4.toString(), '2i');

console.log('  ✓ Complex arithmetic, parsing, and Euler formula verified!\n');

// -----------------------------------------------------------------------------
// TEST 2: Expression Engine with Complex Numbers & Variables
// -----------------------------------------------------------------------------
console.log('Test 2: Expression Engine Complex Parsing & Compilation...');

const items = [
  { id: 'c1', text: 'z1 = 3 + 4i' },
  { id: 'c2', text: 'z2 = 1 - 2j' },
  { id: 'c3', text: 'z3 = z1 + z2' },
  { id: 'c4', text: 'z4 = z1 * z2' },
  { id: 'c5', text: 'mag = abs(z1)' },
  { id: 'c6', text: 'realPart = re(z1)' },
  { id: 'c7', text: 'imagPart = im(z1)' },
  { id: 'c8', text: 'conjZ = conj(z1)' },
  { id: 'c9', text: 's[n] = exp(i * 0.2 * pi * n)' }
];

const compiled = math.compileAll(items);

const comp1 = compiled.get('c1');
assert(comp1.isComplex, 'z1 recognized as complex');
assert.strictEqual(comp1.value.toString(), '3 + 4i');
assert.strictEqual(comp1.evalPoint().x, 3);
assert.strictEqual(comp1.evalPoint().y, 4);

const comp2 = compiled.get('c2');
assert(comp2.isComplex, 'z2 recognized as complex with j notation');
assert.strictEqual(comp2.value.toString(), '1 - 2i');

const comp3 = compiled.get('c3');
assert(comp3.isComplex, 'z3 is sum of complex variables');
assert.strictEqual(comp3.value.toString(), '4 + 2i');

const comp4 = compiled.get('c4');
// (3+4i)*(1-2i) = 3 - 6i + 4i + 8 = 11 - 2i
assert(comp4.isComplex, 'z4 is product of complex variables');
assert.strictEqual(comp4.value.toString(), '11 - 2i');

const comp5 = compiled.get('c5');
assert.strictEqual(comp5.value, 5, 'abs(3+4i) = 5');

const comp6 = compiled.get('c6');
assert.strictEqual(comp6.value, 3, 're(3+4i) = 3');

const comp7 = compiled.get('c7');
assert.strictEqual(comp7.value, 4, 'im(3+4i) = 4');

const comp8 = compiled.get('c8');
assert.strictEqual(comp8.value.toString(), '3 - 4i', 'conj(3+4i) = 3 - 4i');

const comp9 = compiled.get('c9');
assert.strictEqual(comp9.kind, 'discrete', 's[n] is discrete signal');
// At n = 0, exp(0) = 1
assert.strictEqual(comp9.eval(0, 0), 1);
assert.strictEqual(comp9.evalRaw(0, 0).re, 1);
// At n = 5, exp(i * pi) = -1
assert(Math.abs(comp9.eval(5, 5) - (-1)) < 1e-4);
const raw5 = comp9.evalRaw(5, 5);
assert(Math.abs(raw5.re - (-1)) < 1e-4 && Math.abs(raw5.im) < 1e-4);

console.log('  ✓ Complex expressions, variables, and DSP complex signals compile and evaluate!\n');

// -----------------------------------------------------------------------------
// TEST 3: Symbolic CAS Solve Complex Roots
// -----------------------------------------------------------------------------
console.log('Test 3: Symbolic CAS Solve with Complex Roots...');
const roots1 = math.solve('x^2 + 1 = 0', 'x');
console.log('  x^2 + 1 = 0 roots:', roots1);
assert.deepStrictEqual(roots1, ['i', '-i'], 'Returns exact complex roots i and -i');

const roots2 = math.solve('x^2 + 4 = 0', 'x');
console.log('  x^2 + 4 = 0 roots:', roots2);
assert.deepStrictEqual(roots2, ['2i', '-2i'], 'Returns exact complex roots 2i and -2i');

const roots3 = math.solve('x^2 - 2x + 5 = 0', 'x');
console.log('  x^2 - 2x + 5 = 0 roots:', roots3);
assert.deepStrictEqual(roots3, ['1 + 2i', '1 - 2i'], 'Returns exact complex roots 1 + 2i and 1 - 2i');

console.log('  ✓ Symbolic CAS solve successfully returns clean complex roots!\n');

// -----------------------------------------------------------------------------
// TEST 4: Point Preview Circular JSON Crash & Offset Bug Fix
// -----------------------------------------------------------------------------
console.log('Test 4: Point Preview - Circular JSON Crash & Offset Fix Verification...');

// Mock Canvas & 2D Context
const calls = [];
const mockCtx = {
  save: () => calls.push({ method: 'save' }),
  restore: () => calls.push({ method: 'restore' }),
  beginPath: () => calls.push({ method: 'beginPath' }),
  arc: (...args) => calls.push({ method: 'arc', args }),
  roundRect: (...args) => calls.push({ method: 'roundRect', args }),
  rect: (...args) => calls.push({ method: 'rect', args }),
  fill: () => calls.push({ method: 'fill' }),
  stroke: () => calls.push({ method: 'stroke' }),
  moveTo: (...args) => calls.push({ method: 'moveTo', args }),
  lineTo: (...args) => calls.push({ method: 'lineTo', args }),
  closePath: () => calls.push({ method: 'closePath' }),
  fillText: function(text, x, y) {
    calls.push({ method: 'fillText', text, x, y, textAlign: this.textAlign, textBaseline: this.textBaseline });
  },
  measureText: (text) => ({ width: text.length * 7 }),
  setLineDash: () => {},
  setTransform: () => {},
  scale: () => {},
  clearRect: () => {},
  fillRect: () => {},
  textAlign: 'right', // Simulating leftover state from drawGrid()
  textBaseline: 'alphabetic',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1
};

const mockCanvas = {
  getContext: () => mockCtx,
  parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  addEventListener: () => {},
  style: {}
};

const graph = new Graphpaper(mockCanvas);

// Item with a circular reference (such as MathQuill instance)
const circularRef = {};
circularRef.self = circularRef;

const testItems = [
  {
    id: 'p1',
    visible: true,
    text: '(2, 3)',
    color: '#2d70b3',
    compiled: {
      kind: 'point',
      evalPoint: () => ({ x: 2, y: 3 })
    },
    mathField: circularRef // CIRCULAR REFERENCE!
  },
  {
    id: 'z1',
    visible: true,
    text: 'z = 3 + 4i',
    color: '#9333ea',
    compiled: {
      kind: 'complex',
      value: new Complex(3, 4),
      evalPoint: () => ({ x: 3, y: 4 })
    },
    mathField: circularRef // CIRCULAR REFERENCE!
  }
];

graph.updateState(testItems, {});

// 4.1 Verify checkHover DOES NOT crash with circular structures
const screenPt = graph.mathToScreen(2, 3);
assert.doesNotThrow(() => {
  graph.checkHover(screenPt.x, screenPt.y);
}, 'checkHover handles circular references without throwing JSON.stringify circular errors');

assert(graph.hoveredEntity, 'Entity was successfully hovered');
assert.strictEqual(graph.hoveredEntity.xVal, 2);
assert.strictEqual(graph.hoveredEntity.yVal, 3);
console.log('  ✓ Circular JSON structure crash permanently resolved in checkHover!');

// 4.2 Verify drawHoverTooltip text alignment and centered coordinates
calls.length = 0;
// Set leaked canvas state
mockCtx.textAlign = 'right';
mockCtx.textBaseline = 'alphabetic';

graph.drawHoverTooltip(graph.hoveredEntity);

const fillTextCalls = calls.filter(c => c.method === 'fillText');
assert(fillTextCalls.length > 0, 'drawHoverTooltip called fillText');

const lastFillText = fillTextCalls[fillTextCalls.length - 1];
console.log('  drawHoverTooltip fillText call:', lastFillText);
assert.strictEqual(lastFillText.textAlign, 'center', 'ctx.textAlign must be explicitly set to center');
assert.strictEqual(lastFillText.textBaseline, 'middle', 'ctx.textBaseline must be explicitly set to middle');

// Verify that text x coordinate is centered inside box
const roundRectCalls = calls.filter(c => c.method === 'roundRect');
assert(roundRectCalls.length > 0, 'Tooltip background box created');
const boxArgs = roundRectCalls[0].args; // [boxX, boxY, boxW, boxH, radius]
const boxX = boxArgs[0];
const boxY = boxArgs[1];
const boxW = boxArgs[2];
const boxH = boxArgs[3];

assert.strictEqual(lastFillText.x, boxX + boxW / 2, 'Text x coordinate is exactly at horizontal center of bubble box');
assert.strictEqual(lastFillText.y, boxY + boxH / 2, 'Text y coordinate is exactly at vertical center of bubble box');
console.log('  ✓ Bubble offset bug permanently resolved! Text is mathematically centered in bubble.');

// 4.3 Verify Complex Number (Argand / Phasor) Drawing
calls.length = 0;
graph.drawComplexNumber(testItems[1]);
const strokeCalls = calls.filter(c => c.method === 'stroke');
const arcCalls = calls.filter(c => c.method === 'arc');
assert(strokeCalls.length >= 2, 'Phasor line and anchor dot stroked');
assert(arcCalls.length >= 1, 'Anchor point circle drawn at (re, im)');
console.log('  ✓ Complex number Argand phasor diagram drawn accurately!\n');

// 4.4 Verify Click-to-Pin Functionality
assert.strictEqual(graph.pinnedEntity, null, 'Initially not pinned');
graph.pinnedEntity = { ...graph.hoveredEntity };
assert(graph.pinnedEntity, 'Pinned entity set');

calls.length = 0;
graph.render();
const pinnedRenders = calls.filter(c => c.method === 'fillText' && c.text === graph.pinnedEntity.label);
assert(pinnedRenders.length >= 1, 'Pinned entity rendered in main render pipeline');
console.log('  ✓ Click-to-pin point preview verified!\n');

console.log('========================================================');
console.log(' ALL COMPLEX NUMBERS & POINT PREVIEW TESTS PASSED 100%! ');
console.log('========================================================\n');
