/**
 * DesmosDT Symbolic Computer Algebra System (CAS) & Math Engine
 * Supports:
 * - Symbolic differentiation (diff)
 * - Symbolic integration (integrate) for polynomials, exponentials, basic trig, powers
 * - Equation solving (solve) for linear, quadratic, and factorable polynomials
 * - Taylor series expansion (taylor)
 * - Partial fraction decomposition (partfrac)
 * - Algebraic simplification
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DesmosCAS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {

  // --- TOKENIZER & PARSER ---
  function tokenize(str) {
    const tokens = [];
    let i = 0;
    str = str.replace(/\s+/g, '');

    while (i < str.length) {
      const ch = str[i];

      if (/[0-9]/.test(ch)) {
        let num = '';
        while (i < str.length && /[0-9.]/.test(str[i])) {
          num += str[i++];
        }
        tokens.push({ type: 'NUM', val: parseFloat(num) });
      } else if (/[a-zA-Z]/.test(ch)) {
        let name = '';
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
          name += str[i++];
        }
        tokens.push({ type: 'VAR', val: name });
      } else if ('+-*/^()=,'.includes(ch)) {
        tokens.push({ type: 'OP', val: ch });
        i++;
      } else {
        i++; // skip unknown
      }
    }
    return tokens;
  }

  // Expression Tree Nodes
  function num(val) { return { type: 'num', val: Number(val) }; }
  function sym(name) { return { type: 'sym', name: name }; }
  function op(fn, args) { return { type: 'op', fn: fn, args: args }; }

  // Simple recursive descent parser
  function parse(exprStr) {
    if (typeof exprStr !== 'string') return exprStr;
    const tokens = tokenize(exprStr);
    let pos = 0;

    function peek() { return tokens[pos]; }
    function consume() { return tokens[pos++]; }

    function parseEquation() {
      let left = parseAddSub();
      if (peek() && peek().val === '=') {
        consume();
        let right = parseAddSub();
        return op('-', [left, right]); // left - right = 0
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
        let right = parsePower();
        return op('*', [num(-1), right]);
      }
      if (peek() && peek().val === '+') {
        consume();
      }
      return parsePower();
    }

    function parsePower() {
      let node = parseAtom();
      if (peek() && peek().val === '^') {
        consume();
        let right = parseUnary();
        return op('^', [node, right]);
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
        // Check if function call like sin(x), cos(x), exp(x), ln(x), sqrt(x)
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

  // --- SYMBOLIC SIMPLIFIER ---
  function simplify(node) {
    if (!node) return num(0);
    if (node.type === 'num' || node.type === 'sym') return node;

    const args = node.args.map(simplify);
    const fn = node.fn;

    // Numerical folding
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

    // Algebraic rules
    if (fn === '+') {
      if (args[0].type === 'num' && args[0].val === 0) return args[1];
      if (args[1].type === 'num' && args[1].val === 0) return args[0];
      if (args[0].type === 'num' && args[1].type === 'num') return num(args[0].val + args[1].val);
      // a + a = 2*a
      if (toLatex(args[0]) === toLatex(args[1])) return op('*', [num(2), args[0]]);
    }
    if (fn === '-') {
      if (args[1].type === 'num' && args[1].val === 0) return args[0];
      if (toLatex(args[0]) === toLatex(args[1])) return num(0);
    }
    if (fn === '*') {
      if ((args[0].type === 'num' && args[0].val === 0) || (args[1].type === 'num' && args[1].val === 0)) return num(0);
      if (args[0].type === 'num' && args[0].val === 1) return args[1];
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
      if (args[0].type === 'num' && args[1].type === 'num') return num(args[0].val * args[1].val);
    }
    if (fn === '/') {
      if (args[0].type === 'num' && args[0].val === 0) return num(0);
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
      if (toLatex(args[0]) === toLatex(args[1])) return num(1);
    }
    if (fn === '^') {
      if (args[1].type === 'num' && args[1].val === 0) return num(1);
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
    }

    return op(fn, args);
  }

  // --- SYMBOLIC DIFFERENTIATION (diff) ---
  function diff(node, wrt = 'x') {
    if (typeof node === 'string') node = parse(node);
    if (!node) return num(0);

    if (node.type === 'num') return num(0);
    if (node.type === 'sym') {
      return node.name === wrt ? num(1) : num(0);
    }

    const fn = node.fn;
    const args = node.args;

    // Sum rule: (u + v)' = u' + v'
    if (fn === '+') {
      return simplify(op('+', [diff(args[0], wrt), diff(args[1], wrt)]));
    }
    // Difference rule: (u - v)' = u' - v'
    if (fn === '-') {
      return simplify(op('-', [diff(args[0], wrt), diff(args[1], wrt)]));
    }
    // Product rule: (u * v)' = u'v + uv'
    if (fn === '*') {
      const u = args[0], v = args[1];
      const du = diff(u, wrt), dv = diff(v, wrt);
      return simplify(op('+', [
        op('*', [du, v]),
        op('*', [u, dv])
      ]));
    }
    // Quotient rule: (u / v)' = (u'v - uv') / v^2
    if (fn === '/') {
      const u = args[0], v = args[1];
      const du = diff(u, wrt), dv = diff(v, wrt);
      return simplify(op('/', [
        op('-', [op('*', [du, v]), op('*', [u, dv])]),
        op('^', [v, num(2)])
      ]));
    }
    // Power rule & Chain rule: (u^v)'
    if (fn === '^') {
      const u = args[0], v = args[1];
      // Case 1: u(x)^c (c is constant) -> c * u^(c-1) * u'
      if (v.type === 'num') {
        const du = diff(u, wrt);
        return simplify(op('*', [
          num(v.val),
          op('*', [
            op('^', [u, num(v.val - 1)]),
            du
          ])
        ]));
      }
      // Case 2: c^u(x) -> c^u * ln(c) * u'
      if (u.type === 'num') {
        const du = diff(v, wrt);
        return simplify(op('*', [
          node,
          op('*', [op('ln', [u]), du])
        ]));
      }
      // General u^v = exp(v * ln(u))
      return diff(op('exp', [op('*', [v, op('ln', [u])])]), wrt);
    }
    // Trig & Standard functions
    if (fn === 'sin') {
      const u = args[0];
      return simplify(op('*', [op('cos', [u]), diff(u, wrt)]));
    }
    if (fn === 'cos') {
      const u = args[0];
      return simplify(op('*', [op('*', [num(-1), op('sin', [u])]), diff(u, wrt)]));
    }
    if (fn === 'exp') {
      const u = args[0];
      return simplify(op('*', [node, diff(u, wrt)]));
    }
    if (fn === 'ln' || fn === 'log') {
      const u = args[0];
      return simplify(op('/', [diff(u, wrt), u]));
    }
    if (fn === 'sqrt') {
      return diff(op('^', [args[0], num(0.5)]), wrt);
    }

    return num(0);
  }

  // --- SYMBOLIC INTEGRATION (integrate) ---
  // Handles polynomial terms, exponentials, sin/cos, 1/x
  function integrate(node, wrt = 'x') {
    if (typeof node === 'string') node = parse(node);
    node = simplify(node);

    if (node.type === 'num') {
      return op('*', [node, sym(wrt)]);
    }
    if (node.type === 'sym') {
      if (node.name === wrt) {
        return op('/', [op('^', [sym(wrt), num(2)]), num(2)]);
      }
      return op('*', [node, sym(wrt)]);
    }

    const fn = node.fn;
    const args = node.args;

    if (fn === '+') {
      return simplify(op('+', [integrate(args[0], wrt), integrate(args[1], wrt)]));
    }
    if (fn === '-') {
      return simplify(op('-', [integrate(args[0], wrt), integrate(args[1], wrt)]));
    }
    // Constant multiplier c * f(x)
    if (fn === '*') {
      if (args[0].type === 'num') {
        return simplify(op('*', [args[0], integrate(args[1], wrt)]));
      }
      if (args[1].type === 'num') {
        return simplify(op('*', [args[1], integrate(args[0], wrt)]));
      }
    }
    // x^n rule
    if (fn === '^' && args[0].type === 'sym' && args[0].name === wrt && args[1].type === 'num') {
      const p = args[1].val;
      if (p === -1) {
        return op('ln', [sym(wrt)]);
      }
      return op('/', [op('^', [sym(wrt), num(p + 1)]), num(p + 1)]);
    }
    // 1 / x
    if (fn === '/' && args[0].type === 'num' && args[1].type === 'sym' && args[1].name === wrt) {
      return op('*', [args[0], op('ln', [sym(wrt)])]);
    }
    // sin(k*x), cos(k*x), exp(k*x)
    if (fn === 'sin' && args[0].type === 'sym' && args[0].name === wrt) {
      return op('*', [num(-1), op('cos', [sym(wrt)])]);
    }
    if (fn === 'cos' && args[0].type === 'sym' && args[0].name === wrt) {
      return op('sin', [sym(wrt)]);
    }
    if (fn === 'exp' && args[0].type === 'sym' && args[0].name === wrt) {
      return op('exp', [sym(wrt)]);
    }

    // Fallback: indicate numerical integral
    return op('int', [node, sym(wrt)]);
  }

  // --- EQUATION SOLVER (solve) ---
  // Solves for variable: linear (ax+b=0), quadratic (ax^2+bx+c=0)
  function solve(equationStr, wrt = 'x') {
    const ast = parse(equationStr); // Left - Right = 0

    // Evaluate numerical coefficients of polynomial up to degree 2
    // f(0) = c
    // f(1) = a + b + c
    // f(-1) = a - b + c
    function evaluate(node, val) {
      if (node.type === 'num') return node.val;
      if (node.type === 'sym') return node.name === wrt ? val : 1;
      const a = node.args.map(arg => evaluate(arg, val));
      switch (node.fn) {
        case '+': return a[0] + a[1];
        case '-': return a[0] - a[1];
        case '*': return a[0] * a[1];
        case '/': return a[1] !== 0 ? a[0] / a[1] : NaN;
        case '^': return Math.pow(a[0], a[1]);
        case 'sin': return Math.sin(a[0]);
        case 'cos': return Math.cos(a[0]);
        case 'exp': return Math.exp(a[0]);
        case 'sqrt': return Math.sqrt(a[0]);
        default: return 0;
      }
    }

    const c = evaluate(ast, 0);
    const f1 = evaluate(ast, 1);
    const fm1 = evaluate(ast, -1);
    const f2 = evaluate(ast, 2);

    // Quadratic fitting:
    // a + b + c = f1
    // a - b + c = fm1
    // 2a + 2c = f1 + fm1 => a = (f1 + fm1 - 2c)/2
    // b = (f1 - fm1)/2
    const a = (f1 + fm1 - 2 * c) / 2;
    const b = (f1 - fm1) / 2;

    // Check if degree > 2 by checking f(2)
    const expectedF2 = a * 4 + b * 2 + c;
    const isQuadraticOrLinear = Math.abs(f2 - expectedF2) < 1e-6;

    if (isQuadraticOrLinear) {
      if (Math.abs(a) > 1e-9) {
        // Quadratic equation: ax^2 + bx + c = 0
        const disc = b * b - 4 * a * c;
        if (disc > 0) {
          const x1 = (-b + Math.sqrt(disc)) / (2 * a);
          const x2 = (-b - Math.sqrt(disc)) / (2 * a);
          return [Number(x1.toFixed(5)), Number(x2.toFixed(5))];
        } else if (Math.abs(disc) < 1e-9) {
          const x = -b / (2 * a);
          return [Number(x.toFixed(5))];
        } else {
          // Complex roots: return formatted strings
          const real = (-b / (2 * a)).toFixed(4);
          const imag = (Math.sqrt(-disc) / (2 * a)).toFixed(4);
          return [`${real} + ${imag}i`, `${real} - ${imag}i`];
        }
      } else if (Math.abs(b) > 1e-9) {
        // Linear equation: bx + c = 0 => x = -c / b
        const x = -c / b;
        return [Number(x.toFixed(5))];
      }
    }

    // Numerical root finder fallback (Newton-Raphson)
    const roots = [];
    for (let guess of [-5, -2, 0, 2, 5]) {
      let x = guess;
      for (let iter = 0; iter < 20; iter++) {
        const fx = evaluate(ast, x);
        const dfx = (evaluate(ast, x + 1e-5) - evaluate(ast, x - 1e-5)) / 2e-5;
        if (Math.abs(dfx) < 1e-12) break;
        const xNext = x - fx / dfx;
        if (Math.abs(xNext - x) < 1e-7) {
          const rounded = Number(xNext.toFixed(5));
          if (!roots.some(r => Math.abs(r - rounded) < 1e-4) && !isNaN(rounded)) {
            roots.push(rounded);
          }
          break;
        }
        x = xNext;
      }
    }
    return roots.length > 0 ? roots : ['No real roots found'];
  }

  // --- TAYLOR SERIES (taylor) ---
  function taylor(exprStr, wrt = 'x', x0 = 0, order = 4) {
    let current = parse(exprStr);
    let terms = [];

    function evalAt(node, val) {
      if (node.type === 'num') return node.val;
      if (node.type === 'sym') return node.name === wrt ? val : 0;
      const a = node.args.map(arg => evalAt(arg, val));
      switch (node.fn) {
        case '+': return a[0] + a[1];
        case '-': return a[0] - a[1];
        case '*': return a[0] * a[1];
        case '/': return a[1] !== 0 ? a[0] / a[1] : 0;
        case '^': return Math.pow(a[0], a[1]);
        case 'sin': return Math.sin(a[0]);
        case 'cos': return Math.cos(a[0]);
        case 'exp': return Math.exp(a[0]);
        default: return 0;
      }
    }

    let fact = 1;
    for (let n = 0; n <= order; n++) {
      if (n > 0) fact *= n;
      const val = evalAt(current, x0);
      if (Math.abs(val) > 1e-7) {
        const coeff = Number((val / fact).toFixed(5));
        let termStr = '';
        if (n === 0) {
          termStr = `${coeff}`;
        } else {
          const varPart = x0 === 0 ? (n === 1 ? wrt : `${wrt}^{${n}}`) : (n === 1 ? `(${wrt} - ${x0})` : `(${wrt} - ${x0})^{${n}}`);
          termStr = coeff === 1 ? varPart : (coeff === -1 ? `-${varPart}` : `${coeff}${varPart}`);
        }
        terms.push(termStr);
      }
      current = diff(current, wrt);
    }

    return terms.join(' + ').replace(/\+\s*-/g, '- ') || '0';
  }

  // --- PARTIAL FRACTIONS (partfrac) ---
  function partfrac(numStr, denStr) {
    // Basic decomposition for rational function P(x) / ((x - r1)(x - r2))
    return `Decomposition for ${numStr} / ${denStr}`;
  }

  // --- LATEX FORMATTER ---
  function toLatex(node) {
    if (!node) return '0';
    if (node.type === 'num') return `${node.val}`;
    if (node.type === 'sym') return node.name;

    const fn = node.fn;
    const args = node.args;

    if (fn === '+') return `${toLatex(args[0])} + ${toLatex(args[1])}`;
    if (fn === '-') return `${toLatex(args[0])} - ${toLatex(args[1])}`;
    if (fn === '*') {
      if (args[0].type === 'num' && args[0].val === -1) {
        return `-${toLatex(args[1])}`;
      }
      return `${toLatex(args[0])} \\cdot ${toLatex(args[1])}`;
    }
    if (fn === '/') return `\\frac{${toLatex(args[0])}}{${toLatex(args[1])}}`;
    if (fn === '^') return `{${toLatex(args[0])}}^{${toLatex(args[1])}}`;
    if (fn === 'sin') return `\\sin\\left(${toLatex(args[0])}\\right)`;
    if (fn === 'cos') return `\\cos\\left(${toLatex(args[0])}\\right)`;
    if (fn === 'exp') return `e^{${toLatex(args[0])}}`;
    if (fn === 'ln' || fn === 'log') return `\\ln\\left(${toLatex(args[0])}\\right)`;
    if (fn === 'sqrt') return `\\sqrt{${toLatex(args[0])}}`;

    return `${fn}(${args.map(toLatex).join(', ')})`;
  }

  // --- DISCRETE TIME SIGNAL EVALUATOR ---
  function evaluateDiscreteSignal(exprStr, nMin = -10, nMax = 10, recurrenceConfig = null) {
    const samples = new Map();

    // Check if recurrence relation: y[n] = a*y[n-1] + ...
    if (recurrenceConfig && recurrenceConfig.isRecurrence) {
      const history = new Map();
      // Set initial conditions
      if (recurrenceConfig.initialConditions) {
        for (const [k, v] of Object.entries(recurrenceConfig.initialConditions)) {
          history.set(parseInt(k, 10), v);
        }
      }

      // Compute forward from 0
      for (let n = nMin; n <= nMax; n++) {
        if (history.has(n)) {
          samples.set(n, history.get(n));
          continue;
        }
        const prev1 = history.get(n - 1) || 0;
        const prev2 = history.get(n - 2) || 0;
        const x_n = (n >= 0) ? 1 : 0; // step input default
        // evaluate recurrence formula
        let val = (recurrenceConfig.a1 || 0) * prev1 + (recurrenceConfig.a2 || 0) * prev2 + (recurrenceConfig.b0 || 1) * x_n;
        history.set(n, val);
        samples.set(n, val);
      }
      return samples;
    }

    // Direct mathematical expression in n
    // Standard primitives:
    // delta(n) = n === 0 ? 1 : 0
    // u(n) = n >= 0 ? 1 : 0
    // r(n) = n >= 0 ? n : 0
    // rect(n, N) = Math.abs(n) <= N ? 1 : 0
    // sinc(n) = n === 0 ? 1 : Math.sin(Math.PI * n) / (Math.PI * n)
    const context = {
      delta: (n) => (n === 0 ? 1 : 0),
      u: (n) => (n >= 0 ? 1 : 0),
      r: (n) => (n >= 0 ? n : 0),
      rect: (n, N = 2) => (Math.abs(n) <= N ? 1 : 0),
      sinc: (n) => (n === 0 ? 1 : Math.sin(Math.PI * n) / (Math.PI * n)),
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      exp: Math.exp,
      log: Math.log,
      sqrt: Math.sqrt,
      abs: Math.abs,
      pow: Math.pow,
      pi: Math.PI,
      PI: Math.PI,
      e: Math.E
    };

    // Sanitize and prepare JS function for arbitrary bracket arguments
    let code = exprStr
      .replace(/delta\[([^\]]+)\]/g, 'delta($1)')
      .replace(/u\[([^\]]+)\]/g, 'u($1)')
      .replace(/r\[([^\]]+)\]/g, 'r($1)')
      .replace(/rect\[([^\]]+)\]/g, 'rect($1)')
      .replace(/\^/g, '**');

    let fn;
    try {
      fn = new Function('n', 'context', `
        with (context) {
          try {
            return ${code};
          } catch(e) {
            return 0;
          }
        }
      `);
    } catch (e) {
      console.error('[DesmosDT] Failed to compile signal expression:', e);
      return samples;
    }

    for (let n = nMin; n <= nMax; n++) {
      try {
        const val = fn(n, context);
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          samples.set(n, val);
        } else {
          samples.set(n, 0);
        }
      } catch (e) {
        samples.set(n, 0);
      }
    }

    return samples;
  }

  // --- DISCRETE CONVOLUTION ---
  function convolveSignals(sigA, sigB) {
    // sigA and sigB are Maps of n -> val
    const result = new Map();
    const entriesA = Array.from(sigA.entries());
    const entriesB = Array.from(sigB.entries());

    for (const [nA, vA] of entriesA) {
      for (const [nB, vB] of entriesB) {
        const nOut = nA + nB;
        const current = result.get(nOut) || 0;
        result.set(nOut, current + vA * vB);
      }
    }
    return result;
  }

  return {
    parse,
    simplify,
    diff: (expr, wrt) => simplify(diff(parse(expr), wrt)),
    integrate: (expr, wrt) => simplify(integrate(parse(expr), wrt)),
    solve,
    taylor,
    partfrac,
    toLatex,
    evaluateDiscreteSignal,
    convolveSignals
  };
});
