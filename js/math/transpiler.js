/**
 * OmniMath: Expression Transpiler & Classifier
 * Classifies expression types and transpiles mathematical syntax into executable JavaScript code.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const parserMod = require('./cas_parser');
    const latexMod = require('./latex_converter');
    module.exports = factory(parserMod, latexMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath, root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(parserDeps, latexDeps) {
  'use strict';

  const parse = parserDeps.parse;
  const astToCode = parserDeps.astToCode;
  const extractBalanced = latexDeps.extractBalanced;
  const splitArgs = latexDeps.splitArgs;

  // --- EXPRESSION CLASSIFIER ---
  function analyzeExpression(rawText) {
    let text = (rawText || '').trim();

    // 0. Empty Expression (Never display/plot on canvas)
    if (!text) {
      return {
        kind: 'empty',
        isEmpty: true,
        name: null,
        rhs: '',
        domainCondition: null
      };
    }

    // Check Folder: starts with "folder:" or "group:"
    if (/^(?:folder|group):/i.test(text)) {
      return {
        kind: 'folder',
        name: null,
        title: text.replace(/^(?:folder|group):\s*/i, '').trim() || 'Untitled Folder'
      };
    }

    // Check Note: starts with " or // or #
    if (text.startsWith('"') || text.startsWith('//') || text.startsWith('#')) {
      return {
        kind: 'note',
        name: null,
        noteText: text.replace(/^["#/\s]+/, '').replace(/["\s]+$/, '')
      };
    }

    // Check Domain Restriction: { condition } (e.g. { -2 <= x <= 2 } or { n >= 0 })
    let domainCondition = null;
    if (!text.includes(':')) {
      const domainMatch = text.match(/\{([^}]+)\}$/);
      if (domainMatch) {
        domainCondition = domainMatch[1].trim();
        text = text.replace(/\{[^}]+\}\s*$/, '').trim();
      }
    }

    // Check Slider / Constant Assignment: a = 2.5 (excluding coordinate variables y and x)
    const sliderMatch = text.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(-?[0-9.]+)$/);
    if (sliderMatch && sliderMatch[1] !== 'y' && sliderMatch[1] !== 'x' && sliderMatch[1] !== 'r') {
      return {
        kind: 'slider',
        name: sliderMatch[1],
        value: parseFloat(sliderMatch[2]),
        rhs: sliderMatch[2],
        domainCondition
      };
    }

    // Check Variable or Complex Number Assignment: z = 3 + 4i, a = 2 + 3, w = exp(i * pi / 4)
    const varAssignMatch = text.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (varAssignMatch && varAssignMatch[1] !== 'y' && varAssignMatch[1] !== 'r' && varAssignMatch[1] !== 'x') {
      const vName = varAssignMatch[1];
      const vRhs = varAssignMatch[2].trim();
      const hasIndependentVar = /\b[xt]\b/.test(vRhs) && !/\b[ij]\b/.test(vRhs);
      if (!hasIndependentVar) {
        return {
          kind: 'variable',
          name: vName,
          rhs: vRhs,
          domainCondition
        };
      }
    }

    // Check Anonymous Complex Number: e.g. 3 + 4i, 2 - 5j, 4i
    if (!text.includes('=') && (/\b[ij]\b/.test(text) || /\bcomplex\b/.test(text)) && !/\b[xtn]\b/.test(text)) {
      return {
        kind: 'variable',
        name: null,
        rhs: text,
        domainCondition
      };
    }

    // Check Inequality: y <= ..., y < ..., y >= ..., y > ...
    const ineqMatch = text.match(/^y\s*(<=|<|>=|>)\s*(.+)$/i);
    if (ineqMatch) {
      return {
        kind: 'inequality',
        operator: ineqMatch[1],
        name: null,
        rhs: ineqMatch[2].trim(),
        domainCondition
      };
    }

    // Check Polar: r = f(theta) or r = f(t)
    const polarMatch = text.match(/^r\s*=\s*(.+)$/i);
    if (polarMatch) {
      return {
        kind: 'polar',
        name: null,
        rhs: polarMatch[1].trim(),
        domainCondition
      };
    }

    // Check Point or Parametric: (x, y) or P = (x, y)
    const pointMatch = text.match(/^(?:([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*)?\(([^,]+),([^)]+)\)$/);
    if (pointMatch) {
      const pName = pointMatch[1] || null;
      const xExpr = pointMatch[2].trim();
      const yExpr = pointMatch[3].trim();
      const hasT = /\bt\b/.test(xExpr) || /\bt\b/.test(yExpr);
      if (hasT) {
        return {
          kind: 'parametric',
          name: pName,
          xExpr,
          yExpr,
          domainCondition
        };
      }
      return {
        kind: 'point',
        name: pName,
        xExpr,
        yExpr,
        domainCondition
      };
    }

    // Check named discrete signal: s1[n] = ...
    const namedDiscreteMatch = text.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*\[\s*([a-zA-Z])\s*\]\s*=\s*(.+)$/);
    if (namedDiscreteMatch) {
      return {
        kind: 'discrete',
        name: namedDiscreteMatch[1],
        argName: namedDiscreteMatch[2],
        rhs: namedDiscreteMatch[3].trim(),
        domainCondition
      };
    }

    // Check named continuous function: f(x) = ...
    const namedFuncMatch = text.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z])\s*\)\s*=\s*(.+)$/);
    if (namedFuncMatch) {
      return {
        kind: 'continuous',
        name: namedFuncMatch[1],
        argName: namedFuncMatch[2],
        rhs: namedFuncMatch[3].trim(),
        domainCondition
      };
    }

    // Check anonymous discrete signal (contains [n] or conv( or delta)
    if (text.includes('[n]') || /\bconv\b/.test(text) || /\bdelta\b/.test(text)) {
      const rhs = text.replace(/^(?:y|s)\s*=\s*/i, '').trim();
      return {
        kind: 'discrete',
        name: null,
        argName: 'n',
        rhs: rhs,
        domainCondition
      };
    }

    // Default continuous curve (e.g. y = sin(x) or sin(x))
    const rhs = text.replace(/^y\s*=\s*/i, '').trim();
    return {
      kind: 'continuous',
      name: null,
      argName: 'x',
      rhs: rhs,
      domainCondition
    };
  }

  // --- PARTIAL EXPRESSION RECOVERY (TYPING FAULT TOLERANCE) ---
  function recoverPartialExpression(code) {
    if (!code || typeof code !== 'string') return 'NaN';
    let c = code.trim();
    if (!c) return 'NaN';

    // Strip trailing incomplete operators, dots, and commas
    let prev = '';
    while (c !== prev) {
      prev = c;
      c = c.replace(/[\s+\-*/^,.]+$/, '').trim();
      c = c.replace(/\*\*+$/, '').replace(/[*+\-/]$/, '').trim();
    }
    if (!c) return 'NaN';

    // If there is an incomplete call like "sin(" or "cos(" -> complete parameter with x
    c = c.replace(/([a-zA-Z0-9_]+)\(\s*$/, '$1(x)');

    // Count unclosed parentheses and brackets
    let openParen = 0;
    let openBracket = 0;
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === '(') openParen++;
      else if (ch === ')') openParen = Math.max(0, openParen - 1);
      else if (ch === '[') openBracket++;
      else if (ch === ']') openBracket = Math.max(0, openBracket - 1);
    }

    while (openBracket > 0) {
      c += ']';
      openBracket--;
    }
    while (openParen > 0) {
      c += ')';
      openParen--;
    }

    return c;
  }

  // --- CODE TRANSPILER ---
  function transpileCode(rhs, knownSliders = []) {
    let code = (rhs || '0').trim();

    // 1. Piecewise Conditionals: { cond1: val1, cond2: val2, defaultVal } or { cond: val, elseVal }
    if (code.startsWith('{') && code.endsWith('}') && code.includes(':')) {
      const inner = code.slice(1, -1).trim();
      const parts = inner.split(',').map(p => p.trim());
      let ternaryChain = 'NaN';
      for (let i = parts.length - 1; i >= 0; i--) {
        const branch = parts[i];
        if (branch.includes(':')) {
          const [condPart, valPart] = branch.split(':');
          const jsCond = transpileCondition(condPart.trim());
          const jsVal = transpileCode(valPart.trim(), knownSliders);
          ternaryChain = `((${jsCond}) ? (${jsVal}) : (${ternaryChain}))`;
        } else {
          ternaryChain = `(${transpileCode(branch, knownSliders)})`;
        }
      }
      return ternaryChain;
    }

    // 2. Summation, Product, and Integral Syntax
    let sumIdx = code.indexOf('sum(');
    while (sumIdx !== -1) {
      const b = extractBalanced(code, sumIdx + 3);
      if (!b) break;
      const parts = splitArgs(b.content);
      let st, en, v = 'k', ex = '0';
      if (parts.length >= 4) {
        v = parts[0].trim();
        st = parts[1].trim();
        en = parts[2].trim();
        ex = parts.slice(3).join(', ');
      } else if (parts.length === 3) {
        if (parts[0].includes('=')) {
          const eqParts = parts[0].split('=');
          v = eqParts[0].trim();
          st = eqParts[1].trim();
          en = parts[1].trim();
          ex = parts[2];
        } else {
          const arrMatch = parts[2].match(/^\(?([a-zA-Z][a-zA-Z0-9_]*)\)?\s*=>\s*(.+)$/);
          if (arrMatch) {
            st = parts[0].trim();
            en = parts[1].trim();
            v = arrMatch[1].trim();
            ex = arrMatch[2];
          } else {
            st = parts[0].trim();
            en = parts[1].trim();
            ex = parts[2];
          }
        }
      }
      if (st !== undefined && en !== undefined) {
        const replacement = `sum(${transpileCode(st, knownSliders)}, ${transpileCode(en, knownSliders)}, (${v}) => (${transpileCode(ex, knownSliders)}))`;
        code = code.slice(0, sumIdx) + replacement + code.slice(b.endIndex + 1);
        sumIdx = code.indexOf('sum(', sumIdx + replacement.length);
      } else {
        sumIdx = code.indexOf('sum(', sumIdx + 4);
      }
    }

    let prodIdx = code.indexOf('prod(');
    while (prodIdx !== -1) {
      const b = extractBalanced(code, prodIdx + 4);
      if (!b) break;
      const parts = splitArgs(b.content);
      let st, en, v = 'k', ex = '1';
      if (parts.length >= 4) {
        v = parts[0].trim();
        st = parts[1].trim();
        en = parts[2].trim();
        ex = parts.slice(3).join(', ');
      } else if (parts.length === 3) {
        if (parts[0].includes('=')) {
          const eqParts = parts[0].split('=');
          v = eqParts[0].trim();
          st = eqParts[1].trim();
          en = parts[1].trim();
          ex = parts[2];
        } else {
          const arrMatch = parts[2].match(/^\(?([a-zA-Z][a-zA-Z0-9_]*)\)?\s*=>\s*(.+)$/);
          if (arrMatch) {
            st = parts[0].trim();
            en = parts[1].trim();
            v = arrMatch[1].trim();
            ex = arrMatch[2];
          } else {
            st = parts[0].trim();
            en = parts[1].trim();
            ex = parts[2];
          }
        }
      }
      if (st !== undefined && en !== undefined) {
        const replacement = `prod(${transpileCode(st, knownSliders)}, ${transpileCode(en, knownSliders)}, (${v}) => (${transpileCode(ex, knownSliders)}))`;
        code = code.slice(0, prodIdx) + replacement + code.slice(b.endIndex + 1);
        prodIdx = code.indexOf('prod(', prodIdx + replacement.length);
      } else {
        prodIdx = code.indexOf('prod(', prodIdx + 5);
      }
    }

    const findNextInt = (str, start = 0) => {
      const i1 = str.indexOf('integral(', start);
      const i2 = str.indexOf('int(', start);
      if (i1 === -1) return i2;
      if (i2 === -1) return i1;
      return Math.min(i1, i2);
    };

    let intIdx = 0;
    while ((intIdx = findNextInt(code, intIdx)) !== -1) {
      const isLong = code.startsWith('integral(', intIdx);
      const openIdx = intIdx + (isLong ? 8 : 3);
      const b = extractBalanced(code, openIdx);
      if (!b) {
        intIdx += 4;
        continue;
      }
      const parts = splitArgs(b.content);
      let a, bBound, v = 'x', ex = '0';
      if (parts.length >= 4) {
        a = parts[0].trim();
        bBound = parts[1].trim();
        ex = parts[2];
        v = parts[3].trim();
      } else if (parts.length === 3) {
        a = parts[0].trim();
        bBound = parts[1].trim();
        const arrMatch = parts[2].match(/^\(?([a-zA-Z][a-zA-Z0-9_]*)\)?\s*=>\s*(.+)$/);
        if (arrMatch) {
          v = arrMatch[1].trim();
          ex = arrMatch[2];
        } else {
          ex = parts[2];
          if (bBound === 'x') v = 't';
          else v = 'x';
        }
      }
      if (a !== undefined && bBound !== undefined) {
        const replacement = `integral(${transpileCode(a, knownSliders)}, ${transpileCode(bBound, knownSliders)}, (${v}) => (${transpileCode(ex, knownSliders)}))`;
        code = code.slice(0, intIdx) + replacement + code.slice(b.endIndex + 1);
        intIdx = intIdx + replacement.length;
      } else {
        intIdx += 4;
      }
    }

    // 3. Robust Implicit Multiplication:
    // a. Number before variable, identifier, or opening paren: 2x -> 2*x, 3(x+1) -> 3*(x+1), 0.5u[n] -> 0.5*u[n]
    code = code.replace(/(?<![a-zA-Z_])(\d+(?:\.\d+)?)\s*([a-zA-Z(])/g, (match, p1, p2) => {
      return `${p1}*${p2}`;
    });

    // b. Closing paren or bracket before variable, number, or opening paren: (x+1)x -> (x+1)*x, (x+1)(x-1) -> (x+1)*(x-1)
    code = code.replace(/([)\]])\s*([a-zA-Z0-9_(])/g, '$1*$2');

    // c. Constants pi and e followed by variable: pi x -> pi*x, e x -> e*x
    code = code.replace(/\b(pi|e)\s+([a-zA-Z(])/g, '$1*$2');

    // d. Coordinate variables (x, n, t, theta, y, z, pi, e) and sliders followed by open paren: x(x+1) -> x*(x+1)
    const extraVars = Array.isArray(knownSliders) && knownSliders.length > 0 ? `|${knownSliders.join('|')}` : '';
    const multVarPattern = new RegExp(`\\b(x|n|t|theta|y|z|pi|e${extraVars})\\s*\\(`, 'g');
    code = code.replace(multVarPattern, '$1*(');

    // e. Variable or identifier followed by variable (e.g. k x -> k*x, a b -> a*b, excluding known function names)
    const reservedFns = new Set([
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
      'exp', 'ln', 'log', 'log10', 'sqrt', 'cbrt', 'delta', 'u', 'r', 'rect',
      'sinc', 'conv', 'diff', 'integrate', 'solve', 'taylor', 'sum', 'prod',
      'integral', 'int', 're', 'real', 'im', 'imag', 'abs', 'mag', 'arg', 'angle',
      'phase', 'conj', 'complex', 'floor', 'ceil', 'round', 'sign', 'sgn'
    ]);
    code = code.replace(/\b([a-zA-Z][a-zA-Z0-9_]*)\s+([a-zA-Z][a-zA-Z0-9_]*)\b/g, (m, a, b) => {
      if (reservedFns.has(a.toLowerCase())) return m;
      return `${a}*${b}`;
    });

    // 4. Discrete Signal Notation: delta[n] -> delta(n), u[n] -> u(n), s1[n] -> s1(n)
    code = code
      .replace(/delta\[([^\]]+)\]/g, 'delta($1)')
      .replace(/u\[([^\]]+)\]/g, 'u($1)')
      .replace(/r\[([^\]]+)\]/g, 'r($1)')
      .replace(/rect\[([^\]]+)\]/g, 'rect($1)')
      .replace(/sinc\[([^\]]+)\]/g, 'sinc($1)')
      .replace(/([a-zA-Z][a-zA-Z0-9_]*)\[([^\]]+)\]/g, '$1($2)')
      .replace(/\^/g, '**');

    // 5. AST Operator Lifting for Complex Numbers & Polymorphic Arithmetic
    try {
      if (!code.includes('=>') && !code.includes('?') && !code.includes(';')) {
        const ast = parse(code.replace(/\*\*/g, '^'));
        if (ast) {
          return astToCode(ast);
        }
      }
    } catch (e) {}

    return code;
  }

  function transpileCondition(cond) {
    if (!cond) return 'true';
    let c = cond.trim();
    // Chained comparisons: a <= x <= b
    c = c.replace(/([a-zA-Z0-9_.-]+)\s*([<>]=?)\s*([a-zA-Z0-9_]+)\s*([<>]=?)\s*([a-zA-Z0-9_.-]+)/g, '($1 $2 $3 && $3 $4 $5)');
    // Standalone equals -> === (guarding <=, >=, !=, ==)
    c = c.replace(/(?<![<>!=])=(?!=)/g, '===');
    return c;
  }

  // --- EXPRESSION DIAGNOSTICS & UNDEFINED VARIABLE DETECTION ---
  const STANDARD_MATH_IDENTIFIERS = new Set([
    // Math functions
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
    'exp', 'log', 'ln', 'log10', 'log2', 'sqrt', 'cbrt', 'pow',
    'abs', 'mag', 'arg', 'angle', 'phase', 'conj', 'real', 're', 'imag', 'im',
    'complex', 'Complex', 'floor', 'ceil', 'round', 'sign', 'sgn',
    'conv', 'diff', 'integrate', 'solve', 'taylor', 'sum', 'prod', 'integral', 'int',
    // Signal functions
    'delta', 'u', 'rect', 'sinc',
    // Constants
    'pi', 'PI', 'e', 'i', 'j', 'I', 'J', 'NaN', 'Infinity', 'true', 'false',
    'dx', 'dt', 'dn'
  ]);

  function diagnoseExpression(rawText, definedVars = {}, definedSignals = {}, definedFunctions = {}) {
    const text = (rawText || '').trim();
    if (!text || text.startsWith('//') || text.startsWith('"') || text.startsWith('#') || /^(?:folder|group):/i.test(text)) {
      return { missingVariables: [], diagnostics: [] };
    }

    const diagnostics = [];
    const missingVariables = [];

    // 1. Bracket & Parenthesis Balancing
    let openParen = 0;
    let openBracket = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(') openParen++;
      else if (ch === ')') openParen = Math.max(0, openParen - 1);
      else if (ch === '[') openBracket++;
      else if (ch === ']') openBracket = Math.max(0, openBracket - 1);
    }

    if (openParen > 0) {
      diagnostics.push({
        severity: 'error',
        code: 'UNCLOSED_PAREN',
        message: `Missing ${openParen} closing parenthesis ')'`,
        fix: { type: 'append_char', char: ')'.repeat(openParen), label: `Close with ${')'.repeat(openParen)}` }
      });
    }

    if (openBracket > 0) {
      diagnostics.push({
        severity: 'error',
        code: 'UNCLOSED_BRACKET',
        message: `Missing ${openBracket} closing bracket ']'`,
        fix: { type: 'append_char', char: ']'.repeat(openBracket), label: `Close with ${']'.repeat(openBracket)}` }
      });
    }

    // 2. Classify expression
    const analysis = analyzeExpression(text);
    if (analysis.kind === 'slider' || analysis.kind === 'empty' || analysis.kind === 'note' || analysis.kind === 'folder') {
      return { missingVariables, diagnostics };
    }

    // Determine RHS and independent variable
    let rhs = analysis.rhs || '';
    if (analysis.kind === 'point' || analysis.kind === 'parametric') {
      rhs = `${analysis.xExpr} + ${analysis.yExpr}`;
    }

    // Strip sum / integral dummy variables e.g. sum(k=1, 10, ...) or integrate(t, 0, 1, ...)
    const localDummyVars = new Set();
    const sumMatch = rhs.match(/\bsum\s*\(\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=/g);
    if (sumMatch) {
      sumMatch.forEach(m => {
        const v = m.replace(/\bsum\s*\(\s*/, '').replace('=', '').trim();
        if (v) localDummyVars.add(v);
      });
    }
    const intMatch = rhs.match(/\bintegrate\s*\(\s*([a-zA-Z][a-zA-Z0-9_]*)\s*,/g);
    if (intMatch) {
      intMatch.forEach(m => {
        const v = m.replace(/\bintegrate\s*\(\s*/, '').replace(',', '').trim();
        if (v) localDummyVars.add(v);
      });
    }

    // 3. Variable clash: Continuous vs Discrete
    if (analysis.kind === 'discrete') {
      // RHS should use n, not x (unless x is defined as slider or signal)
      if (/\bx\b/.test(rhs) && !definedVars.hasOwnProperty('x') && !definedSignals.hasOwnProperty('x')) {
        diagnostics.push({
          severity: 'warning',
          code: 'CONTINUOUS_IN_DISCRETE',
          message: `Variable 'x' used in discrete signal. Did you mean 'n'?`,
          fix: { type: 'replace_var', from: 'x', to: 'n', label: 'Replace x with n' }
        });
      }
    } else if (analysis.kind === 'continuous') {
      // If RHS uses n without n being a slider, suggest replacing or defining
      if (/\bn\b/.test(rhs) && !definedVars.hasOwnProperty('n') && !localDummyVars.has('n')) {
        diagnostics.push({
          severity: 'warning',
          code: 'DISCRETE_IN_CONTINUOUS',
          message: `Variable 'n' used in continuous function. Did you mean 'x' or a slider?`,
          fix: { type: 'replace_var', from: 'n', to: 'x', label: 'Replace n with x' }
        });
      }
    }

    // 4. Extract all identifiers in RHS
    const validCoords = new Set();
    if (analysis.argName) {
      validCoords.add(analysis.argName);
    }
    if (analysis.kind === 'continuous') {
      validCoords.add('x');
    } else if (analysis.kind === 'discrete') {
      validCoords.add('n');
    } else if (analysis.kind === 'polar') {
      validCoords.add('theta');
      validCoords.add('phi');
      validCoords.add('t');
    } else if (analysis.kind === 'parametric') {
      validCoords.add('t');
      validCoords.add('theta');
    } else if (analysis.kind === 'implicit') {
      validCoords.add('x');
      validCoords.add('y');
    } else if (analysis.kind === 'inequality') {
      validCoords.add('x');
    }

    const identifierMatches = rhs.match(/\b[a-zA-Z][a-zA-Z0-9_]*\b/g) || [];
    const seen = new Set();

    for (const id of identifierMatches) {
      if (seen.has(id)) continue;
      seen.add(id);

      // Check if built-in, local dummy, valid coordinate, defined variable, signal, or function
      if (STANDARD_MATH_IDENTIFIERS.has(id)) continue;
      if (validCoords.has(id)) continue;
      if (id === 'r' && new RegExp('\\br\\s*[\\[\\(]').test(rhs)) continue;
      if (localDummyVars.has(id)) continue;
      if (definedVars.hasOwnProperty(id)) continue;
      if (definedSignals.hasOwnProperty(id)) continue;
      if (definedFunctions.hasOwnProperty(id)) continue;
      if (analysis.name === id) continue; // recursive self-reference or definition

      // Found an undefined variable!
      missingVariables.push(id);
      diagnostics.push({
        severity: 'warning',
        code: 'UNDEFINED_VARIABLE',
        message: `Undefined variable '${id}'`,
        fix: { type: 'add_slider', variable: id, label: `Add slider ${id} = 1` }
      });
    }

    return { missingVariables, diagnostics };
  }

  return {
    analyzeExpression,
    recoverPartialExpression,
    transpileCode,
    transpileCondition,
    diagnoseExpression
  };
});
