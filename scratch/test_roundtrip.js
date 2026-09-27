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
      // If expr is wrapped in parens, unwrap single outer layer if desired
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
      const arrowMatch = fnStr.match(/^\(?([a-zA-Z])\)?\s*=>\s*(.+)$/);
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

console.log('Testing Sum Conversion:');
const sumLatex = '\\sum_{k=0}^{10}{k^2}';
const sumMath = resolveSums(sumLatex);
console.log('LaTeX:', sumLatex, '=> Math:', sumMath);
const sumBack = convertSumsToLatex(sumMath);
console.log('Back to LaTeX:', sumBack);

console.log('\nTesting Integral Conversion:');
const intLatex = '\\int_{0}^{x} \\cos(t) dt';
const intMath = resolveIntegrals(intLatex);
console.log('LaTeX:', intLatex, '=> Math:', intMath);
const intBack = convertIntegralsToLatex(intMath);
console.log('Back to LaTeX:', intBack);
