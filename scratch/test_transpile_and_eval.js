const fs = require('fs');

// Gauss-Legendre 10-point nodes and weights
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

console.log('Testing numericalIntegral...');
console.log('int x^2 from 0 to 1:', numericalIntegral(0, 1, x => x * x), 'expected 1/3');
console.log('int cos(t) from 0 to pi/2:', numericalIntegral(0, Math.PI / 2, t => Math.cos(t)), 'expected 1');
console.log('int 1/x from 1 to e:', numericalIntegral(1, Math.E, x => 1 / x), 'expected 1');
