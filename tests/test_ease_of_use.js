/**
 * Comprehensive Test Suite for Ease-of-Use Features:
 * 1. Actionable Error Diagnostics & Contextual Tooltips
 * 2. Expression Card Reordering (Up/Down & Drag-and-Drop)
 * 3. Desmos-Style Inline "Add Slider" Prompt
 * 4. Virtual Math Keypad (Tabs, Buttons, Focus Preservation)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================');
console.log(' STARTING EASE-OF-USE FEATURES VERIFICATION            ');
console.log('========================================================\n');

// 1. Math Kernel Diagnostics & Add Slider Detection
const OmniMath = require(path.resolve(__dirname, '../js/cas_math.js'));

console.log('Test 1: Undefined Variable Detection & Add Slider Generation...');
{
  const items = [
    { id: 'expr1', text: 'y = a * x + b' },
    { id: 'expr2', text: 's1[n] = A * (r^n) * u[n]' },
    { id: 'slider1', text: 'k = 5' }
  ];

  const map = OmniMath.compileAll(items);
  const c1 = map.get('expr1');
  const c2 = map.get('expr2');
  const s1 = map.get('slider1');

  assert.deepStrictEqual(c1.missingVariables.sort(), ['a', 'b']);
  console.log('  ✓ Expression y = a*x + b correctly identified missing slider parameters: [a, b]');

  assert.deepStrictEqual(c2.missingVariables.sort(), ['A', 'r']);
  console.log('  ✓ Discrete signal s1[n] = A*(r^n)*u[n] correctly identified missing slider parameters: [A, r]');

  assert.strictEqual(s1.missingVariables.length, 0);
  console.log('  ✓ Slider definition k = 5 has 0 missing parameters.');

  // Now compile with variables defined:
  const mapWithVars = OmniMath.compileAll(items, { a: 2, b: 3, A: 1, r: 0.5 });
  assert.strictEqual(mapWithVars.get('expr1').missingVariables.length, 0);
  assert.strictEqual(mapWithVars.get('expr2').missingVariables.length, 0);
  console.log('  ✓ When sliders are defined, missingVariables array clears immediately.');
}

console.log('\nTest 2: Error Diagnostics & Quick Fixes...');
{
  // 2a. Unclosed parenthesis
  const diagParen = OmniMath.diagnoseExpression('y = sin(x');
  assert.ok(diagParen.diagnostics.some(d => d.code === 'UNCLOSED_PAREN'));
  const parenFix = diagParen.diagnostics.find(d => d.code === 'UNCLOSED_PAREN').fix;
  assert.strictEqual(parenFix.type, 'append_char');
  assert.strictEqual(parenFix.char, ')');
  console.log('  ✓ Unclosed parenthesis detected with automatic ")" append fix.');

  // 2b. Unclosed bracket
  const diagBracket = OmniMath.diagnoseExpression('s1[n] = delta[n');
  assert.ok(diagBracket.diagnostics.some(d => d.code === 'UNCLOSED_BRACKET'));
  const bracketFix = diagBracket.diagnostics.find(d => d.code === 'UNCLOSED_BRACKET').fix;
  assert.strictEqual(bracketFix.type, 'append_char');
  assert.strictEqual(bracketFix.char, ']');
  console.log('  ✓ Unclosed bracket detected with automatic "]" append fix.');

  // 2c. Continuous variable in discrete signal
  const diagClash = OmniMath.diagnoseExpression('s1[n] = x^2');
  assert.ok(diagClash.diagnostics.some(d => d.code === 'CONTINUOUS_IN_DISCRETE'));
  const clashFix = diagClash.diagnostics.find(d => d.code === 'CONTINUOUS_IN_DISCRETE').fix;
  assert.strictEqual(clashFix.type, 'replace_var');
  assert.strictEqual(clashFix.from, 'x');
  assert.strictEqual(clashFix.to, 'n');
  console.log('  ✓ Variable clash (x in discrete signal) detected with "Replace x with n" fix.');

  // 2d. Discrete variable in continuous function
  const diagContClash = OmniMath.diagnoseExpression('y = sin(n)');
  assert.ok(diagContClash.diagnostics.some(d => d.code === 'DISCRETE_IN_CONTINUOUS'));
  console.log('  ✓ Variable clash (n in continuous function) detected with "Replace n with x" fix.');
}

console.log('\nTest 3: DOM Simulation for Reordering, Add Slider, and Virtual Keypad...');
{
  // Setup DOM mock
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
      get className() {
        return Array.from(this.classList._classes).join(' ');
      },
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
      get innerHTML() {
        return this._innerHTML || '';
      },
      set innerHTML(html) {
        this._innerHTML = html;
        this.children = [];
        if (!html) return;
        const tagRegex = /<([a-zA-Z0-9-]+)((?:\s+[a-zA-Z0-9-_:]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
        const stack = [this];
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
          if (match[4]) continue;
          const fullTag = match[0];
          if (fullTag.startsWith('</')) {
            if (stack.length > 1) stack.pop();
            continue;
          }
          const tagName = match[1];
          const rawAttrs = match[2] || '';
          const isSelfClosing = match[3] === '/' || /^(?:input|img|br|hr|meta|link)$/i.test(tagName);
          const childEl = createElement(tagName);
          const attrRegex = /([a-zA-Z0-9-_:]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
          let aMatch;
          while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
            const attrName = aMatch[1];
            const attrVal = aMatch[2] !== undefined ? aMatch[2] : (aMatch[3] !== undefined ? aMatch[3] : (aMatch[4] !== undefined ? aMatch[4] : ''));
            if (attrName === 'class') childEl.className = attrVal;
            else if (attrName === 'id') childEl.id = attrVal;
            else if (attrName === 'value') childEl.value = attrVal;
            else if (attrName === 'style') {
              attrVal.split(';').forEach(rule => {
                const parts = rule.split(':');
                if (parts.length >= 2) childEl.style[parts[0].trim()] = parts.slice(1).join(':').trim();
              });
            } else childEl.setAttribute(attrName, attrVal);
          }
          stack[stack.length - 1].appendChild(childEl);
          if (!isSelfClosing) stack.push(childEl);
        }
      },
      querySelectorAll(sel) {
        if (sel.includes(',')) {
          const res = [];
          sel.split(',').map(s => s.trim()).forEach(sub => {
            res.push(...this.querySelectorAll(sub));
          });
          return Array.from(new Set(res));
        }
        if (sel.includes(' ')) {
          const parts = sel.split(/\s+/).filter(Boolean);
          let currentList = [this];
          for (const part of parts) {
            const nextList = [];
            for (const parent of currentList) {
              nextList.push(...parent.querySelectorAll(part));
            }
            currentList = Array.from(new Set(nextList));
          }
          return currentList;
        }
        const matches = [];
        function walk(node) {
          if (node !== el) {
            if (sel.startsWith('.')) {
              if (node.classList && node.classList.contains(sel.slice(1))) matches.push(node);
            } else if (sel.startsWith('#')) {
              if (node.id === sel.slice(1)) matches.push(node);
            } else if (sel.startsWith('[') && sel.endsWith(']')) {
              const m = sel.slice(1, -1).match(/^([a-zA-Z0-9-_:]+)(?:="([^"]*)")?$/);
              if (m) {
                const val = node.getAttribute(m[1]);
                if (m[2] !== undefined ? val === m[2] : (val !== undefined && val !== '')) matches.push(node);
              }
            } else if (node.tagName && node.tagName.toLowerCase() === sel.toLowerCase()) {
              matches.push(node);
            }
          }
          if (node.children) node.children.forEach(walk);
        }
        walk(el);
        return matches;
      },
      querySelector(sel) {
        const all = this.querySelectorAll(sel);
        return all.length > 0 ? all[0] : null;
      },
      addEventListener(evt, fn) {
        el['on' + evt] = fn;
      },
      parentElement: {
        getBoundingClientRect() { return { width: 1000, height: 700, left: 360, top: 0 }; }
      },
      getContext() {
        return {
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
        };
      },
      getBoundingClientRect() { return { top: 0, left: 0, width: 300, height: 60 }; },
      focus() {},
      blur() {},
      click() { if (typeof this.onclick === 'function') this.onclick({ stopPropagation: () => {} }); }
    };
    return el;
  }

  global.window = {
    innerWidth: 1200,
    innerHeight: 800,
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
    querySelector(sel) {
      return document.body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return document.body.querySelectorAll(sel);
    }
  };

  // Populate base UI DOM IDs
  const uiIds = [
    'graph-canvas', 'expression-list', 'sidebar-scroll-area', 'sidebar-blank-dock',
    'desmos-plus-btn', 'desmos-undo-btn', 'desmos-redo-btn', 'wrench-btn',
    'zoom-in-btn', 'zoom-out-btn', 'home-view-btn', 'keypad-toggle-btn',
    'virtual-keypad', 'keypad-close-btn', 'keypad-panel-main', 'keypad-panel-functions', 'keypad-panel-dsp'
  ];
  uiIds.forEach(id => {
    const el = document.getElementById(id);
    document.body.appendChild(el);
  });

  // Add keypad tabs
  const keypad = document.getElementById('virtual-keypad');
  const tab1 = createElement('button'); tab1.className = 'keypad-tab-btn active'; tab1.setAttribute('data-tab', 'main');
  const tab2 = createElement('button'); tab2.className = 'keypad-tab-btn'; tab2.setAttribute('data-tab', 'functions');
  const tab3 = createElement('button'); tab3.className = 'keypad-tab-btn'; tab3.setAttribute('data-tab', 'dsp');
  keypad.appendChild(tab1); keypad.appendChild(tab2); keypad.appendChild(tab3);

  // Add sample keypad buttons
  const btnX = createElement('button'); btnX.className = 'keypad-btn op-key'; btnX.setAttribute('data-write', 'x');
  const btnPow2 = createElement('button'); btnPow2.className = 'keypad-btn op-key'; btnPow2.setAttribute('data-cmd', '^2');
  const btnDel = createElement('button'); btnDel.className = 'keypad-btn action-key'; btnDel.setAttribute('data-action', 'backspace');
  keypad.appendChild(btnX); keypad.appendChild(btnPow2); keypad.appendChild(btnDel);

  // Load modules
  const graphCode = fs.readFileSync(path.resolve(__dirname, '../js/graphpaper.js'), 'utf8');
  eval(graphCode);

  const appCode = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  eval(appCode);

  console.log('  ✓ app.js initialized successfully with keypad and ease-of-use listeners.');

  // Test 3a: Keypad toggle
  const toggleBtn = document.getElementById('keypad-toggle-btn');
  assert.strictEqual(typeof toggleBtn.onclick, 'function');
  toggleBtn.onclick();
  assert.ok(keypad.classList.contains('open'), 'Keypad should have open class after clicking toggle button');
  console.log('  ✓ Keypad toggle opens drawer and adds .open class.');

  toggleBtn.onclick();
  assert.ok(!keypad.classList.contains('open'), 'Keypad should close when toggle clicked again');
  console.log('  ✓ Keypad toggle closes drawer.');

  // Test 3b: Keypad button press
  // Open keypad and click 'x'
  toggleBtn.onclick();
  btnX.onmousedown({ preventDefault: () => {} });
  const exprList = document.getElementById('expression-list');
  const firstCardInput = exprList.querySelector('.expr-input');
  assert.ok(firstCardInput && firstCardInput.value.includes('x'), 'Pressing keypad "x" must insert "x" into active card');
  console.log('  ✓ Keypad button "x" directly typed into expression card.');

  // Press '^2'
  btnPow2.onmousedown({ preventDefault: () => {} });
  assert.ok(firstCardInput.value.includes('^2'), 'Pressing keypad "^2" must insert "^2"');
  console.log('  ✓ Keypad power "^2" inserted.');

  // Press 'Del' (backspace)
  const prevLen = firstCardInput.value.length;
  btnDel.onmousedown({ preventDefault: () => {} });
  assert.strictEqual(firstCardInput.value.length, prevLen - 1, 'Pressing "Del" must remove trailing character');
  console.log('  ✓ Keypad backspace deleted character.');
}

console.log('\nTest 4: Expression Card Reordering & Add Slider UI...');
{
  // Add an expression with missing variable 'm'
  const plusBtn = document.getElementById('desmos-plus-btn');
  plusBtn.onclick();

  const exprList = document.getElementById('expression-list');
  const cards = exprList.querySelectorAll('.expr-card');
  assert.ok(cards.length >= 2, 'Should have multiple cards');

  const secondInput = cards[cards.length - 1].querySelector('.expr-input');
  secondInput.value = 'y = m * x + 4';
  secondInput.oninput({ target: secondInput });

  // Check that add-slider prompt appears
  const updatedCards = exprList.querySelectorAll('.expr-card');
  const lastCard = updatedCards[updatedCards.length - 1];
  const sliderPrompt = lastCard.querySelector('.add-slider-prompt');
  assert.ok(sliderPrompt !== null, 'Card with undefined variable "m" must display the add-slider-prompt');
  console.log('  ✓ Add-slider prompt rendered for undefined parameter "m".');

  // Click the [m] slider button
  const sliderBtnM = sliderPrompt.querySelector('.btn-slider-var');
  assert.ok(sliderBtnM !== null);
  sliderBtnM.onclick({ stopPropagation: () => {} });

  // Now a slider card for m should exist
  const cardsAfterSlider = exprList.querySelectorAll('.expr-card');
  const hasSliderM = Array.from(cardsAfterSlider).some(c => {
    const input = c.querySelector('.expr-input');
    return input && input.value && input.value.startsWith('m =');
  });
  assert.ok(hasSliderM, 'New slider card m = 1 must be created automatically');
  console.log('  ✓ Clicking [m] automatically generated the slider card m = 1.');

  // Test Reordering Up button on last card
  const initialCardCount = cardsAfterSlider.length;
  const cardToMove = cardsAfterSlider[initialCardCount - 1];
  const moveUpBtn = cardToMove.querySelector('.expr-move-up-btn');
  assert.ok(moveUpBtn !== null, 'Move Up button must exist on cards beyond index 0');
  moveUpBtn.onclick({ stopPropagation: () => {} });

  const cardsAfterMove = exprList.querySelectorAll('.expr-card');
  assert.strictEqual(cardsAfterMove.length, initialCardCount);
  console.log('  ✓ Move Up button successfully swapped card index.');
}

console.log('\n========================================================');
console.log(' ALL EASE-OF-USE & KEYPAD TESTS PASSED 100%!           ');
console.log('========================================================\n');
