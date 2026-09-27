/**
 * OmniMath: Expression Compiler & Runtime Environment Manager
 * Compiles mathematical AST and expressions into ultra-high-speed evaluation closures.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const complexMod = require('./complex');
    const quadMod = require('./quadrature');
    const parserMod = require('./cas_parser');
    const algebraMod = require('./cas_algebra');
    const transpilerMod = require('./transpiler');
    module.exports = factory(complexMod, quadMod, parserMod, algebraMod, transpilerMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath, root.OmniMath, root.OmniMath, root.OmniMath, root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(complexDeps, quadDeps, parserDeps, algebraDeps, transpilerDeps) {
  'use strict';

  const Complex = complexDeps.Complex;
  const _add = complexDeps._add;
  const _sub = complexDeps._sub;
  const _mul = complexDeps._mul;
  const _div = complexDeps._div;
  const _pow = complexDeps._pow;
  const _neg = complexDeps._neg;

  const numericalIntegral = quadDeps.numericalIntegral;

  const parse = parserDeps.parse;

  const diff = algebraDeps.diff;
  const integrate = algebraDeps.integrate;
  const solve = algebraDeps.solve;
  const taylor = algebraDeps.taylor;

  const analyzeExpression = transpilerDeps.analyzeExpression;
  const transpileCode = transpilerDeps.transpileCode;
  const transpileCondition = transpilerDeps.transpileCondition;
  const recoverPartialExpression = transpilerDeps.recoverPartialExpression;
  const diagnoseExpression = transpilerDeps.diagnoseExpression;

  function compileAll(items, sliderVars = {}, options = {}) {
    const compiledMap = new Map();
    const envSignals = {};
    const envFunctions = {};
    const angleMode = options.angleMode || 'radians';
    const isDeg = angleMode === 'degrees';
    const toRad = isDeg ? (deg) => (deg * Math.PI) / 180 : (rad) => rad;
    const fromRad = isDeg ? (rad) => (rad * 180) / Math.PI : (rad) => rad;

    const baseContext = {
      // Complex Number Constants & Operations
      i: new Complex(0, 1),
      j: new Complex(0, 1),
      I: new Complex(0, 1),
      J: new Complex(0, 1),
      Complex: Complex,
      complex: (re = 0, im = 0) => new Complex(re, im),
      re: (z) => (z instanceof Complex ? z.re : (typeof z === 'number' ? z : NaN)),
      real: (z) => (z instanceof Complex ? z.re : (typeof z === 'number' ? z : NaN)),
      im: (z) => (z instanceof Complex ? z.im : 0),
      imag: (z) => (z instanceof Complex ? z.im : 0),
      abs: (z) => (z instanceof Complex ? z.abs() : Math.abs(z)),
      mag: (z) => (z instanceof Complex ? z.abs() : Math.abs(z)),
      arg: (z) => (z instanceof Complex ? z.arg() : (z >= 0 ? 0 : Math.PI)),
      angle: (z) => (z instanceof Complex ? z.arg() : (z >= 0 ? 0 : Math.PI)),
      phase: (z) => (z instanceof Complex ? z.arg() : (z >= 0 ? 0 : Math.PI)),
      conj: (z) => (z instanceof Complex ? z.conj() : z),
      _add, _sub, _mul, _div, _pow, _neg,

      delta: (n) => (Math.round(n) === 0 ? 1 : 0),
      u: (n) => (n >= 0 ? 1 : 0),
      r: (n) => (n >= 0 ? n : 0),
      rect: (n, N = 2) => (Math.abs(n) <= N ? 1 : 0),
      sinc: (n) => (n === 0 ? 1 : Math.sin(Math.PI * n) / (Math.PI * n)),
      sin: (x) => (x instanceof Complex ? x.sin() : Math.sin(toRad(x))),
      cos: (x) => (x instanceof Complex ? x.cos() : Math.cos(toRad(x))),
      tan: (x) => (x instanceof Complex ? x.tan() : Math.tan(toRad(x))),
      asin: (x) => fromRad(Math.asin(x)),
      acos: (x) => fromRad(Math.acos(x)),
      atan: (x) => fromRad(Math.atan(x)),
      sinh: (x) => (x instanceof Complex ? x.sinh() : Math.sinh(x)),
      cosh: (x) => (x instanceof Complex ? x.cosh() : Math.cosh(x)),
      tanh: (x) => Math.tanh(x),
      exp: (x) => (x instanceof Complex ? x.exp() : Math.exp(x)),
      log: (x) => (x instanceof Complex ? x.ln() : (typeof x === 'number' && x < 0 ? new Complex(Math.log(-x), Math.PI) : Math.log(x))),
      ln: (x) => (x instanceof Complex ? x.ln() : (typeof x === 'number' && x < 0 ? new Complex(Math.log(-x), Math.PI) : Math.log(x))),
      log10: Math.log10,
      sqrt: (x) => (x instanceof Complex ? x.sqrt() : (typeof x === 'number' && x < 0 ? new Complex(0, Math.sqrt(-x)) : Math.sqrt(x))),
      cbrt: Math.cbrt,
      pow: (a, b) => _pow(a, b),
      sign: Math.sign, sgn: Math.sign,
      floor: Math.floor, ceil: Math.ceil, round: Math.round,
      pi: Math.PI, PI: Math.PI, e: Math.E,
      // Discrete-Time Convolution Operator: conv(s1, s2)
      conv: (sigA, sigB) => (n) => {
        const fnA = typeof sigA === 'function' ? sigA : () => (typeof sigA === 'number' ? sigA : 0);
        const fnB = typeof sigB === 'function' ? sigB : () => (typeof sigB === 'number' ? sigB : 0);
        let acc = 0;
        const K = 50; // 50 samples radius for ultra-smooth 60 FPS
        for (let k = -K; k <= K; k++) {
          const va = fnA(k);
          if (va === 0 || isNaN(va)) continue;
          const vb = fnB(n - k);
          if (vb === 0 || isNaN(vb)) continue;
          acc += va * vb;
        }
        return acc;
      },
      // Finite Summation: sum(start, end, fn)
      sum: (start, end, fn) => {
        const s = Math.round(start);
        const e = Math.round(end);
        if (s > e) return 0;
        let acc = 0;
        for (let k = s; k <= e; k++) {
          const val = typeof fn === 'function' ? fn(k) : fn;
          acc = _add(acc, val);
        }
        return acc;
      },
      // Finite Product: prod(start, end, fn)
      prod: (start, end, fn) => {
        const s = Math.round(start);
        const e = Math.round(end);
        if (s > e) return 1;
        let acc = 1;
        for (let k = s; k <= e; k++) {
          const val = typeof fn === 'function' ? fn(k) : fn;
          acc = _mul(acc, val);
        }
        return acc;
      },
      // Definite Numerical Integration: integral(a, b, fn)
      integral: (a, b, fn) => {
        const f = typeof fn === 'function' ? fn : () => (typeof fn === 'number' ? fn : 0);
        return numericalIntegral(a, b, f);
      },
      int: (a, b, fn) => {
        const f = typeof fn === 'function' ? fn : () => (typeof fn === 'number' ? fn : 0);
        return numericalIntegral(a, b, f);
      },
      // In-line CAS functions
      diff: (e, w = 'x') => diff(parse(e), w),
      integrate: (e, w = 'x') => integrate(parse(e), w),
      solve: (e, w = 'x') => solve(e, w),
      taylor: (e, w = 'x', a = 0, n = 4) => taylor(e, w, a, n),
      ...sliderVars
    };

    const analyzed = items.map(it => {
      const info = analyzeExpression(it.text);
      if (info.kind === 'slider') {
        baseContext[info.name] = it.sliderVal !== undefined ? it.sliderVal : info.value;
      }
      return { item: it, info };
    });

    const knownSliders = Object.keys(sliderVars);
    analyzed.forEach(({ info }) => {
      if ((info.kind === 'slider' || info.kind === 'variable') && info.name) {
        knownSliders.push(info.name);
      }
    });

    // Evaluate and register named variables and complex numbers
    analyzed.forEach(({ info }) => {
      if (info.kind === 'variable' && info.rhs) {
        try {
          const vJs = transpileCode(info.rhs, knownSliders);
          const vFn = new Function('c', `with(c) { return ${vJs}; }`);
          const val = vFn(baseContext);
          if (info.name) {
            baseContext[info.name] = val;
          }
        } catch (e) {}
      }
    });

    analyzed.forEach(({ item, info }) => {
      if (info.name) {
        if (info.kind === 'discrete') {
          envSignals[info.name] = (n) => {
            const entry = compiledMap.get(item.id);
            if (entry && entry.eval) return entry.eval(n, n);
            return 0;
          };
          baseContext[info.name] = envSignals[info.name];
        } else if (info.kind === 'continuous') {
          envFunctions[info.name] = (x) => {
            const entry = compiledMap.get(item.id);
            if (entry && entry.eval) return entry.eval(x, x);
            return 0;
          };
          baseContext[info.name] = envFunctions[info.name];
        }
      }
    });

    const userVars = Object.assign({}, sliderVars);
    analyzed.forEach(({ item, info }) => {
      if (info.kind === 'slider' && info.name) {
        userVars[info.name] = item.sliderVal !== undefined ? item.sliderVal : info.value;
      } else if (info.kind === 'variable' && info.name) {
        userVars[info.name] = baseContext[info.name];
      }
    });

    analyzed.forEach(({ item, info }) => {
      const diag = typeof diagnoseExpression === 'function' ? diagnoseExpression(item.text, userVars, envSignals, envFunctions) : { missingVariables: [], diagnostics: [] };

      if (info.isEmpty || info.kind === 'empty' || (!info.rhs && info.kind !== 'slider' && info.kind !== 'note' && info.kind !== 'folder' && info.kind !== 'variable')) {
        compiledMap.set(item.id, {
          isSlider: false,
          kind: 'empty',
          isEmpty: true,
          name: null,
          eval: () => NaN,
          missingVariables: [],
          diagnostics: []
        });
        return;
      }

      if (info.kind === 'note' || info.kind === 'folder') {
        compiledMap.set(item.id, {
          isNote: info.kind === 'note',
          isFolder: info.kind === 'folder',
          kind: info.kind,
          text: info.noteText || info.title || '',
          eval: () => NaN,
          missingVariables: [],
          diagnostics: []
        });
        return;
      }

      if (info.kind === 'slider') {
        compiledMap.set(item.id, {
          isSlider: true,
          isEmpty: false,
          varName: info.name,
          value: baseContext[info.name],
          kind: 'slider',
          eval: () => baseContext[info.name],
          evalRaw: () => baseContext[info.name],
          missingVariables: diag.missingVariables || [],
          diagnostics: diag.diagnostics || []
        });
        return;
      }

      if (info.kind === 'variable') {
        let val = NaN;
        let vJs = transpileCode(info.rhs, knownSliders);
        try {
          const vFn = new Function('c', `with(c) { return ${vJs}; }`);
          val = vFn(baseContext);
        } catch (err) {
          vJs = recoverPartialExpression(vJs);
          try {
            const vFn = new Function('c', `with(c) { return ${vJs}; }`);
            val = vFn(baseContext);
          } catch(e) {}
        }

        if (info.name) {
          baseContext[info.name] = val;
        }

        if (val instanceof Complex) {
          compiledMap.set(item.id, {
            isSlider: false,
            isEmpty: false,
            kind: 'complex',
            isComplex: true,
            name: info.name,
            value: val,
            rhs: info.rhs,
            evalPoint: () => ({ x: val.re, y: val.im }),
            eval: () => val.re,
            evalRaw: () => val,
            missingVariables: diag.missingVariables,
            diagnostics: diag.diagnostics
          });
          return;
        } else if (typeof val === 'number' && !isNaN(val)) {
          compiledMap.set(item.id, {
            isSlider: true,
            isEmpty: false,
            varName: info.name,
            value: val,
            kind: 'slider',
            eval: () => val,
            evalRaw: () => val,
            missingVariables: [],
            diagnostics: []
          });
          return;
        }
      }

      if (info.kind === 'point' || info.kind === 'parametric') {
        let xCode = transpileCode(info.xExpr, knownSliders);
        let yCode = transpileCode(info.yExpr, knownSliders);
        let xFn = () => NaN, yFn = () => NaN;
        try {
          xFn = new Function('x', 'n', 't', 'c', `with(c) { return ${xCode}; }`);
          yFn = new Function('x', 'n', 't', 'c', `with(c) { return ${yCode}; }`);
        } catch (err) {
          xCode = recoverPartialExpression(xCode);
          yCode = recoverPartialExpression(yCode);
          try {
            xFn = new Function('x', 'n', 't', 'c', `with(c) { return ${xCode}; }`);
            yFn = new Function('x', 'n', 't', 'c', `with(c) { return ${yCode}; }`);
          } catch(e) {}
        }

        compiledMap.set(item.id, {
          isSlider: false,
          isEmpty: false,
          kind: info.kind,
          name: info.name,
          evalPoint: (tVal = 0) => {
            try {
              return { x: xFn(tVal, tVal, tVal, baseContext), y: yFn(tVal, tVal, tVal, baseContext) };
            } catch(e) { return { x: NaN, y: NaN }; }
          },
          eval: (tVal) => {
            try { return yFn(tVal, tVal, tVal, baseContext); } catch(e) { return NaN; }
          },
          missingVariables: diag.missingVariables,
          diagnostics: diag.diagnostics
        });
        return;
      }

      const jsCode = transpileCode(info.rhs, knownSliders);
      let compiledFn;
      let isPartial = false;

      try {
        compiledFn = new Function('x', 'n', 'theta', 't', 'c', `with(c) { return ${jsCode}; }`);
      } catch (err) {
        // Fault-tolerant recovery for partially complete expressions
        const recoveredCode = recoverPartialExpression(jsCode);
        try {
          compiledFn = new Function('x', 'n', 'theta', 't', 'c', `with(c) { return ${recoveredCode}; }`);
          isPartial = true;
        } catch (recoverErr) {
          compiledMap.set(item.id, {
            isSlider: false,
            isEmpty: false,
            kind: info.kind,
            error: err.message,
            isPartial: true,
            eval: () => NaN
          });
          return;
        }
      }

      let condFn = () => true;
      if (info.domainCondition) {
        const condCode = transpileCondition(info.domainCondition);
        try {
          condFn = new Function('x', 'n', 'c', `with(c) { return (${condCode}); }`);
        } catch(e) {}
      }

      let callStackDepth = 0;
      const safeEval = (xVal, nVal, extra = 0) => {
        if (callStackDepth > 50) return NaN;
        callStackDepth++;
        try {
          if (!condFn(xVal, nVal, baseContext)) {
            callStackDepth--;
            return NaN;
          }
          let val = compiledFn(xVal, nVal, xVal, extra, baseContext);
          if (typeof val === 'function') {
            val = val(nVal !== undefined ? nVal : xVal);
          }
          callStackDepth--;
          if (val instanceof Complex) {
            return val.re;
          }
          return (typeof val === 'number' && isFinite(val)) ? val : NaN;
        } catch (e) {
          callStackDepth--;
          return NaN;
        }
      };

      const safeEvalRaw = (xVal, nVal, extra = 0) => {
        if (callStackDepth > 50) return NaN;
        callStackDepth++;
        try {
          if (!condFn(xVal, nVal, baseContext)) {
            callStackDepth--;
            return NaN;
          }
          let val = compiledFn(xVal, nVal, xVal, extra, baseContext);
          if (typeof val === 'function') {
            val = val(nVal !== undefined ? nVal : xVal);
          }
          callStackDepth--;
          return val;
        } catch (e) {
          callStackDepth--;
          return NaN;
        }
      };

      compiledMap.set(item.id, {
        isSlider: false,
        isEmpty: false,
        kind: info.kind,
        name: info.name,
        rhs: info.rhs,
        operator: info.operator || null,
        isPartial,
        hasDomain: !!info.domainCondition,
        eval: safeEval,
        evalRaw: safeEvalRaw,
        missingVariables: diag.missingVariables,
        diagnostics: diag.diagnostics
      });
    });

    return compiledMap;
  }

  function compileExpression(expr, vars = {}) {
    const map = compileAll([{ id: 'single', text: expr }], vars);
    return map.get('single');
  }

  return {
    compileAll,
    compileExpression
  };
});
