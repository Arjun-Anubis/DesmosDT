const fs = require('fs');

global.window = global;
global.self = global;

eval(fs.readFileSync('js/cas_math.js', 'utf8'));

const GL10_NODES = [
  0.1488743389816312,
  0.4333953941292472,
  0.6794095682990244,
  0.8650633666889845,
  0.9739065285171717
];
const GL10_WEIGHTS = [
  0.2955242247147529,
  0.2692667193099963,
  0.2190863625159820,
  0.1494513491505806,
  0.0666713443086881
];

function integrateGL10(fn, a, b) {
  const m = (a + b) / 2;
  const h = (b - a) / 2;
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const dx = h * GL10_NODES[i];
    sum += GL10_WEIGHTS[i] * (fn(m + dx) + fn(m - dx));
  }
  return h * sum;
}

function numericalIntegral(a, b, fn) {
  if (typeof a !== 'number' || typeof b !== 'number' || isNaN(a) || isNaN(b)) return NaN;
  if (a === b) return 0;
  if (b < a) return -numericalIntegral(b, a, fn);
  const len = b - a;
  const steps = Math.min(64, Math.max(1, Math.ceil(len / 4)));
  const stepSize = len / steps;
  let total = 0;
  for (let s = 0; s < steps; s++) {
    const subA = a + s * stepSize;
    const subB = subA + stepSize;
    total += integrateGL10(fn, subA, subB);
  }
  return total;
}

function extractBraced(str, startIndex) {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return { content: str.slice(startIndex + 1, i), endIndex: i };
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

function myTranspile(code, knownSliders = []) {
  let c = code;

  // Summation
  let sumIdx = c.indexOf('sum(');
  while (sumIdx !== -1) {
    const b = extractBalanced(c, sumIdx + 3);
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
      const replacement = `sum(${myTranspile(st, knownSliders)}, ${myTranspile(en, knownSliders)}, (${v}) => (${myTranspile(ex, knownSliders)}))`;
      c = c.slice(0, sumIdx) + replacement + c.slice(b.endIndex + 1);
      sumIdx = c.indexOf('sum(', sumIdx + replacement.length);
    } else {
      sumIdx = c.indexOf('sum(', sumIdx + 4);
    }
  }

  // Integral
  const findNextInt = (str, start = 0) => {
    const i1 = str.indexOf('integral(', start);
    const i2 = str.indexOf('int(', start);
    if (i1 === -1) return i2;
    if (i2 === -1) return i1;
    return Math.min(i1, i2);
  };

  let intIdx = 0;
  while ((intIdx = findNextInt(c, intIdx)) !== -1) {
    const isLong = c.startsWith('integral(', intIdx);
    const openIdx = intIdx + (isLong ? 8 : 3);
    const b = extractBalanced(c, openIdx);
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
      const replacement = `integral(${myTranspile(a, knownSliders)}, ${myTranspile(bBound, knownSliders)}, (${v}) => (${myTranspile(ex, knownSliders)}))`;
      c = c.slice(0, intIdx) + replacement + c.slice(b.endIndex + 1);
      intIdx = intIdx + replacement.length;
    } else {
      intIdx += 4;
    }
  }

  // Implicit multiplication: 2x -> 2*x, k x -> k*x
  c = c.replace(/(?<![a-zA-Z_])(\d+(?:\.\d+)?)\s*([a-zA-Z(])/g, '$1*$2');
  c = c.replace(/([)\]])\s*([a-zA-Z0-9_(])/g, '$1*$2');
  c = c.replace(/\b([a-zA-Z][a-zA-Z0-9_]*)\s+([a-zA-Z][a-zA-Z0-9_]*)\b/g, '$1*$2');
  c = c.replace(/\^/g, '**');

  return c;
}

// Build context
const ctx = {
  cos: Math.cos,
  sin: Math.sin,
  PI: Math.PI,
  pi: Math.PI,
  integral: (a, b, fn) => numericalIntegral(a, b, fn),
  int: (a, b, fn) => numericalIntegral(a, b, fn),
  sum: (st, en, fn) => {
    let acc = 0;
    const s = Math.round(st), e = Math.round(en);
    for (let k = s; k <= e; k++) acc += (typeof fn === 'function' ? fn(k) : fn);
    return acc;
  }
};

console.log('Testing Transpiled Evaluations:');

// Item 1: y = \int_{0}^{x} \cos(t) dt
const i1Math = OmniMath.latexToMath(resolveIntegrals('\\int_{0}^{x} \\cos(t) dt'));
const i1Js = myTranspile(i1Math);
console.log('Item 1 JS:', i1Js);
const fn1 = new Function('x', 'c', `with(c) { return ${i1Js}; }`);
console.log('Item 1 at x = pi/2:', fn1(Math.PI / 2, ctx), '(expected 1.0)');
console.log('Item 1 at x = 0:', fn1(0, ctx), '(expected 0.0)');
console.log('Item 1 at x = pi:', fn1(Math.PI, ctx), '(expected 0.0)');

// Item 2: s1[n] = \sum_{k=0}^{n} (0.5)^k
const s2Math = OmniMath.latexToMath(resolveSums('\\sum_{k=0}^{n} (0.5)^k'));
const s2Js = myTranspile(s2Math);
console.log('\nItem 2 JS:', s2Js);
const fn2 = new Function('n', 'c', `with(c) { return ${s2Js}; }`);
console.log('Item 2 at n = 0:', fn2(0, ctx), '(expected 1.0)');
console.log('Item 2 at n = 1:', fn2(1, ctx), '(expected 1.5)');
console.log('Item 2 at n = 2:', fn2(2, ctx), '(expected 1.75)');
console.log('Item 2 at n = 3:', fn2(3, ctx), '(expected 1.875)');

// Item 3: y = \sum_{k=1}^{5} \frac{\sin(k x)}{k}
const s3Math = OmniMath.latexToMath(resolveSums('\\sum_{k=1}^{5} \\frac{\\sin(k x)}{k}'));
const s3Js = myTranspile(s3Math);
console.log('\nItem 3 JS:', s3Js);
const fn3 = new Function('x', 'c', `with(c) { return ${s3Js}; }`);
console.log('Item 3 at x = 1:', fn3(1, ctx));

// Item 4: I1 = \int_{0}^{1} x^2 dx
const i4Math = OmniMath.latexToMath(resolveIntegrals('\\int_{0}^{1} x^2 dx'));
const i4Js = myTranspile(i4Math);
console.log('\nItem 4 JS:', i4Js);
const fn4 = new Function('c', `with(c) { return ${i4Js}; }`);
console.log('Item 4 scalar value:', fn4(ctx), '(expected 0.33333333333333337)');
