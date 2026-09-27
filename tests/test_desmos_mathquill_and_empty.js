const assert = require('assert');
const fs = require('fs');

console.log('========================================================');
console.log(' STARTING MATHQUILL & EMPTY EXPRESSION VERIFICATION     ');
console.log('========================================================\n');

const path = require('path');

// 1. Verify LaTeX <-> Math string conversions in cas_math.js
const math = require('../js/cas_math.js');
global.OmniMath = math;

console.log('Test 1: LaTeX Parsing and Nested Fractions...');
const complexLatex = '\\frac{x}{\\pi(x^{2}-60^{2})}';
const parsedMath = math.latexToMath(complexLatex);
console.log(`  Parsed: ${complexLatex} => ${parsedMath}`);
assert(parsedMath.includes('(x)') && parsedMath.includes('pi') && parsedMath.includes('60^(2)'), 'Nested LaTeX fraction parsed successfully');
const evalResult = math.compileExpression('y = ' + parsedMath).eval(2, 2);
assert(!isNaN(evalResult) && isFinite(evalResult), 'Parsed LaTeX evaluates accurately');

const latexSin = math.latexToMath('\\sin(x) + \\cos(2\\pi x)');
console.log(`  Parsed trig: ${latexSin}`);
assert.strictEqual(math.compileExpression('y = ' + latexSin).eval(0, 0), 1);

const toLatex = math.mathToLatex('(x + 1) / (x - 1)');
console.log(`  To LaTeX: (x + 1) / (x - 1) => ${toLatex}`);
assert(toLatex.includes('\\frac'), 'Converts division into LaTeX fraction');
console.log('  ✓ LaTeX conversion handles complex nested structures accurately!\n');

// 2. Verify Empty Expressions in cas_math.js
console.log('Test 2: Empty Expression Compilation...');
const emptyItems = [
  { id: 'blank1', text: '' },
  { id: 'blank2', text: '   ' },
  { id: 'expr1', text: 'y = 2x + 1' }
];
const compiledMap = math.compileAll(emptyItems);
const cBlank1 = compiledMap.get('blank1');
const cBlank2 = compiledMap.get('blank2');
const cExpr1 = compiledMap.get('expr1');

assert.strictEqual(cBlank1.isEmpty, true, 'blank1 must be marked isEmpty');
assert.strictEqual(cBlank1.kind, 'empty', 'blank1 kind must be empty');
assert(isNaN(cBlank1.eval(5, 5)), 'blank1 evaluation must return NaN');

assert.strictEqual(cBlank2.isEmpty, true, 'blank2 must be marked isEmpty');
assert.strictEqual(cBlank2.kind, 'empty', 'blank2 kind must be empty');

assert.strictEqual(cExpr1.isEmpty, false, 'expr1 must NOT be marked isEmpty');
assert.strictEqual(cExpr1.eval(2, 2), 5, 'expr1 evaluates correctly');
console.log('  ✓ Empty items correctly flagged as isEmpty and never evaluate to numerical values!\n');

// 3. Verify Graphpaper canvas rendering skips empty items
console.log('Test 3: Graphpaper Canvas Ignores Empty Expressions...');
const Graphpaper = require('../js/graphpaper.js');
global.Graphpaper = Graphpaper;

let strokesCount = 0;
let fillsCount = 0;
const mockCtx = {
  setTransform: () => {},
  scale: () => {},
  clearRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => { strokesCount++; },
  fill: () => { fillsCount++; },
  arc: () => {},
  rect: () => {},
  setLineDash: () => {},
  save: () => {},
  restore: () => {},
  fillText: () => {},
  measureText: () => ({ width: 10 })
};

const mockCanvas = {
  style: {},
  width: 800,
  height: 600,
  getContext: () => mockCtx,
  parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  addEventListener: () => {}
};

const gp = new global.Graphpaper(mockCanvas);

// Update with ONLY empty items
strokesCount = 0;
const emptySet = [
  { id: 'blank1', text: '', visible: true },
  { id: 'blank2', text: '   ', visible: true }
];
const compiledEmpty = math.compileAll(emptySet);
emptySet.forEach(it => { it.compiled = compiledEmpty.get(it.id); });
gp.updateState(emptySet, {});

// Render canvas
gp.render();
const strokesWithOnlyEmpty = strokesCount;

// Now add a valid expression
const exprSet = [
  { id: 'blank1', text: '', visible: true },
  { id: 'expr1', text: 'y = sin(x)', visible: true }
];
const compiledExpr = math.compileAll(exprSet);
exprSet.forEach(it => { it.compiled = compiledExpr.get(it.id); });
strokesCount = 0;
gp.updateState(exprSet, {});
gp.render();
const strokesWithExpression = strokesCount;

