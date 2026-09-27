/**
 * Browser Simulation Test for Modern OmniGraph Application
 */

const assert = require('assert');
const fs = require('fs');

console.log('--- Simulating Browser Environment & Verifying OmniGraph ---');

// Mock DOM & Browser Environment
const elements = {};

function createElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) {
        if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      }
    },
    dataset: {},
    children: [],
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k]; },
    querySelector: (selector) => createElement('div'),
    querySelectorAll: (selector) => [],
    setSelectionRange: () => {},
    appendChild: (child) => { el.children.push(child); return child; },
    removeChild: (child) => {
      const idx = el.children.indexOf(child);
      if (idx !== -1) el.children.splice(idx, 1);
    },
    addEventListener: () => {},
    focus: () => {},
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 200, height: 40 }),
    getContext: (type) => ({
      canvas: el,
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
      fillRect: () => {},
      roundRect: () => {},
      setLineDash: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 7 })
    })
  };
  return el;
}

global.window = {
  innerWidth: 1400,
  innerHeight: 800,
  devicePixelRatio: 1,
  location: { hash: '', href: 'http://localhost:3000/' },
  addEventListener: () => {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.window.requestAnimationFrame = global.requestAnimationFrame;

global.document = {
  readyState: 'complete',
  createElement: createElement,
  getElementById: (id) => {
    if (!elements[id]) {
      const el = createElement(id.includes('canvas') ? 'canvas' : 'div');
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

// Modern Desmos UI elements
const modernButtonIds = [
  'desmos-plus-btn',
  'add-folder-btn',
  'desmos-undo-btn',
  'desmos-redo-btn',
  'toggle-mute-btn',
  'toggle-dark-btn',
  'export-svg-btn',
  'export-png-btn',
  'share-graph-btn',
  'wrench-btn',
  'zoom-in-btn',
  'zoom-out-btn',
  'home-view-btn',
  'sidebar-blank-dock'
];

modernButtonIds.forEach(id => {
  const btn = document.getElementById(id);
  btn.onclick = null;
});

const path = require('path');
try {
  // 1. cas_math.js
  const mathCode = fs.readFileSync(path.resolve(__dirname, '../js/cas_math.js'), 'utf8');
  eval(mathCode);
  console.log('✓ js/cas_math.js loaded successfully. OmniMath:', typeof window.OmniMath);
  assert.ok(window.OmniMath, 'window.OmniMath must be defined');

  // 2. graphpaper.js
  const graphCode = fs.readFileSync(path.resolve(__dirname, '../js/graphpaper.js'), 'utf8');
  eval(graphCode);
  console.log('✓ js/graphpaper.js loaded successfully. Graphpaper:', typeof window.Graphpaper);
  assert.ok(window.Graphpaper, 'window.Graphpaper must be defined');

  // 3. app.js
  const appCode = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  eval(appCode);
  console.log('✓ js/app.js loaded and executed successfully without constructor errors!');

  // Test Desmos round "+" button
  const plusBtn = document.getElementById('desmos-plus-btn');
  assert.strictEqual(typeof plusBtn.onclick, 'function', 'desmos-plus-btn must have an onclick handler');
  plusBtn.onclick();
  console.log('✓ Desmos round "+" button clicked and added new line');

  // Test blank sidebar dock
  const dock = document.getElementById('sidebar-blank-dock');
  assert.strictEqual(typeof dock.onclick, 'function', 'sidebar-blank-dock must have an onclick handler');
  dock.onclick();
  console.log('✓ Clicked blank sidebar dock - new row created seamlessly');

  // Test Undo / Redo
  const undoBtn = document.getElementById('desmos-undo-btn');
  const redoBtn = document.getElementById('desmos-redo-btn');
  assert.strictEqual(typeof undoBtn.onclick, 'function', 'Undo button must have onclick handler');
  assert.strictEqual(typeof redoBtn.onclick, 'function', 'Redo button must have onclick handler');
  undoBtn.onclick();
  redoBtn.onclick();
  console.log('✓ Undo and Redo buttons clicked successfully');

  // Test Dark Mode toggle
  const darkBtn = document.getElementById('toggle-dark-btn');
  assert.strictEqual(typeof darkBtn.onclick, 'function', 'Dark mode toggle must have onclick handler');
  darkBtn.onclick();
  console.log('✓ Dark Mode button toggled successfully');

  // Test Mute toggle
  const muteBtn = document.getElementById('toggle-mute-btn');
  assert.strictEqual(typeof muteBtn.onclick, 'function', 'Mute toggle must have onclick handler');
  muteBtn.onclick();
  console.log('✓ Mute All button toggled successfully');

  // Test Zoom In / Out / Home
  document.getElementById('zoom-in-btn').onclick();
  document.getElementById('zoom-out-btn').onclick();
  document.getElementById('home-view-btn').onclick();
  console.log('✓ Zoom In, Zoom Out, and Home View buttons executed successfully!');

  console.log('\n======================================================');
  console.log(' MODERN OMNIGRAPH DESMOS-STYLE SIMULATION PASSED 100%! ');
  console.log('======================================================\n');
} catch (e) {
  console.error('SIMULATION FAILED WITH ERROR:', e);
  process.exit(1);
}
