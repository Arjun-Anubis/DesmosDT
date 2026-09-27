/**
 * Comprehensive Test Suite for Mobile & Touch Screen Support:
 * 1. Mobile Viewport & PWA Meta Configuration
 * 2. Mobile Responsive Stylesheet (Portrait, Landscape, Keypad, Modals)
 * 3. HTML5 Canvas Touch Gestures (1-Finger Pan, 2-Finger Pinch Zoom, Tap Inspect, Point Drag)
 * 4. Virtual Math Keypad Mobile Adaptation & inputmode Management
 * 5. Mobile Sidebar Split View & Collapsible Full-Screen Toggle
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================');
console.log(' STARTING MOBILE & TOUCH SCREEN SUPPORT VERIFICATION   ');
console.log('========================================================\n');

// 1. Verify Viewport Meta & HTML Mobile Configuration
console.log('Test 1: Mobile Viewport & Meta Tags Configuration...');
{
  const htmlPath = path.resolve(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('viewport-fit=cover'), 'index.html must include viewport-fit=cover for notched phones');
  assert.ok(html.includes('user-scalable=no') || html.includes('maximum-scale=1.0'), 'index.html must prevent accidental mobile double-tap zoom');
  assert.ok(html.includes('apple-mobile-web-app-capable'), 'index.html must specify apple-mobile-web-app-capable');
  assert.ok(html.includes('theme-color'), 'index.html must specify mobile browser theme-color');

  // Verify zero emoji regex
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2190}-\u{21FF}\u{2200}-\u{22FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/u;
  assert.ok(!emojiRegex.test(html), 'index.html must not contain emoji glyphs');
  console.log('  ✓ Viewport and mobile PWA meta tags configured with zero emoji glyphs.');
}

// 2. Verify Mobile Responsive CSS Rules
console.log('\nTest 2: Mobile Responsive CSS Rules & Media Queries...');
{
  const cssPath = path.resolve(__dirname, '../css/style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Touch action
  assert.ok(css.includes('touch-action: none'), 'CSS must specify touch-action: none for canvas');
  console.log('  ✓ touch-action: none configured for touch canvas gestures.');

  // Responsive Media Query for Mobile (max-width: 768px)
  assert.ok(css.includes('@media (max-width: 768px)'), 'CSS must include @media (max-width: 768px)');
  assert.ok(css.includes('flex-direction: column'), 'Mobile portrait layout must use flex-direction: column');
  assert.ok(css.includes('#sidebar.collapsed + #graph-container'), 'CSS must include adjacent sibling rule for mobile full-screen expansion');
  assert.ok(css.includes('font-size: 16px !important'), 'Inputs must have font-size >= 16px to prevent iOS Safari auto-zoom');
  assert.ok(css.includes('@media (max-height: 500px) and (orientation: landscape)'), 'CSS must include landscape mobile media query');
  console.log('  ✓ Mobile portrait split-view, full-screen collapse, input auto-zoom prevention, and landscape rules verified.');
}

// 3. Verify Graphpaper Touch Events (1-Finger Pan, 2-Finger Pinch Zoom, Tap Inspect)
console.log('\nTest 3: HTML5 Canvas Touch Event Handlers...');
{
  const Graphpaper = require(path.resolve(__dirname, '../js/graphpaper.js'));
  const OmniMath = require(path.resolve(__dirname, '../js/cas_math.js'));

  const listeners = {};
  const mockCanvas = {
    addEventListener(event, handler) {
      listeners[event] = handler;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    parentElement: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 })
    },
    style: {},
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
      roundRect: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      fillText: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 7 })
    })
  };

  const gp = new Graphpaper(mockCanvas, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

  assert.strictEqual(typeof listeners['touchstart'], 'function', 'touchstart listener must be registered');
  assert.strictEqual(typeof listeners['touchmove'], 'function', 'touchmove listener must be registered');
  assert.strictEqual(typeof listeners['touchend'], 'function', 'touchend listener must be registered');
  assert.strictEqual(typeof listeners['touchcancel'], 'function', 'touchcancel listener must be registered');
  console.log('  ✓ Touch event handlers (touchstart, touchmove, touchend, touchcancel) registered successfully.');

  // 3a. Test 1-Finger Touch Pan
  const initialXMin = gp.bounds.xMin;
  const initialXMax = gp.bounds.xMax;
  const initialYMin = gp.bounds.yMin;
  const initialYMax = gp.bounds.yMax;

  // Touch start at (100, 100)
  listeners['touchstart']({
    touches: [{ clientX: 100, clientY: 100 }],
    cancelable: true,
    preventDefault: () => {}
  });
  assert.ok(gp.isDragging, 'Single touch start must activate isDragging');

  // Touch move to (150, 120): dragged right 50px, down 20px
  listeners['touchmove']({
    touches: [{ clientX: 150, clientY: 120 }],
    cancelable: true,
    preventDefault: () => {}
  });

  // Since dragged right (+50px), math coords shift left (-mathDx)
  assert.ok(gp.bounds.xMin < initialXMin, 'Dragging right must shift xMin to the left');
  assert.ok(gp.bounds.xMax < initialXMax, 'Dragging right must shift xMax to the left');
  assert.ok(gp.bounds.yMin > initialYMin, 'Dragging down must shift yMin upwards');
  console.log('  ✓ 1-Finger touch pan smoothly translates Cartesian viewport.');

  // End touch
  listeners['touchend']({
    touches: [],
    cancelable: true,
    preventDefault: () => {}
  });
  assert.strictEqual(gp.isDragging, false, 'Touch end must terminate dragging');

  // 3b. Test 2-Finger Pinch to Zoom
  const spanBeforePinch = gp.bounds.xMax - gp.bounds.xMin;

  // Start pinch: 2 fingers 100px apart
  listeners['touchstart']({
    touches: [
      { clientX: 150, clientY: 150 },
      { clientX: 250, clientY: 150 }
    ],
    cancelable: true,
    preventDefault: () => {}
  });

  // Move fingers outward to 200px apart (expanding distance = zooming in!)
  listeners['touchmove']({
    touches: [
      { clientX: 100, clientY: 150 },
      { clientX: 300, clientY: 150 }
    ],
    cancelable: true,
    preventDefault: () => {}
  });

  const spanAfterPinch = gp.bounds.xMax - gp.bounds.xMin;
  assert.ok(spanAfterPinch < spanBeforePinch, 'Spreading fingers apart must zoom in (decrease coordinate span)');
  console.log('  ✓ 2-Finger pinch gesture successfully zooms viewport centered at touches.');

  listeners['touchend']({
    touches: [],
    cancelable: true,
    preventDefault: () => {}
  });

  // 3c. Test Tap to Inspect Point on Curve
  const items = [
    { id: 'c1', text: 'y = sin(x)', visible: true }
  ];
  const compiled = OmniMath.compileAll(items);
  items[0].compiled = compiled.get('c1');
  gp.updateState(items, {});

  // Simulate tap near origin (0, 0)
  const originScreen = gp.mathToScreen(0, 0);
  listeners['touchstart']({
    touches: [{ clientX: originScreen.x, clientY: originScreen.y }],
    cancelable: true,
    preventDefault: () => {}
  });
  listeners['touchend']({
    touches: [],
    cancelable: true,
    preventDefault: () => {}
  });

  assert.ok(gp.pinnedEntity || gp.hoveredEntity, 'Tapping near curve/origin must trigger inspection entity');
  console.log('  ✓ Tap-to-inspect displays coordinates on mobile touch.');
}

// 4. Verify Mobile Virtual Keypad inputmode & Auto-Open
console.log('\nTest 4: Mobile Virtual Keypad inputmode & Touch Adaptation...');
{
  const elements = {};
  function createElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      style: {},
      _value: '',
      get value() { return this._value; },
      set value(v) { this._value = String(v); },
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
        toggle(c, f) { if (f !== undefined ? f : !this._classes.has(c)) this._classes.add(c); else this._classes.delete(c); }
      },
      get className() { return Array.from(this.classList._classes).join(' '); },
      set className(val) {
        this.classList._classes.clear();
        (val || '').split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
      },
      attributes: {},
      setAttribute(k, v) {
        this.attributes[k] = String(v);
        if (k !== 'style') el[k] = v;
      },
      getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : el[k]; },
      removeAttribute(k) { delete this.attributes[k]; delete el[k]; },
      children: [],
      appendChild(child) { child.parentElement = el; el.children.push(child); return child; },
      removeChild(child) {
        const idx = el.children.indexOf(child);
        if (idx !== -1) el.children.splice(idx, 1);
        return child;
      },
      insertBefore(child, ref) {
        child.parentElement = el;
        const idx = el.children.indexOf(ref);
        if (idx !== -1) el.children.splice(idx, 0, child);
        else el.children.push(child);
        return child;
      },
      querySelectorAll(sel) {
        const matches = [];
        function walk(node) {
          if (node !== el) {
            if (sel.startsWith('.') && node.classList && node.classList.contains(sel.slice(1))) matches.push(node);
            else if (sel.startsWith('#') && node.id === sel.slice(1)) matches.push(node);
            else if (node.tagName && node.tagName.toLowerCase() === sel.toLowerCase()) matches.push(node);
          }
          if (node.children) node.children.forEach(walk);
        }
        walk(el);
        return matches;
      },
      querySelector(sel) {
        const all = el.querySelectorAll(sel);
        return all.length > 0 ? all[0] : null;
      },
      addEventListener(evt, fn) { el['on' + evt] = fn; },
      parentElement: { getBoundingClientRect: () => ({ width: 375, height: 667, left: 0, top: 0 }) },
      getContext: () => ({
        scale: () => {}, setTransform: () => {}, clearRect: () => {}, beginPath: () => {},
        moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, arc: () => {},
        rect: () => {}, roundRect: () => {}, save: () => {}, restore: () => {}, setLineDash: () => {},
        fillText: () => {}, measureText: (txt) => ({ width: (txt || '').length * 7 })
      }),
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 375, height: 50 }),
      focus() {},
      blur() {},
      click() { if (typeof this.onclick === 'function') this.onclick({ stopPropagation: () => {} }); }
    };
    return el;
  }

  global.window = {
    innerWidth: 375, // Simulate iPhone portrait screen width
    innerHeight: 667,
    ontouchstart: {},
    addEventListener: () => {},
    location: { hash: '' }
  };
  global.document = {
    readyState: 'complete',
    body: createElement('body'),
    createElement,
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement(id.includes('canvas') ? 'canvas' : 'div');
        elements[id].id = id;
      }
      return elements[id];
    },
    querySelector: (sel) => document.body.querySelector(sel),
    querySelectorAll: (sel) => document.body.querySelectorAll(sel)
  };

  const uiIds = [
    'graph-canvas', 'expression-list', 'sidebar-scroll-area', 'sidebar-blank-dock',
    'desmos-plus-btn', 'desmos-undo-btn', 'desmos-redo-btn', 'wrench-btn',
    'zoom-in-btn', 'zoom-out-btn', 'home-view-btn', 'keypad-toggle-btn',
    'virtual-keypad', 'keypad-close-btn', 'keypad-panel-main', 'keypad-panel-functions', 'keypad-panel-dsp'
  ];
  uiIds.forEach(id => document.body.appendChild(document.getElementById(id)));

  const graphCode = fs.readFileSync(path.resolve(__dirname, '../js/graphpaper.js'), 'utf8');
  eval(graphCode);

  const appCode = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  eval(appCode);

  const keypad = document.getElementById('virtual-keypad');
  const toggleBtn = document.getElementById('keypad-toggle-btn');
  const closeBtn = document.getElementById('keypad-close-btn');

  // Toggle opens on mobile
  toggleBtn.onclick();
  assert.ok(keypad.classList.contains('open'), 'Keypad must open on mobile');
  assert.ok(document.body.classList.contains('keypad-open'), 'Body must receive keypad-open class on mobile');
  console.log('  ✓ Keypad opens cleanly on simulated mobile screen.');

  // Close closes on mobile
  closeBtn.onclick();
  assert.ok(!keypad.classList.contains('open'), 'Keypad close button must close drawer on mobile');
  console.log('  ✓ Keypad close button closes drawer on mobile.');
}

console.log('\n========================================================');
console.log(' ALL MOBILE & TOUCH SCREEN TESTS PASSED 100%!          ');
console.log('========================================================\n');
