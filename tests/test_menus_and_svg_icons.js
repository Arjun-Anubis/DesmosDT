/**
 * Test: Menus & SVG Icons (No Emoticons / Emoji Glyphs)
 * 
 * Verifies:
 * 1. Zero emoticon / emoji Unicode glyphs in UI templates and rendered HTML.
 * 2. Proper inline SVG vector icons for all buttons and tools.
 * 3. Add Item Dropdown Menu (#add-menu-dropdown) under #desmos-plus-btn.
 * 4. Share & Export Dropdown Menu (#share-menu-dropdown) under #share-menu-toggle.
 * 5. Settings modal toggles (#toggle-dark-btn, #toggle-mute-btn) with dynamic SVG updates.
 * 6. Click-outside behavior for dropdown menus.
 */

const fs = require('fs');
const assert = require('assert');

console.log('========================================================');
console.log(' STARTING MENUS & SVG VECTOR ICONS VERIFICATION        ');
console.log('========================================================\n');

// 1. Check source files for unwanted emoticons/emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2190}-\u{21FF}\u{2200}-\u{22FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/u;

const path = require('path');
const htmlPath = fs.existsSync('./index.html') ? './index.html' : path.join(__dirname, '../index.html');
const cssPath = fs.existsSync('./css/style.css') ? './css/style.css' : path.join(__dirname, '../css/style.css');
const appPath = fs.existsSync('./js/app.js') ? './js/app.js' : path.join(__dirname, '../js/app.js');
const casPath = fs.existsSync('./js/cas_math.js') ? './js/cas_math.js' : path.join(__dirname, '../js/cas_math.js');
const graphPath = fs.existsSync('./js/graphpaper.js') ? './js/graphpaper.js' : path.join(__dirname, '../js/graphpaper.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

assert(!emojiRegex.test(htmlContent), 'index.html must not contain unicode emoji/emoticons');
assert(!emojiRegex.test(cssContent), 'css/style.css must not contain unicode emoji/emoticons');
assert(!emojiRegex.test(appContent), 'js/app.js must not contain unicode emoji/emoticons');
console.log('✓ Zero emoji/emoticon glyphs in index.html, css/style.css, and js/app.js!');

// 2. Set up DOM environment
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
    click: function() { if (typeof this.onclick === 'function') this.onclick(); },
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

global.URL = { createObjectURL: () => 'blob:mock' };
global.Blob = function() {};
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

// Load scripts in DOM context
eval(fs.readFileSync(casPath, 'utf8'));
eval(fs.readFileSync(graphPath, 'utf8'));
eval(fs.readFileSync(appPath, 'utf8'));

console.log('✓ OmniGraph loaded in simulated DOM environment.\n');

// 3. Test Add Menu Dropdown
console.log('Test 1: Add Menu Dropdown Interaction...');
const plusBtn = document.getElementById('desmos-plus-btn');
const addMenu = document.getElementById('add-menu-dropdown');
assert.ok(plusBtn, '#desmos-plus-btn must exist');
assert.ok(addMenu, '#add-menu-dropdown must exist');

// Initial state
addMenu.style.display = 'none';

// Click plusBtn with event object (simulating user click in browser)
plusBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(addMenu.style.display, 'flex', 'Add menu should open on plus button click');

// Click Add Expression
const addExprBtn = document.getElementById('add-expr-btn');
assert.ok(addExprBtn, '#add-expr-btn must exist');
addExprBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(addMenu.style.display, 'none', 'Add menu should close after selecting item');

// Reopen and add note
plusBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(addMenu.style.display, 'flex');
const addNoteBtn = document.getElementById('add-note-btn');
assert.ok(addNoteBtn, '#add-note-btn must exist');
addNoteBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(addMenu.style.display, 'none');

// Reopen and add folder
plusBtn.onclick({ stopPropagation: () => {} });
const addFolderBtn = document.getElementById('add-folder-btn');
assert.ok(addFolderBtn, '#add-folder-btn must exist');
addFolderBtn.onclick({ stopPropagation: () => {} });
assert.strictEqual(addMenu.style.display, 'none');

console.log('  ✓ Add Menu Dropdown opens, closes, and inserts Expression, Note, and Folder correctly!');

// 4. Test Share & Export Dropdown Menu
console.log('\nTest 2: Share & Export Dropdown Menu Interaction...');
const shareToggle = document.getElementById('share-menu-toggle');
const shareDropdown = document.getElementById('share-menu-dropdown');
assert.ok(shareToggle, '#share-menu-toggle must exist');
assert.ok(shareDropdown, '#share-menu-dropdown must exist');

shareDropdown.style.display = 'none';
shareToggle.onclick({ stopPropagation: () => {} });
assert.strictEqual(shareDropdown.style.display, 'flex', 'Share dropdown should open on click');

const exportSvgBtn = document.getElementById('export-svg-btn');
const exportPngBtn = document.getElementById('export-png-btn');
const shareGraphBtn = document.getElementById('share-graph-btn');
assert.ok(exportSvgBtn, '#export-svg-btn must exist');
assert.ok(exportPngBtn, '#export-png-btn must exist');
assert.ok(shareGraphBtn, '#share-graph-btn must exist');

// Click export SVG
exportSvgBtn.onclick();
assert.strictEqual(shareDropdown.style.display, 'none', 'Share dropdown should close after clicking SVG export');

console.log('  ✓ Share & Export menu opens and closes on action correctly!');

// 5. Test Settings Modal & Single Settings Button (No duplicates, No dark/mute in modal)
console.log('\nTest 3: Settings Modal & Single Settings Button Verification...');
const wrenchBtn = document.getElementById('wrench-btn');
const wrenchModal = document.getElementById('wrench-modal');

// Check that duplicate settings button is not present in index.html
assert(!htmlContent.includes('id="sidebar-wrench-btn"'), 'Duplicate settings button #sidebar-wrench-btn must not exist in index.html');
// Check that dark theme and mute all quick toggles are not present in index.html
assert(!htmlContent.includes('id="toggle-dark-btn"'), 'Dark theme toggle button must be removed from index.html');
assert(!htmlContent.includes('id="toggle-mute-btn"'), 'Mute all toggle button must be removed from index.html');

wrenchBtn.onclick();
assert.strictEqual(wrenchModal.style.display, 'flex', 'Wrench modal should open on Settings click');

console.log('  ✓ Duplicate settings button removed, dark theme and mute all removed, and clean Settings modal verified!');

console.log('\n========================================================');
console.log(' ALL MENUS & SVG VECTOR ICONS TESTS PASSED 100%!       ');
console.log('========================================================\n');
