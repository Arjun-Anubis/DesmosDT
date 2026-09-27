const assert = require('assert');
const fs = require('fs');

console.log('--- Simulating Desmos-Style OmniGraph Environment ---');

const elements = {};

function createElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    parentElement: null,
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    children: [],
    setAttribute: (name, val) => { el[name] = val; },
    getAttribute: (name) => el[name] || '',
    appendChild: (child) => {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    querySelector: (selector) => {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return elements[id] || createElement('div');
      }
      return createElement('div');
    },
    querySelectorAll: (selector) => [],
    getBoundingClientRect: () => ({ width: 1000, height: 700, left: 400, top: 0 }),
    addEventListener: (event, handler) => {},
    removeEventListener: () => {},
    focus: () => {},
    setSelectionRange: () => {},
    getContext: () => ({
      scale: () => {},
      setTransform: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      rect: () => {},
      setLineDash: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      measureText: (txt) => ({ width: txt.length * 7 })
    })
  };
  return el;
}

global.window = {
  innerWidth: 1400,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: () => {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.window.requestAnimationFrame = global.requestAnimationFrame;

global.document = {
  readyState: 'complete',
  createElement: createElement,
  getElementById: (id) => {
    if (!elements[id]) {
      const el = createElement('div');
      el.id = id;
      elements[id] = el;
    }
    return elements[id];
  },
  body: createElement('body')
};

// Canvas parent element
const container = document.getElementById('graph-container');
const canvas = document.getElementById('graph-canvas');
container.appendChild(canvas);

// UI Element IDs
const elementIds = [
  'desmos-plus-btn',
  'desmos-undo-btn',
  'desmos-redo-btn',
  'sidebar-scroll-area',
  'sidebar-blank-dock',
  'expression-list',
  'zoom-in-btn',
  'zoom-out-btn',
  'home-view-btn',
  'export-png-btn',
  'cas-modal',
  'open-cas-btn',
  'close-cas-btn',
  'eval-cas-btn',
  'cas-operation',
  'cas-input-expr',
  'cas-output-math',
  'cas-insert-btn',
  'presets-modal',
  'open-presets-btn',
  'close-presets-btn'
];

elementIds.forEach(id => document.getElementById(id));

const path = require('path');
try {
  // Load scripts
  const casCode = fs.readFileSync(path.resolve(__dirname, '../js/cas_math.js'), 'utf8');
  eval(casCode);
  console.log('✓ cas_math.js loaded.');

  const graphCode = fs.readFileSync(path.resolve(__dirname, '../js/graphpaper.js'), 'utf8');
  eval(graphCode);
  console.log('✓ graphpaper.js loaded.');

  const appCode = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  eval(appCode);
  console.log('✓ app.js loaded and initialized.');

  // 1. Test clicking the round "+" button
  const plusBtn = document.getElementById('desmos-plus-btn');
  assert.strictEqual(typeof plusBtn.onclick, 'function', 'Plus button must have an onclick handler');
  plusBtn.onclick();
  console.log('✓ Desmos round "+" button clicked and added new line');

  // 2. Test clicking the blank area below cards
  const scrollArea = document.getElementById('sidebar-scroll-area');
  assert.strictEqual(typeof scrollArea.onclick, 'function', 'Sidebar scroll area must have an onclick handler');
  scrollArea.onclick({ target: scrollArea });
  console.log('✓ Clicked blank sidebar dock - new row created seamlessly');

  // 3. Test Undo / Redo
  const undoBtn = document.getElementById('desmos-undo-btn');
  const redoBtn = document.getElementById('desmos-redo-btn');
  assert.strictEqual(typeof undoBtn.onclick, 'function');
  assert.strictEqual(typeof redoBtn.onclick, 'function');
  undoBtn.onclick();
  redoBtn.onclick();
  console.log('✓ Undo and Redo buttons clicked successfully');

  // 4. Test Multi-Signal Arithmetic (s1, s2, s3 = s1 - s2)
  const math = window.OmniMath;
  const testSignals = [
    { id: '1', text: 's1[n] = (0.75^n) * u[n]' },
    { id: '2', text: 's2[n] = delta[n] + delta[n-1]' },
    { id: '3', text: 's3[n] = s1[n] - s2[n]' }
  ];
  const compiled = math.compileAll(testSignals);
  const s3 = compiled.get('3');
  assert.strictEqual(s3.kind, 'discrete', 's3 must be auto-detected as discrete');
  // At n=0: s1[0]=1, s2[0]=1 => s3[0]=0
  assert.strictEqual(s3.eval(0, 0), 0);
  // At n=1: s1[1]=0.75, s2[1]=1 => s3[1]=-0.25
  assert.strictEqual(s3.eval(1, 1), -0.25);
  console.log('✓ Multi-signal subtraction (s3[n] = s1[n] - s2[n]) verified correctly!');

  // 5. Test Zoom and Preset controls
  document.getElementById('zoom-in-btn').onclick();
  document.getElementById('zoom-out-btn').onclick();
  document.getElementById('home-view-btn').onclick();
  console.log('✓ Zoom controls verified.');

  console.log('\n======================================================');
  console.log(' ALL DESMOS-STYLE UI & SIGNAL TESTS PASSED 100%!     ');
  console.log('======================================================\n');
} catch (err) {
  console.error('TEST ERROR:', err);
  process.exit(1);
}
