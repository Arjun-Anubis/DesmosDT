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

function convertSumsToLatex(s) {
  let idx = s.indexOf('sum(');
  while (idx !== -1) {
    const b = extractBalanced(s, idx + 3);
    if (!b) break;
    // content is: k=0, n, (0.5)^k
    // split by comma at depth 0
    let depth = 0, parts = [], cur = '';
    for (let i = 0; i < b.content.length; i++) {
      const ch = b.content[i];
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

    if (parts.length >= 3) {
      const lower = parts[0];
      const upper = parts[1];
      const expr = parts.slice(2).join(', ');
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
  const findNext = () => {
    const i1 = s.indexOf('integral(');
    const i2 = s.indexOf('int(');
    if (i1 === -1) return i2;
    if (i2 === -1) return i1;
    return Math.min(i1, i2);
  };

  while ((idx = findNext()) !== -1) {
    const openIdx = s.indexOf('(', idx);
    const b = extractBalanced(s, openIdx);
    if (!b) break;
    let depth = 0, parts = [], cur = '';
    for (let i = 0; i < b.content.length; i++) {
      const ch = b.content[i];
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

    if (parts.length === 3) {
      // integral(a, b, (t) => expr)
      const a = parts[0];
      const bBound = parts[1];
      let fnStr = parts[2];
      let wrt = 't', expr = fnStr;
      const arrowMatch = fnStr.match(/^\(?([a-zA-Z])\)?\s*=>\s*(.+)$/);
      if (arrowMatch) {
        wrt = arrowMatch[1];
        expr = arrowMatch[2];
      }
      const replacement = `\\int_{${a}}^{${bBound}}{${expr}} d${wrt}`;
      s = s.slice(0, idx) + replacement + s.slice(b.endIndex + 1);
    } else if (parts.length === 4) {
      // int(a, b, expr, t)
      const a = parts[0];
      const bBound = parts[1];
      const expr = parts[2];
      const wrt = parts[3];
      const replacement = `\\int_{${a}}^{${bBound}}{${expr}} d${wrt}`;
      s = s.slice(0, idx) + replacement + s.slice(b.endIndex + 1);
    } else {
      break;
    }
  }
  return s;
}

console.log(convertSumsToLatex('y = sum(k=0, n, (0.5)^k)'));
console.log(convertSumsToLatex('y = sum(k=1, 5, sin(k*x)/k) + 1'));
console.log(convertIntegralsToLatex('y = integral(0, x, (t) => cos(t))'));
console.log(convertIntegralsToLatex('y = int(0, 1, x^2, x)'));