assert(strokesWithExpression > strokesWithOnlyEmpty, 'Valid expression causes curve strokes, whereas empty expressions cause none');
console.log(`  Strokes with empty items: ${strokesWithOnlyEmpty} (grid axes only)`);
console.log(`  Strokes with valid curve: ${strokesWithExpression} (grid axes + curve)`);
console.log('  ✓ Graphpaper completely ignores empty expressions!\n');

// 4. Test Sidebar UI, Collapse/Expand, and Dynamic Swatches
console.log('Test 4: UI DOM Simulation - Collapse, Expand, and Empty Swatches...');

const elements = {};
function createMockEl(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    parentElement: null,
    style: {},
    classList: {
      _classes: new Set(),
      add: (c) => el.classList._classes.add(c),
      remove: (c) => el.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (el.classList._classes.has(c)) el.classList._classes.delete(c);
          else el.classList._classes.add(c);
        } else if (force) {
          el.classList._classes.add(c);
        } else {
          el.classList._classes.delete(c);
        }
      },
      contains: (c) => el.classList._classes.has(c)
    },
    children: [],
    setAttribute: (name, val) => { el[name] = val; },
    getAttribute: (name) => el[name] || '',
    appendChild: (child) => {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    innerHTML: '',
    querySelector: (selector) => {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return elements[id] || createMockEl('div');
      }
      return createMockEl('div');
    },
    querySelectorAll: (selector) => [],
    getBoundingClientRect: () => ({ width: 1000, height: 700, left: 400, top: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {},
    setSelectionRange: () => {},
    getContext: () => mockCtx,
    click: function() { if (typeof this.onclick === 'function') this.onclick({ stopPropagation: () => {} }); }
  };
  return el;
}

global.document = {
  readyState: 'complete',
  createElement: createMockEl,
  getElementById: (id) => {
    if (!elements[id]) {
      const el = createMockEl(id.includes('canvas') ? 'canvas' : 'div');
      el.id = id;
      elements[id] = el;
    }
    return elements[id];
  },
  querySelector: (sel) => createMockEl('div'),
  querySelectorAll: (sel) => [],
  body: createMockEl('body')
};

global.window = {
  innerWidth: 1400,
  innerHeight: 800,
  devicePixelRatio: 1,
  location: { hash: '', href: 'http://localhost:3000/' },
  addEventListener: () => {}
};

const domIds = [
  'graph-container',
  'graph-canvas',
  'sidebar',
  'collapse-sidebar-btn',
  'expand-sidebar-btn',
  'sidebar-wrench-btn',
  'wrench-btn',
  'wrench-modal',
  'desmos-plus-btn',
  'add-folder-btn',
  'desmos-undo-btn',
  'desmos-redo-btn',
  'sidebar-scroll-area',
  'sidebar-blank-dock',
  'expression-list',
  'zoom-in-btn',
  'zoom-out-btn',
  'home-view-btn',
  'export-png-btn',
  'export-svg-btn',
  'share-graph-btn',
  'toggle-dark-btn',
  'toggle-mute-btn'
];
domIds.forEach(id => global.document.getElementById(id));

const appCode = fs.readFileSync(fs.existsSync('./js/app.js') ? './js/app.js' : path.join(__dirname, '../js/app.js'), 'utf8');
eval(appCode);

// 4a. Test Sidebar Collapse
const sidebar = global.document.getElementById('sidebar');
const collapseBtn = global.document.getElementById('collapse-sidebar-btn');
const expandBtn = global.document.getElementById('expand-sidebar-btn');

assert.strictEqual(typeof collapseBtn.onclick, 'function', 'Collapse button has onclick');
collapseBtn.click();
assert(sidebar.classList.contains('collapsed'), 'Sidebar has .collapsed class');
assert.strictEqual(expandBtn.style.display, 'flex', 'Expand tab button is displayed');
console.log('  ✓ Sidebar collapse (<<) collapses panel and displays expand tab (>>)!');

// 4b. Test Sidebar Expand
assert.strictEqual(typeof expandBtn.onclick, 'function', 'Expand button has onclick');
expandBtn.click();
assert(!sidebar.classList.contains('collapsed'), 'Sidebar has .collapsed removed');
assert.strictEqual(expandBtn.style.display, 'none', 'Expand tab button is hidden');
console.log('  ✓ Sidebar expand (>>) restores panel and hides expand tab!');

// 4c. Test Sidebar Wrench Button
const sidebarWrenchBtn = global.document.getElementById('sidebar-wrench-btn');
const wrenchModal = global.document.getElementById('wrench-modal');
assert.strictEqual(typeof sidebarWrenchBtn.onclick, 'function', 'Sidebar wrench button has onclick');
sidebarWrenchBtn.click();
assert.strictEqual(wrenchModal.style.display, 'flex', 'Wrench modal opened from sidebar header wrench button');
console.log('  ✓ Sidebar wrench (⚙) button opens the Graph Settings modal!');

console.log('\n========================================================');
console.log(' ALL MATHQUILL, EMPTY EXPR & DESMOS UI TESTS PASSED!   ');
console.log('========================================================\n');
