/**
 * OmniMath: Symbolic CAS Algebra Engine
 * Implements simplification, symbolic differentiation, antiderivatives, equation solving, and Taylor series.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const complexMod = require('./complex');
    const parserMod = require('./cas_parser');
    module.exports = factory(complexMod, parserMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath, root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(complexDeps, parserDeps) {
  'use strict';

  const Complex = complexDeps.Complex;
  const parse = parserDeps.parse;
  const numNode = parserDeps.numNode;
  const symNode = parserDeps.symNode;
  const opNode = parserDeps.opNode;

  // --- SYMBOLIC SIMPLIFIER ---
  function simplify(node) {
    if (!node) return numNode(0);
    if (node.type === 'num' || node.type === 'sym') return node;

    const args = node.args.map(simplify);
    const fn = node.fn;

    if (args.every(a => a.type === 'num')) {
      const v = args.map(a => a.val);
      if (fn === '+') return numNode(v[0] + v[1]);
      if (fn === '-') return numNode(v[0] - v[1]);
      if (fn === '*') return numNode(v[0] * v[1]);
      if (fn === '/') return v[1] !== 0 ? numNode(v[0] / v[1]) : opNode('/', args);
      if (fn === '^') return numNode(Math.pow(v[0], v[1]));
      if (fn === 'sin') return numNode(Math.sin(v[0]));
      if (fn === 'cos') return numNode(Math.cos(v[0]));
      if (fn === 'exp') return numNode(Math.exp(v[0]));
      if (fn === 'ln' || fn === 'log') return numNode(Math.log(v[0]));
      if (fn === 'sqrt') return numNode(Math.sqrt(v[0]));
    }

    if (fn === '+') {
      if (args[0].type === 'num' && args[0].val === 0) return args[1];
      if (args[1].type === 'num' && args[1].val === 0) return args[0];
      if (args[0].type === 'num' && args[1].type === 'num') return numNode(args[0].val + args[1].val);
    }
    if (fn === '-') {
      if (args[1].type === 'num' && args[1].val === 0) return args[0];
      if (args[0].type === 'sym' && args[1].type === 'sym' && args[0].name === args[1].name) return numNode(0);
    }
    if (fn === '*') {
      if ((args[0].type === 'num' && args[0].val === 0) || (args[1].type === 'num' && args[1].val === 0)) return numNode(0);
      if (args[0].type === 'num' && args[0].val === 1) return args[1];
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
    }
    if (fn === '/') {
      if (args[0].type === 'num' && args[0].val === 0) return numNode(0);
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
    }
    if (fn === '^') {
      if (args[1].type === 'num' && args[1].val === 0) return numNode(1);
      if (args[1].type === 'num' && args[1].val === 1) return args[0];
    }

    return opNode(fn, args);
  }

  // --- SYMBOLIC DERIVATIVE (diff) ---
  function diff(node, wrt = 'x') {
    if (typeof node === 'string') node = parse(node);
    if (!node) return numNode(0);
    if (node.type === 'num') return numNode(0);
    if (node.type === 'sym') return node.name === wrt ? numNode(1) : numNode(0);

    const fn = node.fn, args = node.args;
    if (fn === '+') return simplify(opNode('+', [diff(args[0], wrt), diff(args[1], wrt)]));
    if (fn === '-') return simplify(opNode('-', [diff(args[0], wrt), diff(args[1], wrt)]));
    if (fn === '*') {
      return simplify(opNode('+', [
        opNode('*', [diff(args[0], wrt), args[1]]),
        opNode('*', [args[0], diff(args[1], wrt)])
      ]));
    }
    if (fn === '/') {
      return simplify(opNode('/', [
        opNode('-', [opNode('*', [diff(args[0], wrt), args[1]]), opNode('*', [args[0], diff(args[1], wrt)])]),
        opNode('^', [args[1], numNode(2)])
      ]));
    }
    if (fn === '^') {
      if (args[1].type === 'num') {
        return simplify(opNode('*', [
          numNode(args[1].val),
          opNode('*', [opNode('^', [args[0], numNode(args[1].val - 1)]), diff(args[0], wrt)])
        ]));
      }
    }
    if (fn === 'sin') return simplify(opNode('*', [opNode('cos', [args[0]]), diff(args[0], wrt)]));
    if (fn === 'cos') return simplify(opNode('*', [opNode('*', [numNode(-1), opNode('sin', [args[0]])]), diff(args[0], wrt)]));
    if (fn === 'exp') return simplify(opNode('*', [node, diff(args[0], wrt)]));
    if (fn === 'ln' || fn === 'log') return simplify(opNode('/', [diff(args[0], wrt), args[0]]));
    if (fn === 'sqrt') return diff(opNode('^', [args[0], numNode(0.5)]), wrt);

    return numNode(0);
  }

  // --- SYMBOLIC ANTIDERIVATIVE (integrate) ---
  function integrate(node, wrt = 'x') {
    if (typeof node === 'string') node = parse(node);
    node = simplify(node);

    if (node.type === 'num') return opNode('*', [node, symNode(wrt)]);
    if (node.type === 'sym') {
      if (node.name === wrt) return opNode('/', [opNode('^', [symNode(wrt), numNode(2)]), numNode(2)]);
      return opNode('*', [node, symNode(wrt)]);
    }

    const fn = node.fn, args = node.args;
    if (fn === '+') return simplify(opNode('+', [integrate(args[0], wrt), integrate(args[1], wrt)]));
    if (fn === '-') return simplify(opNode('-', [integrate(args[0], wrt), integrate(args[1], wrt)]));
    if (fn === '*') {
      if (args[0].type === 'num') return simplify(opNode('*', [args[0], integrate(args[1], wrt)]));
      if (args[1].type === 'num') return simplify(opNode('*', [args[1], integrate(args[0], wrt)]));
    }
    if (fn === '^' && args[0].type === 'sym' && args[0].name === wrt && args[1].type === 'num') {
      const p = args[1].val;
      if (p === -1) return opNode('ln', [symNode(wrt)]);
      return opNode('/', [opNode('^', [symNode(wrt), numNode(p + 1)]), numNode(p + 1)]);
    }
    if (fn === 'sin' && args[0].type === 'sym' && args[0].name === wrt) return opNode('*', [numNode(-1), opNode('cos', [symNode(wrt)])]);
    if (fn === 'cos' && args[0].type === 'sym' && args[0].name === wrt) return opNode('sin', [symNode(wrt)]);
    if (fn === 'exp' && args[0].type === 'sym' && args[0].name === wrt) return opNode('exp', [symNode(wrt)]);

    return opNode('int', [node, symNode(wrt)]);
  }

  // --- EQUATION SOLVER (solve) ---
  function solve(equationStr, wrt = 'x') {
    const ast = parse(equationStr);
    function evalTree(n, val) {
      if (n.type === 'num') return n.val;
      if (n.type === 'sym') return n.name === wrt ? val : 1;
      const a = n.args.map(arg => evalTree(arg, val));
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

    const c = evalTree(ast, 0);
    const f1 = evalTree(ast, 1);
    const fm1 = evalTree(ast, -1);
    const a = (f1 + fm1 - 2 * c) / 2;
    const b = (f1 - fm1) / 2;

    if (Math.abs(a) > 1e-9) {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        return [Number(((-b + Math.sqrt(disc)) / (2 * a)).toFixed(4)), Number(((-b - Math.sqrt(disc)) / (2 * a)).toFixed(4))];
      } else {
        const re = -b / (2 * a);
        const im = Math.sqrt(-disc) / (2 * a);
        const z1 = new Complex(re, im);
        const z2 = new Complex(re, -im);
        return [z1.toString(), z2.toString()];
      }
    } else if (Math.abs(b) > 1e-9) {
      return [Number((-c / b).toFixed(4))];
    }
    return ['No closed-form solution'];
  }

  // --- TAYLOR SERIES ---
  function taylor(exprStr, wrt = 'x', x0 = 0, order = 4) {
    let current = parse(exprStr);
    let terms = [];
    function evalTree(n, val) {
      if (n.type === 'num') return n.val;
      if (n.type === 'sym') return n.name === wrt ? val : 0;
      const a = n.args.map(arg => evalTree(arg, val));
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
      const val = evalTree(current, x0);
      if (Math.abs(val) > 1e-7) {
        const coeff = Number((val / fact).toFixed(4));
        const term = n === 0 ? `${coeff}` : (n === 1 ? `${coeff}${wrt}` : `${coeff}${wrt}^{${n}}`);
        terms.push(term);
      }
      current = diff(current, wrt);
    }
    return terms.join(' + ').replace(/\+\s*-/g, '- ') || '0';
  }

  return {
    simplify,
    diff,
    integrate,
    solve,
    taylor
  };
});
