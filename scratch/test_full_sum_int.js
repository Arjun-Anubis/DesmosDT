const fs = require('fs');

global.window = global;
eval(fs.readFileSync('js/cas_math.js', 'utf8'));

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

function resolveSums(s) {
  let idx = s.indexOf('\\sum');
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
          } else if (ch === '+' || ch === '-') {
            if (depth === 0 && end > cursor) break;
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
      idx = s.indexOf('\\sum', idx + replacement.length);
    } else {
      idx = s.indexOf('\\sum', idx + 4);
    }
  }
  return s;
}

function resolveIntegrals(s) {
  let idx = s.indexOf('\\int');
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

    // Now look for differential d<var> at end of integrand (e.g. dx, dt, d\theta)
    while (cursor < s.length && /\s/.test(s[cursor])) cursor++;
    let expr = '', exprEnd = cursor, wrt = 'x';

    // Read until differential d<var> or end
    let diffMatch = s.slice(cursor).match(/(.*?)(?:\\,|\\s|\s)*d([a-zA-Z]|\\theta)(?=\s*[\+\-\)]|$)/);
    if (diffMatch) {
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
        }
        end++;
      }
      expr = s.slice(cursor, end).trim();
      exprEnd = end;
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
    idx = s.indexOf('\\int', idx + replacement.length);
  }
  return s;
}

// 10-point Gauss-Legendre Quadrature
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

console.log('--- TEST SUM CONVERSION ---');
const s1 = resolveSums('\\sum_{k=0}^{n} (0.5)^k');
console.log('s1 converted:', s1);

console.log('\n--- TEST INTEGRAL CONVERSION ---');
const i1 = resolveIntegrals('\\int_{0}^{x} \\cos(t) dt');
console.log('i1 converted:', i1);

console.log('\n--- TEST EVALUATION ---');
const evalIntegral = (x) => numericalIntegral(0, x, t => Math.cos(t));
console.log('int cos(t) dt from 0 to pi/2:', evalIntegral(Math.PI / 2), 'expected 1');
console.log('int cos(t) dt from 0 to pi:', evalIntegral(Math.PI), 'expected 0');

const evalSum = (n) => {
  let acc = 0;
  for (let k = 0; k <= n; k++) acc += Math.pow(0.5, k);
  return acc;
};
console.log('sum 0.5^k from k=0 to 2:', evalSum(2), 'expected 1.75');
