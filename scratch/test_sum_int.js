const fs = require('fs');

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
      // Look until next boundary
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
      // Definite integral
      replacement = `integral(${sub}, ${sup}, (${wrt}) => (${expr}))`;
    } else {
      // Indefinite integral
      replacement = `integrate((${expr}), '${wrt}')`;
    }

    s = s.slice(0, idx) + replacement + s.slice(exprEnd);
    idx = s.indexOf('\\int', idx + replacement.length);
  }
  return s;
}

console.log('--- SUMS ---');
console.log(resolveSums('\\sum_{n=1}^{10} n^2'));
console.log(resolveSums('\\sum_{k=0}^{n} (0.5)^k'));
console.log(resolveSums('\\sum^{5}_{i=0} (2i + 1) + 3'));
console.log(resolveSums('\\sum_{k=1}^{5}{k^3}'));

console.log('\n--- INTEGRALS ---');
console.log(resolveIntegrals('\\int_{0}^{1} x^2 dx'));
console.log(resolveIntegrals('\\int_{0}^{x} \\cos(t) dt'));
console.log(resolveIntegrals('\\int_{-1}^{1} (1-x^2) dx'));
console.log(resolveIntegrals('\\int x^2 dx'));
