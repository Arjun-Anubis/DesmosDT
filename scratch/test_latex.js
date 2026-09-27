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

function latexToMath(latex) {
  if (!latex || typeof latex !== 'string') return '';
  let s = latex.trim();

  // Remove formatting spacing
  s = s.replace(/\\ /g, ' ').replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\!/g, '');
  s = s.replace(/\\left/g, '').replace(/\\right/g, '');
  s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
  s = s.replace(/\\div/g, '/');

  // Fractions with balanced brace resolver
  s = resolveFractions(s);

  // Constants & Greek
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/\\theta\b/g, 'theta');

  // Math functions
  s = s.replace(/\\(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|exp|ln|log|sqrt|delta|u|rect|sinc|conv)\b/g, '$1');

  // Inequalities
  s = s.replace(/\\le\b/g, '<=').replace(/\\ge\b/g, '>=').replace(/\\ne\b/g, '!=');

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

const input1 = '\\sin\\left(\\frac{2\\pi x}{3}\\right) \\cdot \\frac{x}{\\pi\\left(x^{2}-60^{2}\\right)}';
console.log('Result 1:', latexToMath(input1));

const input2 = 's_{1}\\left[n\\right] - s_{2}\\left[n\\right]';
console.log('Result 2:', latexToMath(input2));

const input3 = 'y = \\frac{1}{2} x^{2} + 3';
console.log('Result 3:', latexToMath(input3));

const cas = require('./js/cas_math.js');
const compiled1 = cas.compileExpression(latexToMath(input1));
console.log('Compiled 1 eval at 30:', compiled1.eval(30, 30));
console.log('Compiled 1 eval at 0:', compiled1.eval(0, 0));
