/**
 * DesmosDT - Injected Main-World Script
 * Runs directly in the Desmos calculator page context.
 * Provides:
 * 1. High-Performance Canvas Overlay for Discrete-Time Stem Plots (60 FPS)
 * 2. Symbolic Computer Algebra System (CAS) Coprocessor
 * 3. Line & Marker Styling System (Color, Dash, Dots, Marker Shapes, Baseline)
 * 4. "Bake to Desmos" (Vanilla URL sharing)
 * 5. Modern Clean Desmos-Styled UI
 */

(function() {
  'use strict';

  console.log('[DesmosDT] Core runtime starting...');

  // Avoid multiple injections
  if (window.__DESMOS_DT_INITIALIZED__) {
    console.log('[DesmosDT] Already initialized.');
    return;
  }
  window.__DESMOS_DT_INITIALIZED__ = true;

  // --- EMBEDDED SYMBOLIC CAS ENGINE ---
  const CAS = (function() {
    function tokenize(str) {
      const tokens = [];
      let i = 0;
      str = (str || '').replace(/\s+/g, '');
      while (i < str.length) {
        const ch = str[i];
        if (/[0-9]/.test(ch)) {
          let num = '';
          while (i < str.length && /[0-9.]/.test(str[i])) num += str[i++];
          tokens.push({ type: 'NUM', val: parseFloat(num) });
        } else if (/[a-zA-Z]/.test(ch)) {
          let name = '';
          while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) name += str[i++];
          tokens.push({ type: 'VAR', val: name });
        } else if ('+-*/^()=,'.includes(ch)) {
          tokens.push({ type: 'OP', val: ch });
          i++;
        } else {
          i++;
        }
      }
      return tokens;
    }

    function num(val) { return { type: 'num', val: Number(val) }; }
    function sym(name) { return { type: 'sym', name: name }; }
    function op(fn, args) { return { type: 'op', fn: fn, args: args }; }

    function parse(exprStr) {
      if (!exprStr) return num(0);
      const tokens = tokenize(exprStr);
      let pos = 0;
      function peek() { return tokens[pos]; }
      function consume() { return tokens[pos++]; }

      function parseEquation() {
        let left = parseAddSub();
        if (peek() && peek().val === '=') {
          consume();
          let right = parseAddSub();
          return op('-', [left, right]);
        }
        return left;
      }
      function parseAddSub() {
        let node = parseMulDiv();
        while (peek() && (peek().val === '+' || peek().val === '-')) {
          let oper = consume().val;
          let right = parseMulDiv();
          node = op(oper, [node, right]);
        }
        return node;
      }
      function parseMulDiv() {
        let node = parseUnary();
        while (peek() && (peek().val === '*' || peek().val === '/')) {
          let oper = consume().val;
          let right = parseUnary();
          node = op(oper, [node, right]);
        }
        return node;
      }
      function parseUnary() {
        if (peek() && peek().val === '-') {
          consume();
          return op('*', [num(-1), parsePower()]);
        }
        if (peek() && peek().val === '+') consume();
        return parsePower();
      }
      function parsePower() {
        let node = parseAtom();
        if (peek() && peek().val === '^') {
          consume();
          return op('^', [node, parseUnary()]);
        }
        return node;
      }
      function parseAtom() {
        let t = peek();
        if (!t) return num(0);
        if (t.type === 'NUM') {
          consume();
          return num(t.val);
        }
        if (t.val === '(') {
          consume();
          let node = parseEquation();
          if (peek() && peek().val === ')') consume();
          return node;
        }
        if (t.type === 'VAR') {
          consume();
          const funcName = t.val.toLowerCase();
          if (peek() && peek().val === '(') {
            consume();
            const args = [];
            if (peek() && peek().val !== ')') {
              args.push(parseEquation());
              while (peek() && peek().val === ',') {
                consume();
                args.push(parseEquation());
              }
            }
            if (peek() && peek().val === ')') consume();
            return op(funcName, args);
          }
          return sym(t.val);
        }
        return num(0);
      }
      return parseEquation();
    }

    function simplify(node) {
      if (!node) return num(0);
      if (node.type === 'num' || node.type === 'sym') return node;
      const args = node.args.map(simplify);
      const fn = node.fn;

      if (args.every(a => a.type === 'num')) {
        const v = args.map(a => a.val);
        if (fn === '+') return num(v[0] + v[1]);
        if (fn === '-') return num(v[0] - v[1]);
        if (fn === '*') return num(v[0] * v[1]);
        if (fn === '/') return v[1] !== 0 ? num(v[0] / v[1]) : op('/', args);
        if (fn === '^') return num(Math.pow(v[0], v[1]));
        if (fn === 'sin') return num(Math.sin(v[0]));
        if (fn === 'cos') return num(Math.cos(v[0]));
        if (fn === 'exp') return num(Math.exp(v[0]));
        if (fn === 'ln' || fn === 'log') return num(Math.log(v[0]));
        if (fn === 'sqrt') return num(Math.sqrt(v[0]));
      }

      if (fn === '+') {
        if (args[0].type === 'num' && args[0].val === 0) return args[1];
        if (args[1].type === 'num' && args[1].val === 0) return args[0];
        if (args[0].type === 'num' && args[1].type === 'num') return num(args[0].val + args[1].val);
      }
      if (fn === '-') {
        if (args[1].type === 'num' && args[1].val === 0) return args[0];
      }
      if (fn === '*') {
        if ((args[0].type === 'num' && args[0].val === 0) || (args[1].type === 'num' && args[1].val === 0)) return num(0);
        if (args[0].type === 'num' && args[0].val === 1) return args[1];
        if (args[1].type === 'num' && args[1].val === 1) return args[0];
      }
      if (fn === '/') {
        if (args[0].type === 'num' && args[0].val === 0) return num(0);
        if (args[1].type === 'num' && args[1].val === 1) return args[0];
      }
      if (fn === '^') {
        if (args[1].type === 'num' && args[1].val === 0) return num(1);
        if (args[1].type === 'num' && args[1].val === 1) return args[0];
      }
      return op(fn, args);
    }

    function diff(node, wrt = 'x') {
      if (typeof node === 'string') node = parse(node);
      if (!node) return num(0);
      if (node.type === 'num') return num(0);
      if (node.type === 'sym') return node.name === wrt ? num(1) : num(0);

      const fn = node.fn, args = node.args;
      if (fn === '+') return simplify(op('+', [diff(args[0], wrt), diff(args[1], wrt)]));
      if (fn === '-') return simplify(op('-', [diff(args[0], wrt), diff(args[1], wrt)]));
      if (fn === '*') {
        return simplify(op('+', [
          op('*', [diff(args[0], wrt), args[1]]),
          op('*', [args[0], diff(args[1], wrt)])
        ]));
      }
      if (fn === '/') {
        return simplify(op('/', [
          op('-', [op('*', [diff(args[0], wrt), args[1]]), op('*', [args[0], diff(args[1], wrt)])]),
          op('^', [args[1], num(2)])
        ]));
      }
      if (fn === '^') {
        if (args[1].type === 'num') {
          return simplify(op('*', [
            num(args[1].val),
            op('*', [op('^', [args[0], num(args[1].val - 1)]), diff(args[0], wrt)])
          ]));
        }
      }
      if (fn === 'sin') return simplify(op('*', [op('cos', [args[0]]), diff(args[0], wrt)]));
      if (fn === 'cos') return simplify(op('*', [op('*', [num(-1), op('sin', [args[0]])]), diff(args[0], wrt)]));
      if (fn === 'exp') return simplify(op('*', [node, diff(args[0], wrt)]));
      if (fn === 'ln' || fn === 'log') return simplify(op('/', [diff(args[0], wrt), args[0]]));
      return num(0);
    }

    function integrate(node, wrt = 'x') {
      if (typeof node === 'string') node = parse(node);
      node = simplify(node);
      if (node.type === 'num') return op('*', [node, sym(wrt)]);
      if (node.type === 'sym') {
        if (node.name === wrt) return op('/', [op('^', [sym(wrt), num(2)]), num(2)]);
        return op('*', [node, sym(wrt)]);
      }
      const fn = node.fn, args = node.args;
      if (fn === '+') return simplify(op('+', [integrate(args[0], wrt), integrate(args[1], wrt)]));
      if (fn === '-') return simplify(op('-', [integrate(args[0], wrt), integrate(args[1], wrt)]));
      if (fn === '*') {
        if (args[0].type === 'num') return simplify(op('*', [args[0], integrate(args[1], wrt)]));
        if (args[1].type === 'num') return simplify(op('*', [args[1], integrate(args[0], wrt)]));
      }
      if (fn === '^' && args[0].type === 'sym' && args[0].name === wrt && args[1].type === 'num') {
        const p = args[1].val;
        if (p === -1) return op('ln', [sym(wrt)]);
        return op('/', [op('^', [sym(wrt), num(p + 1)]), num(p + 1)]);
      }
      if (fn === 'sin' && args[0].type === 'sym' && args[0].name === wrt) return op('*', [num(-1), op('cos', [sym(wrt)])]);
      if (fn === 'cos' && args[0].type === 'sym' && args[0].name === wrt) return op('sin', [sym(wrt)]);
      if (fn === 'exp' && args[0].type === 'sym' && args[0].name === wrt) return op('exp', [sym(wrt)]);
      return op('int', [node, sym(wrt)]);
    }

    function solve(equationStr, wrt = 'x') {
      const ast = parse(equationStr);
      function evaluate(n, val) {
        if (n.type === 'num') return n.val;
        if (n.type === 'sym') return n.name === wrt ? val : 1;
        const a = n.args.map(arg => evaluate(arg, val));
        switch (n.fn) {
          case '+': return a[0] + a[1];
          case '-': return a[0] - a[1];
          case '*': return a[0] * a[1];
          case '/': return a[1] !== 0 ? a[0] / a[1] : NaN;
          case '^': return Math.pow(a[0], a[1]);
          case 'sin': return Math.sin(a[0]);
          case 'cos': return Math.cos(a[0]);
          case 'exp': return Math.exp(a[0]);
          default: return 0;
        }
      }
      const c = evaluate(ast, 0);
      const f1 = evaluate(ast, 1);
      const fm1 = evaluate(ast, -1);
      const a = (f1 + fm1 - 2 * c) / 2;
      const b = (f1 - fm1) / 2;

      if (Math.abs(a) > 1e-9) {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          return [Number(((-b + Math.sqrt(disc)) / (2 * a)).toFixed(4)), Number(((-b - Math.sqrt(disc)) / (2 * a)).toFixed(4))];
        } else {
          const re = (-b / (2 * a)).toFixed(3);
          const im = (Math.sqrt(-disc) / (2 * a)).toFixed(3);
          return [`${re} ± ${im}i`];
        }
      } else if (Math.abs(b) > 1e-9) {
        return [Number((-c / b).toFixed(4))];
      }
      return ['No closed-form solution'];
    }

    function taylor(exprStr, wrt = 'x', x0 = 0, order = 4) {
      let current = parse(exprStr);
      let terms = [];
      function evalAt(n, val) {
        if (n.type === 'num') return n.val;
        if (n.type === 'sym') return n.name === wrt ? val : 0;
        const a = n.args.map(arg => evalAt(arg, val));
        switch (n.fn) {
          case '+': return a[0] + a[1];
          case '-': return a[0] - a[1];
          case '*': return a[0] * a[1];
          case '/': return a[1] !== 0 ? a[0] / a[1] : 0;
          case '^': return Math.pow(a[0], a[1]);
          case 'sin': return Math.sin(a[0]);
          case 'cos': return Math.cos(a[0]);
          default: return 0;
        }
      }
      let fact = 1;
      for (let n = 0; n <= order; n++) {
        if (n > 0) fact *= n;
        const val = evalAt(current, x0);
        if (Math.abs(val) > 1e-7) {
          const coeff = Number((val / fact).toFixed(4));
          const term = n === 0 ? `${coeff}` : (n === 1 ? `${coeff}${wrt}` : `${coeff}${wrt}^{${n}}`);
          terms.push(term);
        }
        current = diff(current, wrt);
      }
      return terms.join(' + ').replace(/\+\s*-/g, '- ') || '0';
    }

    function toLatex(node) {
      if (!node) return '0';
      if (node.type === 'num') return `${node.val}`;
      if (node.type === 'sym') return node.name;
      const fn = node.fn, args = node.args;
      if (fn === '+') return `${toLatex(args[0])} + ${toLatex(args[1])}`;
      if (fn === '-') return `${toLatex(args[0])} - ${toLatex(args[1])}`;
      if (fn === '*') {
        if (args[0].type === 'num' && args[0].val === -1) return `-${toLatex(args[1])}`;
        return `${toLatex(args[0])} \\cdot ${toLatex(args[1])}`;
      }
      if (fn === '/') return `\\frac{${toLatex(args[0])}}{${toLatex(args[1])}}`;
      if (fn === '^') return `{${toLatex(args[0])}}^{${toLatex(args[1])}}`;
      if (fn === 'sin') return `\\sin\\left(${toLatex(args[0])}\\right)`;
      if (fn === 'cos') return `\\cos\\left(${toLatex(args[0])}\\right)`;
      if (fn === 'exp') return `e^{${toLatex(args[0])}}`;
      if (fn === 'ln' || fn === 'log') return `\\ln\\left(${toLatex(args[0])}\\right)`;
      return `${fn}(${args.map(toLatex).join(', ')})`;
    }

    function evaluateDiscreteSignal(exprStr, nMin = -10, nMax = 10, recurrence = null) {
      const samples = new Map();
      if (recurrence && recurrence.enabled) {
        const hist = new Map();
        if (recurrence.init) {
          for (let k in recurrence.init) hist.set(parseInt(k, 10), recurrence.init[k]);
        }
        for (let n = nMin; n <= nMax; n++) {
          if (hist.has(n)) {
            samples.set(n, hist.get(n));
            continue;
          }
          const y1 = hist.get(n - 1) || 0;
          const y2 = hist.get(n - 2) || 0;
          const x_n = (n >= 0) ? 1 : 0;
          const v = (recurrence.a1 || 0) * y1 + (recurrence.a2 || 0) * y2 + (recurrence.b0 || 1) * x_n;
          hist.set(n, v);
          samples.set(n, v);
        }
        return samples;
      }

      const context = {
        delta: (n) => (n === 0 ? 1 : 0),
        u: (n) => (n >= 0 ? 1 : 0),
        r: (n) => (n >= 0 ? n : 0),
        rect: (n, N = 2) => (Math.abs(n) <= N ? 1 : 0),
        sinc: (n) => (n === 0 ? 1 : Math.sin(Math.PI * n) / (Math.PI * n)),
        sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp,
        log: Math.log, sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow,
        pi: Math.PI, PI: Math.PI, e: Math.E
      };

      let code = (exprStr || '0')
        .replace(/delta\[([^\]]+)\]/g, 'delta($1)')
        .replace(/u\[([^\]]+)\]/g, 'u($1)')
        .replace(/r\[([^\]]+)\]/g, 'r($1)')
        .replace(/rect\[([^\]]+)\]/g, 'rect($1)')
        .replace(/\^/g, '**');

      let fn;
      try {
        fn = new Function('n', 'context', `with(context){ return ${code}; }`);
      } catch (e) {
        return samples;
      }

      for (let n = nMin; n <= nMax; n++) {
        try {
          const val = fn(n, context);
          samples.set(n, (typeof val === 'number' && isFinite(val)) ? val : 0);
        } catch (e) {
          samples.set(n, 0);
        }
      }
      return samples;
    }

    return {
      diff: (e, w) => toLatex(simplify(diff(parse(e), w))),
      integrate: (e, w) => toLatex(simplify(integrate(parse(e), w))),
      solve,
      taylor,
      evaluateDiscreteSignal
    };
  })();

  // --- STATE MANAGEMENT ---
  const state = {
    signals: [
      {
        id: 'sig_1',
        name: 'x[n] (Exponential Step)',
        expr: '0.7^n * u[n]',
        enabled: true,
        color: '#2d70b3', // Desmos Blue
        lineWidth: 2.5,
        lineStyle: 'solid', // solid, dashed, dotted
        markerShape: 'circle-filled', // circle-filled, circle-hollow, cross, arrow, square
        markerRadius: 5,
        baseline: 0,
        nMin: -5,
        nMax: 15,
        recurrence: { enabled: false, a1: 0.5, a2: 0, b0: 1, init: { '-1': 0 } }
      }
    ],
    hoveredSample: null,
    panelOpen: true,
    activeTab: 'signals' // signals, cas, presets
  };

  // --- CANVAS OVERLAY CONTROLLER ---
  let overlayCanvas = null;
  let overlayCtx = null;
  let desmosGraphOuter = null;

  function initOverlay() {
    desmosGraphOuter = document.querySelector('.dcg-graph-outer');
    if (!desmosGraphOuter) {
      setTimeout(initOverlay, 200);
      return;
    }

    // Create Canvas if not already present
    overlayCanvas = document.getElementById('desmos-dt-overlay');
    if (!overlayCanvas) {
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.id = 'desmos-dt-overlay';
      overlayCanvas.className = 'desmos-dt-canvas';
      desmosGraphOuter.appendChild(overlayCanvas);

      overlayCtx = overlayCanvas.getContext('2d');
    }

    resizeOverlay();
    window.addEventListener('resize', resizeOverlay);

    // Track mouse for hover tooltips
    overlayCanvas.addEventListener('mousemove', onMouseMove);
    overlayCanvas.addEventListener('mouseleave', () => {
      state.hoveredSample = null;
      render();
    });

    // Hook into Desmos Viewport Changes
    if (window.Calc && window.Calc.observe) {
      window.Calc.observe('graphpaperBounds', render);
    }

    render();
  }

  function resizeOverlay() {
    if (!overlayCanvas || !desmosGraphOuter) return;
    const rect = desmosGraphOuter.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    overlayCanvas.width = rect.width * dpr;
    overlayCanvas.height = rect.height * dpr;
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;

    if (overlayCtx) {
      overlayCtx.scale(dpr, dpr);
    }
    render();
  }

  function mathToScreen(x, y, bounds, width, height) {
    const px = ((x - bounds.left) / (bounds.right - bounds.left)) * width;
    const py = ((bounds.top - y) / (bounds.top - bounds.bottom)) * height;
    return { x: px, y: py };
  }

  function screenToMath(px, py, bounds, width, height) {
    const x = bounds.left + (px / width) * (bounds.right - bounds.left);
    const y = bounds.top - (py / height) * (bounds.top - bounds.bottom);
    return { x, y };
  }

  // --- 60 FPS RENDER LOOP ---
  function render() {
    if (!overlayCtx || !overlayCanvas || !window.Calc || !window.Calc.graphpaperBounds) return;

    const bounds = window.Calc.graphpaperBounds.mathCoordinates;
    const width = parseFloat(overlayCanvas.style.width) || overlayCanvas.width;
    const height = parseFloat(overlayCanvas.style.height) || overlayCanvas.height;

    overlayCtx.clearRect(0, 0, width, height);

    state.signals.forEach(sig => {
      if (!sig.enabled) return;

      const samples = CAS.evaluateDiscreteSignal(sig.expr, sig.nMin, sig.nMax, sig.recurrence);
      const basePt = mathToScreen(0, sig.baseline, bounds, width, height);
      const yZeroPx = basePt.y;

      overlayCtx.strokeStyle = sig.color;
      overlayCtx.lineWidth = sig.lineWidth;

      // Set Dash Style
      if (sig.lineStyle === 'dashed') {
        overlayCtx.setLineDash([6, 4]);
      } else if (sig.lineStyle === 'dotted') {
        overlayCtx.setLineDash([2, 3]);
      } else {
        overlayCtx.setLineDash([]);
      }

      // Draw Stems
      samples.forEach((val, n) => {
        if (n < bounds.left - 1 || n > bounds.right + 1) return;

        const pt = mathToScreen(n, val, bounds, width, height);

        // Vertical stem line
        overlayCtx.beginPath();
        overlayCtx.moveTo(pt.x, yZeroPx);
        overlayCtx.lineTo(pt.x, pt.y);
        overlayCtx.stroke();

        // Draw Marker
        drawMarker(overlayCtx, pt.x, pt.y, val, sig);
      });
    });

    // Draw Hover Tooltip if sample hovered
    if (state.hoveredSample) {
      drawTooltip(overlayCtx, state.hoveredSample, width, height);
    }
  }

  function drawMarker(ctx, px, py, val, sig) {
    const r = sig.markerRadius || 5;
    ctx.save();
    ctx.setLineDash([]); // Marker borders are always solid

    if (sig.markerShape === 'circle-filled') {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 2 * Math.PI);
      ctx.fillStyle = sig.color;
      ctx.fill();
    } else if (sig.markerShape === 'circle-hollow') {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = sig.lineWidth || 2;
      ctx.stroke();
    } else if (sig.markerShape === 'cross') {
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = sig.lineWidth || 2;
      ctx.stroke();
    } else if (sig.markerShape === 'arrow') {
      // Impulse arrow pointing up or down
      const arrowLen = r * 2.2;
      const dir = val >= 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - r, py - dir * r);
      ctx.moveTo(px, py);
      ctx.lineTo(px + r, py - dir * r);
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = (sig.lineWidth || 2) + 0.5;
      ctx.stroke();
    } else if (sig.markerShape === 'square') {
      ctx.beginPath();
      ctx.rect(px - r, py - r, 2 * r, 2 * r);
      ctx.fillStyle = sig.color;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTooltip(ctx, sample, width, height) {
    const { px, py, n, val, sigName, color } = sample;

    // Halo around hovered marker
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Tooltip Card
    const text = `n = ${n}, y = ${Number(val.toFixed(4))}`;
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = ctx.measureText(text);
    const boxW = textMetrics.width + 24;
    const boxH = 28;
    let boxX = px + 12;
    let boxY = py - 35;

    // Boundary check
    if (boxX + boxW > width) boxX = px - boxW - 12;
    if (boxY < 10) boxY = py + 15;

    // Pill background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(23, 23, 23, 0.92)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.restore();

    // Tooltip Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, boxX + 12, boxY + 18);
  }

  function onMouseMove(e) {
    if (!window.Calc || !window.Calc.graphpaperBounds) return;
    const bounds = window.Calc.graphpaperBounds.mathCoordinates;
    const rect = overlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = parseFloat(overlayCanvas.style.width) || overlayCanvas.width;
    const height = parseFloat(overlayCanvas.style.height) || overlayCanvas.height;

    let closest = null;
    let minDistance = 16; // Max pixel detection radius

    state.signals.forEach(sig => {
      if (!sig.enabled) return;
      const samples = CAS.evaluateDiscreteSignal(sig.expr, sig.nMin, sig.nMax, sig.recurrence);
      samples.forEach((val, n) => {
        const pt = mathToScreen(n, val, bounds, width, height);
        const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { px: pt.x, py: pt.y, n, val, sigName: sig.name, color: sig.color };
        }
      });
    });

    state.hoveredSample = closest;
    render();
  }

  // --- "BAKE TO DESMOS" (VANILLA EXPORT PIPELINE) ---
  function bakeToDesmos(signalId) {
    if (!window.Calc) return;
    const sig = state.signals.find(s => s.id === signalId);
    if (!sig) return;

    const samples = CAS.evaluateDiscreteSignal(sig.expr, sig.nMin, sig.nMax, sig.recurrence);
    const nList = [];
    const yList = [];

    samples.forEach((val, n) => {
      nList.push(n);
      yList.push(Number(val.toFixed(4)));
    });

    const prefix = `dt_${sig.id}`;
    // 1. Points
    const ptExpr = {
      id: `${prefix}_pts`,
      latex: `P_{${sig.id}} = [(${nList.map((n, i) => `${n}, ${yList[i]}`).join('), (')})]`,
      color: sig.color,
      pointStyle: sig.markerShape === 'circle-hollow' ? 'OPEN' : 'POINT',
      pointSize: sig.markerRadius || 5
    };

    // 2. Stem lines using polygon trick: polygon([(n, 0), (n, y), (n, 0)])
    const segments = [];
    nList.forEach((n, i) => {
      const y = yList[i];
      segments.push(`(${n}, 0), (${n}, ${y}), (${n}, 0)`);
    });
    const polyExpr = {
      id: `${prefix}_stems`,
      latex: `S_{${sig.id}} = \\polygon(${segments.join(', ')})`,
      color: sig.color,
      lineStyle: sig.lineStyle === 'dashed' ? 'DASHED' : (sig.lineStyle === 'dotted' ? 'DOTTED' : 'SOLID'),
      lineWidth: sig.lineWidth,
      fillOpacity: 0
    };

    window.Calc.setExpression(ptExpr);
    window.Calc.setExpression(polyExpr);

    // Visual notification
    showToast(`Baked "${sig.name}" into native Desmos graph!`);
  }

  // --- USER INTERFACE (CLEAN GLASSMORPHIC PANEL) ---
  function initUI() {
    // 1. Create Floating Trigger Button
    const triggerBtn = document.createElement('button');
    triggerBtn.id = 'desmos-dt-trigger';
    triggerBtn.className = 'desmos-dt-trigger-btn';
    triggerBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="20" x2="20" y2="20"></line>
        <line x1="6" y1="20" x2="6" y2="10"></line>
        <circle cx="6" cy="9" r="2.5" fill="currentColor"></circle>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <circle cx="12" cy="4" r="2.5" fill="currentColor"></circle>
        <line x1="18" y1="20" x2="18" y2="13"></line>
        <circle cx="18" cy="12" r="2.5" fill="currentColor"></circle>
      </svg>
      <span>Discrete & CAS</span>
    `;
    triggerBtn.onclick = () => {
      state.panelOpen = !state.panelOpen;
      updatePanelVisibility();
    };
    document.body.appendChild(triggerBtn);

    // 2. Create Floating Panel
    const panel = document.createElement('div');
    panel.id = 'desmos-dt-panel';
    panel.className = 'desmos-dt-panel';
    panel.innerHTML = `
      <div class="desmos-dt-panel-header">
        <div class="desmos-dt-title-group">
          <span class="desmos-dt-badge">DT+</span>
          <h3>Discrete & CAS Coprocessor</h3>
        </div>
        <button id="desmos-dt-close-btn" class="desmos-dt-icon-btn" title="Close Panel">✕</button>
      </div>

      <div class="desmos-dt-tabs">
        <button class="desmos-dt-tab active" data-tab="signals">Discrete Signals</button>
        <button class="desmos-dt-tab" data-tab="cas">Symbolic CAS</button>
        <button class="desmos-dt-tab" data-tab="presets">Presets & Help</button>
      </div>

      <div class="desmos-dt-body" id="desmos-dt-tab-content">
        <!-- Tab Content dynamically injected -->
      </div>
    `;
    document.body.appendChild(panel);

    // Tab buttons event listeners
    panel.querySelectorAll('.desmos-dt-tab').forEach(btn => {
      btn.onclick = () => {
        panel.querySelectorAll('.desmos-dt-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTab = btn.getAttribute('data-tab');
        renderTabContent();
      };
    });

    document.getElementById('desmos-dt-close-btn').onclick = () => {
      state.panelOpen = false;
      updatePanelVisibility();
    };

    updatePanelVisibility();
    renderTabContent();
  }

  function updatePanelVisibility() {
    const panel = document.getElementById('desmos-dt-panel');
    const trigger = document.getElementById('desmos-dt-trigger');
    if (panel) panel.style.display = state.panelOpen ? 'flex' : 'none';
    if (trigger) trigger.classList.toggle('active', state.panelOpen);
  }

  function renderTabContent() {
    const container = document.getElementById('desmos-dt-tab-content');
    if (!container) return;

    if (state.activeTab === 'signals') {
      renderSignalsTab(container);
    } else if (state.activeTab === 'cas') {
      renderCasTab(container);
    } else if (state.activeTab === 'presets') {
      renderPresetsTab(container);
    }
  }

  // --- TAB 1: DISCRETE SIGNALS TAB ---
  function renderSignalsTab(container) {
    container.innerHTML = `
      <div class="desmos-dt-section-bar">
        <button id="desmos-dt-add-sig" class="desmos-dt-btn primary">+ Add Discrete Signal</button>
        <button id="desmos-dt-bake-all" class="desmos-dt-btn secondary" title="Export all stems as vanilla Desmos lists">Bake All to Desmos</button>
      </div>

      <div class="desmos-dt-signals-list" id="desmos-dt-signals-list">
        ${state.signals.map((sig, index) => `
          <div class="desmos-dt-sig-card" data-id="${sig.id}">
            <div class="desmos-dt-sig-header">
              <input type="checkbox" class="desmos-dt-sig-enable" ${sig.enabled ? 'checked' : ''}>
              <input type="text" class="desmos-dt-sig-name" value="${sig.name}">
              <button class="desmos-dt-sig-del" title="Delete Signal">🗑</button>
            </div>

            <div class="desmos-dt-row">
              <label>Expression:</label>
              <input type="text" class="desmos-dt-sig-expr" value="${sig.expr}" placeholder="e.g. 0.8^n * u[n] or delta[n]">
            </div>

            <!-- Recurrence Relation Toggle -->
            <div class="desmos-dt-row checkbox-row">
              <label><input type="checkbox" class="desmos-dt-recurrence-toggle" ${sig.recurrence && sig.recurrence.enabled ? 'checked' : ''}> Difference Equation Mode: y[n] = a1*y[n-1] + b0*x[n]</label>
            </div>
            ${sig.recurrence && sig.recurrence.enabled ? `
              <div class="desmos-dt-recurrence-box">
                <div class="desmos-dt-row-3">
                  <div>
                    <label>a1 (y[n-1]):</label>
                    <input type="number" step="0.05" class="desmos-dt-rec-a1" value="${sig.recurrence.a1 || 0.5}">
                  </div>
                  <div>
                    <label>b0 (x[n]):</label>
                    <input type="number" step="0.1" class="desmos-dt-rec-b0" value="${sig.recurrence.b0 || 1}">
                  </div>
                  <div>
                    <label>y[-1] Init:</label>
                    <input type="number" step="0.1" class="desmos-dt-rec-init" value="${(sig.recurrence.init && sig.recurrence.init['-1']) || 0}">
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Styling Controls -->
            <div class="desmos-dt-style-box">
              <div class="desmos-dt-style-grid">
                <div>
                  <label>Color:</label>
                  <div class="desmos-dt-color-picker-group">
                    <input type="color" class="desmos-dt-color-input" value="${sig.color}">
                    <span class="desmos-dt-color-preset" style="background:#c74440" data-color="#c74440"></span>
                    <span class="desmos-dt-color-preset" style="background:#2d70b3" data-color="#2d70b3"></span>
                    <span class="desmos-dt-color-preset" style="background:#388c46" data-color="#388c46"></span>
                    <span class="desmos-dt-color-preset" style="background:#6042a6" data-color="#6042a6"></span>
                    <span class="desmos-dt-color-preset" style="background:#fa7e19" data-color="#fa7e19"></span>
                  </div>
                </div>

                <div>
                  <label>Line Style:</label>
                  <select class="desmos-dt-sig-linestyle">
                    <option value="solid" ${sig.lineStyle === 'solid' ? 'selected' : ''}>Solid —</option>
                    <option value="dashed" ${sig.lineStyle === 'dashed' ? 'selected' : ''}>Dashed --</option>
                    <option value="dotted" ${sig.lineStyle === 'dotted' ? 'selected' : ''}>Dotted ··</option>
                  </select>
                </div>

                <div>
                  <label>Marker Head:</label>
                  <select class="desmos-dt-sig-marker">
                    <option value="circle-filled" ${sig.markerShape === 'circle-filled' ? 'selected' : ''}>Filled Circle ●</option>
                    <option value="circle-hollow" ${sig.markerShape === 'circle-hollow' ? 'selected' : ''}>Hollow Circle ○</option>
                    <option value="cross" ${sig.markerShape === 'cross' ? 'selected' : ''}>Cross ✕</option>
                    <option value="arrow" ${sig.markerShape === 'arrow' ? 'selected' : ''}>Impulse Arrow ↑</option>
                    <option value="square" ${sig.markerShape === 'square' ? 'selected' : ''}>Square ■</option>
                  </select>
                </div>

                <div>
                  <label>Stem Width: <span class="val-label">${sig.lineWidth}px</span></label>
                  <input type="range" class="desmos-dt-sig-width" min="1" max="6" step="0.5" value="${sig.lineWidth}">
                </div>
              </div>

              <!-- Range & Baseline -->
              <div class="desmos-dt-row-3" style="margin-top: 8px;">
                <div>
                  <label>n Min:</label>
                  <input type="number" class="desmos-dt-sig-nmin" value="${sig.nMin}">
                </div>
                <div>
                  <label>n Max:</label>
                  <input type="number" class="desmos-dt-sig-nmax" value="${sig.nMax}">
                </div>
                <div>
                  <label>Baseline (y=0):</label>
                  <input type="number" step="0.5" class="desmos-dt-sig-base" value="${sig.baseline}">
                </div>
              </div>
            </div>

            <div class="desmos-dt-card-actions">
              <button class="desmos-dt-btn-sm bake-sig-btn" title="Bake into vanilla Desmos lists">Bake to Desmos</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Bind Add Signal
    container.querySelector('#desmos-dt-add-sig').onclick = () => {
      const newId = `sig_${Date.now()}`;
      state.signals.push({
        id: newId,
        name: `x_${state.signals.length + 1}[n]`,
        expr: 'cos(0.2*pi*n) * u[n]',
        enabled: true,
        color: '#388c46',
        lineWidth: 2.5,
        lineStyle: 'solid',
        markerShape: 'circle-filled',
        markerRadius: 5,
        baseline: 0,
        nMin: -5,
        nMax: 20,
        recurrence: { enabled: false, a1: 0.5, b0: 1, init: { '-1': 0 } }
      });
      renderTabContent();
      render();
    };

    // Bind Bake All
    container.querySelector('#desmos-dt-bake-all').onclick = () => {
      state.signals.forEach(s => bakeToDesmos(s.id));
    };

    // Bind Card Events
    container.querySelectorAll('.desmos-dt-sig-card').forEach(card => {
      const id = card.getAttribute('data-id');
      const sig = state.signals.find(s => s.id === id);
      if (!sig) return;

      card.querySelector('.desmos-dt-sig-enable').onchange = (e) => {
        sig.enabled = e.target.checked;
        render();
      };
      card.querySelector('.desmos-dt-sig-name').oninput = (e) => {
        sig.name = e.target.value;
      };
      card.querySelector('.desmos-dt-sig-expr').oninput = (e) => {
        sig.expr = e.target.value;
        render();
      };
      card.querySelector('.desmos-dt-sig-del').onclick = () => {
        state.signals = state.signals.filter(s => s.id !== id);
        renderTabContent();
        render();
      };

      // Recurrence toggle
      const recToggle = card.querySelector('.desmos-dt-recurrence-toggle');
      if (recToggle) {
        recToggle.onchange = (e) => {
          if (!sig.recurrence) sig.recurrence = { enabled: false, a1: 0.5, b0: 1, init: { '-1': 0 } };
          sig.recurrence.enabled = e.target.checked;
          renderTabContent();
          render();
        };
      }
      if (sig.recurrence && sig.recurrence.enabled) {
        card.querySelector('.desmos-dt-rec-a1').oninput = (e) => {
          sig.recurrence.a1 = parseFloat(e.target.value) || 0;
          render();
        };
        card.querySelector('.desmos-dt-rec-b0').oninput = (e) => {
          sig.recurrence.b0 = parseFloat(e.target.value) || 0;
          render();
        };
        card.querySelector('.desmos-dt-rec-init').oninput = (e) => {
          sig.recurrence.init['-1'] = parseFloat(e.target.value) || 0;
          render();
        };
      }

      // Styles
      const colorInput = card.querySelector('.desmos-dt-color-input');
      colorInput.oninput = (e) => {
        sig.color = e.target.value;
        render();
      };
      card.querySelectorAll('.desmos-dt-color-preset').forEach(swatch => {
        swatch.onclick = () => {
          const col = swatch.getAttribute('data-color');
          sig.color = col;
          colorInput.value = col;
          render();
        };
      });

      card.querySelector('.desmos-dt-sig-linestyle').onchange = (e) => {
        sig.lineStyle = e.target.value;
        render();
      };
      card.querySelector('.desmos-dt-sig-marker').onchange = (e) => {
        sig.markerShape = e.target.value;
        render();
      };
      const widthSlider = card.querySelector('.desmos-dt-sig-width');
      widthSlider.oninput = (e) => {
        sig.lineWidth = parseFloat(e.target.value);
        card.querySelector('.val-label').textContent = `${sig.lineWidth}px`;
        render();
      };

      card.querySelector('.desmos-dt-sig-nmin').onchange = (e) => {
        sig.nMin = parseInt(e.target.value, 10);
        render();
      };
      card.querySelector('.desmos-dt-sig-nmax').onchange = (e) => {
        sig.nMax = parseInt(e.target.value, 10);
        render();
      };
      card.querySelector('.desmos-dt-sig-base').onchange = (e) => {
        sig.baseline = parseFloat(e.target.value);
        render();
      };

      // Bake button
      card.querySelector('.bake-sig-btn').onclick = () => {
        bakeToDesmos(id);
      };
    });
  }

  // --- TAB 2: SYMBOLIC CAS TAB ---
  function renderCasTab(container) {
    container.innerHTML = `
      <div class="desmos-dt-cas-container">
        <p class="desmos-dt-info">Perform exact analytical calculus and algebra powered by the symbolic CAS coprocessor.</p>

        <div class="desmos-dt-row">
          <label>Operation:</label>
          <select id="desmos-cas-op">
            <option value="diff">Derivative d/dx</option>
            <option value="integrate">Antiderivative ∫ dx</option>
            <option value="solve">Solve Equation = 0</option>
            <option value="taylor">Taylor Series Polynomial</option>
          </select>
        </div>

        <div class="desmos-dt-row">
          <label>Expression / Equation:</label>
          <input type="text" id="desmos-cas-input" value="x^3 - 3*x + 1" placeholder="e.g. sin(x)*exp(x) or x^2 - 4 = 0">
        </div>

        <div id="desmos-cas-extra" class="desmos-dt-row-2" style="display:none;">
          <div>
            <label>Variable:</label>
            <input type="text" id="desmos-cas-wrt" value="x">
          </div>
          <div>
            <label>Order (for Taylor):</label>
            <input type="number" id="desmos-cas-order" value="4" min="1" max="10">
          </div>
        </div>

        <button id="desmos-cas-calc-btn" class="desmos-dt-btn primary" style="width:100%; margin-top:8px;">Evaluate Symbolic CAS</button>

        <div class="desmos-dt-cas-result-card" id="desmos-cas-result-box" style="display:none;">
          <label>CAS Result (LaTeX):</label>
          <div class="desmos-cas-output" id="desmos-cas-output"></div>
          <div class="desmos-dt-card-actions">
            <button id="desmos-cas-insert-btn" class="desmos-dt-btn-sm primary">Insert into Desmos Graph</button>
            <button id="desmos-cas-copy-btn" class="desmos-dt-btn-sm secondary">Copy LaTeX</button>
          </div>
        </div>
      </div>
    `;

    const opSelect = container.querySelector('#desmos-cas-op');
    const extraBox = container.querySelector('#desmos-cas-extra');
    const input = container.querySelector('#desmos-cas-input');
    const calcBtn = container.querySelector('#desmos-cas-calc-btn');
    const resultBox = container.querySelector('#desmos-cas-result-box');
    const output = container.querySelector('#desmos-cas-output');
    const insertBtn = container.querySelector('#desmos-cas-insert-btn');
    const copyBtn = container.querySelector('#desmos-cas-copy-btn');

    opSelect.onchange = () => {
      extraBox.style.display = (opSelect.value === 'taylor') ? 'grid' : 'none';
      if (opSelect.value === 'solve' && !input.value.includes('=')) {
        input.value = 'x^2 - 5*x + 6 = 0';
      }
    };

    calcBtn.onclick = () => {
      const op = opSelect.value;
      const expr = input.value;
      let res = '';

      try {
        if (op === 'diff') {
          res = CAS.diff(expr, 'x');
        } else if (op === 'integrate') {
          res = CAS.integrate(expr, 'x') + ' + C';
        } else if (op === 'solve') {
          const roots = CAS.solve(expr, 'x');
          res = `x = ${roots.join(', ')}`;
        } else if (op === 'taylor') {
          const order = parseInt(container.querySelector('#desmos-cas-order').value, 10) || 4;
          res = CAS.taylor(expr, 'x', 0, order);
        }
      } catch (err) {
        res = `Error: ${err.message}`;
      }

      output.textContent = res;
      resultBox.style.display = 'block';

      insertBtn.onclick = () => {
        if (window.Calc) {
          const cleanRes = res.replace(/\+ C/, '').trim();
          window.Calc.setExpression({
            id: `cas_plot_${Date.now()}`,
            latex: `y = ${cleanRes}`,
            color: '#6042a6'
          });
          showToast('Inserted symbolic curve into Desmos!');
        }
      };

      copyBtn.onclick = () => {
        navigator.clipboard.writeText(res);
        showToast('Copied LaTeX to clipboard!');
      };
    };
  }

  // --- TAB 3: PRESETS & HELP ---
  function renderPresetsTab(container) {
    container.innerHTML = `
      <div class="desmos-dt-presets-list">
        <h4>1-Click Discrete Presets:</h4>

        <div class="desmos-dt-preset-item" data-preset="impulse">
          <div>
            <strong>Kronecker Delta Impulse</strong>
            <p>x[n] = delta[n]</p>
          </div>
          <button class="desmos-dt-btn-sm primary">Load</button>
        </div>

        <div class="desmos-dt-preset-item" data-preset="step">
          <div>
            <strong>Unit Step Signal</strong>
            <p>x[n] = u[n]</p>
          </div>
          <button class="desmos-dt-btn-sm primary">Load</button>
        </div>

        <div class="desmos-dt-preset-item" data-preset="damped">
          <div>
            <strong>Damped Sinusoid</strong>
            <p>x[n] = (0.8^n) * cos(0.25*pi*n) * u[n]</p>
          </div>
          <button class="desmos-dt-btn-sm primary">Load</button>
        </div>

        <div class="desmos-dt-preset-item" data-preset="rect">
          <div>
            <strong>Rectangular Pulse Train</strong>
            <p>x[n] = rect[n, 3]</p>
          </div>
          <button class="desmos-dt-btn-sm primary">Load</button>
        </div>

        <div class="desmos-dt-preset-item" data-preset="iir">
          <div>
            <strong>First-Order IIR Filter</strong>
            <p>y[n] = 0.85*y[n-1] + x[n] (Step response)</p>
          </div>
          <button class="desmos-dt-btn-sm primary">Load</button>
        </div>

        <hr style="border:none; border-top: 1px solid #e5e7eb; margin: 12px 0;">

        <h4>Supported Signal Syntax:</h4>
        <ul class="desmos-dt-help-list">
          <li><code>delta[n]</code> : Kronecker delta (1 at n=0, 0 elsewhere)</li>
          <li><code>u[n]</code> : Unit step function (1 for n ≥ 0)</li>
          <li><code>r[n]</code> : Unit ramp (n for n ≥ 0)</li>
          <li><code>rect[n, N]</code> : Rectangular pulse of half-width N</li>
          <li><code>sinc[n]</code> : Normalized sinc function</li>
          <li><code>^</code> or <code>**</code> : Power (e.g. <code>0.5^n</code>)</li>
          <li>Standard math: <code>sin, cos, exp, log, sqrt, abs, pi</code></li>
        </ul>
      </div>
    `;

    container.querySelectorAll('.desmos-dt-preset-item').forEach(item => {
      const type = item.getAttribute('data-preset');
      item.querySelector('button').onclick = () => {
        if (type === 'impulse') {
          state.signals.push({
            id: `sig_${Date.now()}`,
            name: 'Impulse delta[n]',
            expr: 'delta[n]',
            enabled: true,
            color: '#c74440',
            lineWidth: 2.5,
            lineStyle: 'solid',
            markerShape: 'arrow',
            markerRadius: 6,
            baseline: 0,
            nMin: -5,
            nMax: 10
          });
        } else if (type === 'step') {
          state.signals.push({
            id: `sig_${Date.now()}`,
            name: 'Unit Step u[n]',
            expr: 'u[n]',
            enabled: true,
            color: '#2d70b3',
            lineWidth: 2,
            lineStyle: 'solid',
            markerShape: 'circle-filled',
            markerRadius: 5,
            baseline: 0,
            nMin: -5,
            nMax: 15
          });
        } else if (type === 'damped') {
          state.signals.push({
            id: `sig_${Date.now()}`,
            name: 'Damped Cosine',
            expr: '(0.85^n) * cos(0.2*pi*n) * u[n]',
            enabled: true,
            color: '#6042a6',
            lineWidth: 2.5,
            lineStyle: 'solid',
            markerShape: 'circle-hollow',
            markerRadius: 5,
            baseline: 0,
            nMin: -2,
            nMax: 25
          });
        } else if (type === 'rect') {
          state.signals.push({
            id: `sig_${Date.now()}`,
            name: 'Rect Pulse',
            expr: 'rect[n, 3]',
            enabled: true,
            color: '#fa7e19',
            lineWidth: 2.5,
            lineStyle: 'dashed',
            markerShape: 'square',
            markerRadius: 5,
            baseline: 0,
            nMin: -8,
            nMax: 8
          });
        } else if (type === 'iir') {
          state.signals.push({
            id: `sig_${Date.now()}`,
            name: 'IIR Step Response',
            expr: '',
            enabled: true,
            color: '#388c46',
            lineWidth: 2.5,
            lineStyle: 'solid',
            markerShape: 'circle-filled',
            markerRadius: 5,
            baseline: 0,
            nMin: 0,
            nMax: 20,
            recurrence: { enabled: true, a1: 0.85, a2: 0, b0: 1, init: { '-1': 0 } }
          });
        }
        showToast('Preset loaded into Discrete Signals!');
        state.activeTab = 'signals';
        const tabBtns = document.querySelectorAll('.desmos-dt-tab');
        tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'signals'));
        renderTabContent();
        render();
      };
    });
  }

  // --- Sleek Toast Notification ---
  function showToast(msg) {
    let toast = document.getElementById('desmos-dt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'desmos-dt-toast';
      toast.className = 'desmos-dt-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // --- BOOTSTRAPPER ---
  function waitForCalc() {
    if (window.Calc && window.Calc.graphpaperBounds && document.querySelector('.dcg-graph-outer')) {
      console.log('[DesmosDT] Desmos Calculator detected. Initializing modules...');
      initOverlay();
      initUI();
    } else {
      setTimeout(waitForCalc, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCalc);
  } else {
    waitForCalc();
  }

})();
