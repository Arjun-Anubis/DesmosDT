/**
 * OmniMath: LaTeX & Mathematical Notation Converter
 * Bidirectional conversion between MathQuill LaTeX representations and computable math expressions.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const parserMod = require('./cas_parser');
    module.exports = factory(parserMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(parserDeps) {
  'use strict';

  const parse = parserDeps.parse;

  // --- AST TO LATEX PRINTER ---
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
    if (fn === 'sum' && args.length === 3) {
      return `\\sum_{${toLatex(args[0])}}^{${toLatex(args[1])}}{${toLatex(args[2])}}`;
    }
    if ((fn === 'integral' || fn === 'int') && (args.length === 3 || args.length === 4)) {
      const wrt = args.length === 4 ? toLatex(args[3]) : 't';
      return `\\int_{${toLatex(args[0])}}^{${toLatex(args[1])}}{${toLatex(args[2])}} d${wrt}`;
    }
    // Preserve discrete signal square brackets (e.g. s1[n], delta[n], u[n])
    const isDiscreteSignal = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(fn) && (node.isBracket || fn === 'u' || fn === 'delta' || (fn.startsWith('s') && fn.length <= 4) || (args.length === 1 && args[0].name === 'n'));
    if (isDiscreteSignal) {
      return `${fn}[${args.map(toLatex).join(', ')}]`;
    }
    return `${fn}(${args.map(toLatex).join(', ')})`;
  }

  // --- SMART NUMBER & FRACTION FORMATTER ---
  function formatCoordinate(val) {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return 'NaN';
    if (Math.abs(val - Math.round(val)) < 1e-6) return `${Math.round(val)}`;

    const fractions = [
      { v: 0.5, str: '1/2' }, { v: -0.5, str: '-1/2' },
      { v: 0.25, str: '1/4' }, { v: -0.25, str: '-1/4' },
      { v: 0.75, str: '3/4' }, { v: -0.75, str: '-3/4' },
      { v: 1/3, str: '1/3' }, { v: -1/3, str: '-1/3' },
      { v: 2/3, str: '2/3' }, { v: -2/3, str: '-2/3' },
      { v: 0.125, str: '1/8' }, { v: 0.375, str: '3/8' },
      { v: 0.625, str: '5/8' }, { v: 0.875, str: '7/8' },
      { v: Math.PI, str: 'π' }, { v: -Math.PI, str: '-π' },
      { v: 2 * Math.PI, str: '2π' }, { v: Math.PI / 2, str: 'π/2' }
    ];
    for (const f of fractions) {
      if (Math.abs(val - f.v) < 1e-4) return f.str;
    }
    return `${Number(val.toFixed(3))}`;
  }

  // --- DELIMITER & BRACKET EXTRACTORS ---
  function extractBraced(str, startIndex) {
    if (str[startIndex] !== '{') return null;
    let depth = 0;
    for (let i = startIndex; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          return {
            content: str.slice(startIndex + 1, i),
            endIndex: i
          };
        }
      }
    }
    return null;
  }

  function extractBalanced(str, openIdx, openChar = '(', closeChar = ')') {
    if (str[openIdx] !== openChar) return null;
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === openChar) depth++;
      else if (str[i] === closeChar) {
        depth--;
        if (depth === 0) return { content: str.slice(openIdx + 1, i), endIndex: i };
      }
    }
    return null;
  }

  function splitArgs(str) {
    let depth = 0, parts = [], cur = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function resolveFractions(s) {
    let idx = s.indexOf('\\frac');
    while (idx !== -1) {
      let numStart = s.indexOf('{', idx);
      if (numStart === -1) break;
      const num = extractBraced(s, numStart);
      if (!num) break;
      let denStart = s.indexOf('{', num.endIndex + 1);
      if (denStart === -1 || s.slice(num.endIndex + 1, denStart).trim() !== '') break;
      const den = extractBraced(s, denStart);
      if (!den) break;

      const numParsed = resolveFractions(num.content);
      const denParsed = resolveFractions(den.content);
      const replacement = `((${numParsed})/(${denParsed}))`;

      s = s.slice(0, idx) + replacement + s.slice(den.endIndex + 1);
      idx = s.indexOf('\\frac');
    }
    return s;
  }

  function resolveSums(s) {
    let idx = s.lastIndexOf('\\sum');
    while (idx !== -1) {
      let cursor = idx + 4;
      let sub = null, sup = null;
      for (let round = 0; round < 2; round++) {
        while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
        if (cursor < s.length && s[cursor] === '_') {
          cursor++;
          while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
          if (s[cursor] === '{') {
            const b = extractBraced(s, cursor);
            if (b) { sub = b.content; cursor = b.endIndex + 1; }
          } else {
            sub = s[cursor++];
          }
        } else if (cursor < s.length && s[cursor] === '^') {
          cursor++;
          while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
          if (s[cursor] === '{') {
            const b = extractBraced(s, cursor);
            if (b) { sup = b.content; cursor = b.endIndex + 1; }
          } else {
            sup = s[cursor++];
          }
        }
      }

      if (sub !== null && sup !== null) {
        while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
        let expr = '', exprEnd = cursor;
        if (cursor < s.length && s[cursor] === '{') {
          const b = extractBraced(s, cursor);
          if (b) { expr = b.content; exprEnd = b.endIndex + 1; }
        } else {
          let depth = 0;
          let end = cursor;
          while (end < s.length) {
            const ch = s[end];
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') {
              if (depth === 0) break;
              depth--;
            } else if ((ch === '+' || ch === '-') && depth === 0 && end > cursor) {
              break;
            }
            end++;
          }
          expr = s.slice(cursor, end).trim();
          exprEnd = end;
        }

        let varName = 'k', startVal = '0';
        if (sub.includes('=')) {
          const parts = sub.split('=');
          varName = parts[0].trim();
          startVal = parts[1].trim();
        } else {
          startVal = sub.trim();
        }
        const replacement = `sum(${varName}=${startVal}, ${sup}, (${expr}))`;
        s = s.slice(0, idx) + replacement + s.slice(exprEnd);
        idx = s.lastIndexOf('\\sum');
      } else {
        break;
      }
    }
    return s;
  }

  function resolveIntegrals(s) {
    let idx = s.lastIndexOf('\\int');
    while (idx !== -1) {
      let cursor = idx + 4;
      let sub = null, sup = null;
      for (let round = 0; round < 2; round++) {
        while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
        if (cursor < s.length && s[cursor] === '_') {
          cursor++;
          while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
          if (s[cursor] === '{') {
            const b = extractBraced(s, cursor);
            if (b) { sub = b.content; cursor = b.endIndex + 1; }
          } else {
            sub = s[cursor++];
          }
        } else if (cursor < s.length && s[cursor] === '^') {
          cursor++;
          while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
          if (s[cursor] === '{') {
            const b = extractBraced(s, cursor);
            if (b) { sup = b.content; cursor = b.endIndex + 1; }
          } else {
            sup = s[cursor++];
          }
        }
      }

      while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
      let expr = '', exprEnd = cursor, wrt = 'x';

      const remainder = s.slice(cursor);
      const diffMatch = remainder.match(/^(.*?)(?:\\,|\\s|\s)*(?:\\mathrm\{d\}|\\text\{d\}|d)([a-zA-Z]|\\theta)(?=\s*[\+\-\)]|$)/);
      if (diffMatch && diffMatch[1] !== undefined) {
        expr = diffMatch[1].trim();
        wrt = diffMatch[2].replace('\\', '').trim();
        exprEnd = cursor + diffMatch[0].length;
      } else {
        let end = cursor;
        let depth = 0;
        while (end < s.length) {
          const ch = s[end];
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          else if (ch === ')' || ch === ']' || ch === '}') {
            if (depth === 0) break;
            depth--;
          } else if ((ch === '+' || ch === '-') && depth === 0 && end > cursor) {
            break;
          }
          end++;
        }
        expr = s.slice(cursor, end).trim();
        exprEnd = end;
        if (sup && sup.trim() === 'x') wrt = 't';
        else wrt = 'x';
      }

      if (expr.startsWith('{') && expr.endsWith('}')) {
        expr = expr.slice(1, -1).trim();
      }

      let replacement = '';
      if (sub !== null && sup !== null) {
        replacement = `integral(${sub}, ${sup}, (${wrt}) => (${expr}))`;
      } else {
        replacement = `integrate((${expr}), '${wrt}')`;
      }

      s = s.slice(0, idx) + replacement + s.slice(exprEnd);
      idx = s.lastIndexOf('\\int');
    }
    return s;
  }

  function convertSumsToLatex(s) {
    let idx = s.indexOf('sum(');
    while (idx !== -1) {
      const b = extractBalanced(s, idx + 3);
      if (!b) break;
      const parts = splitArgs(b.content);
      if (parts.length >= 3) {
        const lower = parts[0];
        const upper = parts[1];
        let expr = parts.slice(2).join(', ');
        if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();
        const replacement = `\\sum_{${lower}}^{${upper}}{${expr}}`;
        s = s.slice(0, idx) + replacement + s.slice(b.endIndex + 1);
        idx = s.indexOf('sum(', idx + replacement.length);
      } else {
        idx = s.indexOf('sum(', idx + 4);
      }
    }
    return s;
  }

  function convertIntegralsToLatex(s) {
    let idx = -1;
    const findNext = (start = 0) => {
      const i1 = s.indexOf('integral(', start);
      const i2 = s.indexOf('int(', start);
      if (i1 === -1) return i2;
      if (i2 === -1) return i1;
      return Math.min(i1, i2);
    };

    let curIdx = 0;
    while ((idx = findNext(curIdx)) !== -1) {
      const isIntegral = s.startsWith('integral(', idx);
      const openIdx = idx + (isIntegral ? 8 : 3);
      const b = extractBalanced(s, openIdx);
      if (!b) {
        curIdx = idx + 4;
        continue;
      }
      const parts = splitArgs(b.content);
      if (parts.length === 3) {
        const a = parts[0];
        const bBound = parts[1];
        let fnStr = parts[2];
        let wrt = 't', expr = fnStr;
        const arrowMatch = fnStr.match(/^\(?([a-zA-Z][a-zA-Z0-9_]*)\)?\s*=>\s*(.+)$/);
        if (arrowMatch) {
          wrt = arrowMatch[1];
          expr = arrowMatch[2];
        }
        if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();
        const replacement = `\\int_{${a}}^{${bBound}}{${expr}} d${wrt}`;
        s = s.slice(0, idx) + replacement + s.slice(b.endIndex + 1);
        curIdx = idx + replacement.length;
      } else if (parts.length === 4) {
        const a = parts[0];
        const bBound = parts[1];
        let expr = parts[2];
        const wrt = parts[3];
        if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();
        const replacement = `\\int_{${a}}^{${bBound}}{${expr}} d${wrt}`;
        s = s.slice(0, idx) + replacement + s.slice(b.endIndex + 1);
        curIdx = idx + replacement.length;
      } else {
        curIdx = idx + 4;
      }
    }
    return s;
  }

  function findTopLevelEquals(str) {
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === '=' && depth === 0) {
        const prev = i > 0 ? str[i - 1] : '';
        const next = i < str.length - 1 ? str[i + 1] : '';
        if (prev !== '<' && prev !== '>' && prev !== '!' && prev !== '=' && next !== '=') {
          return i;
        }
      }
    }
    return -1;
  }

  function latexToMath(latex) {
    if (!latex || typeof latex !== 'string') return '';
    let s = latex.trim();

    // Remove formatting spacing
    s = s.replace(/\\ /g, ' ').replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\!/g, '');
    s = s.replace(/\\left/g, '').replace(/\\right/g, '');
    s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
    s = s.replace(/\\div/g, '/');

    // Convert LaTeX sums and integrals into standard mathematical function notation
    s = resolveSums(s);
    s = resolveIntegrals(s);

    // Fractions with balanced brace resolver
    s = resolveFractions(s);

    // Constants & Greek
    s = s.replace(/\\pi\b/g, 'pi');
    s = s.replace(/\\theta\b/g, 'theta');

    // Math functions
    s = s.replace(/\\(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|exp|ln|log|sqrt|delta|u|r|rect|sinc|conv|diff|integrate|solve|taylor|sum|prod|integral|int)\b/g, '$1');

    // Inequalities
    s = s.replace(/\\le\b/g, '<=').replace(/\\ge\b/g, '>=').replace(/\\ne\b/g, '!=');

    // Square roots \sqrt{x} -> sqrt(x)
    while (s.includes('\\sqrt')) {
      const sqIdx = s.indexOf('\\sqrt');
      const bIdx = s.indexOf('{', sqIdx);
      if (bIdx === -1) break;
      const br = extractBraced(s, bIdx);
      if (!br) break;
      s = s.slice(0, sqIdx) + `sqrt(${latexToMath(br.content)})` + s.slice(br.endIndex + 1);
    }

    // Exponents x^{2} -> x^(2)
    s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');

    // Subscripts s_{1} -> s1, s_1 -> s1
    s = s.replace(/([a-zA-Z])_\{([a-zA-Z0-9]+)\}/g, '$1$2');
    s = s.replace(/([a-zA-Z])_([a-zA-Z0-9])/g, '$1$2');

    // Clean brackets
    s = s.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

    // Remaining single backslashes
    s = s.replace(/\\/g, '');

    return s.trim();
  }

  function mathToLatex(text) {
    if (!text || typeof text !== 'string') return '';
    let s = text.trim();

    // Convert function-style sums and integrals to LaTeX first
    s = convertSumsToLatex(s);
    s = convertIntegralsToLatex(s);

    if (s.includes('\\')) return s;

    // Split assignments (e.g. y = ..., a = ...) at top level
    const eqIdx = findTopLevelEquals(s);
    if (eqIdx !== -1) {
      const lhs = s.slice(0, eqIdx).trim();
      const rhs = s.slice(eqIdx + 1).trim();
      return `${mathToLatex(lhs)} = ${mathToLatex(rhs)}`;
    }

    try {
      const ast = parse(s);
      if (ast) {
        return toLatex(ast);
      }
    } catch (e) {}

    s = s.replace(/\bsin\b/g, '\\sin')
         .replace(/\bcos\b/g, '\\cos')
         .replace(/\btan\b/g, '\\tan')
         .replace(/\basin\b/g, '\\arcsin')
         .replace(/\bacos\b/g, '\\arccos')
         .replace(/\batan\b/g, '\\arctan')
         .replace(/\bsqrt\(([^)]+)\)/g, '\\sqrt{$1}')
         .replace(/\bpi\b/g, '\\pi')
         .replace(/\btheta\b/g, '\\theta')
         .replace(/\*/g, ' \\cdot ')
         .replace(/<=/g, ' \\le ')
         .replace(/>=/g, ' \\ge ')
         .replace(/!=/g, ' \\ne ')
         .replace(/\^([a-zA-Z0-9]+)/g, '^{$1}')
         .replace(/([a-zA-Z])([0-9]+)\[/g, '$1_{$2}[')
         .replace(/\[([^\]]+)\]/g, '[$1]');
    return s;
  }

  return {
    toLatex,
    formatCoordinate,
    extractBraced,
    extractBalanced,
    splitArgs,
    resolveFractions,
    resolveSums,
    resolveIntegrals,
    convertSumsToLatex,
    convertIntegralsToLatex,
    findTopLevelEquals,
    latexToMath,
    mathToLatex
  };
});
