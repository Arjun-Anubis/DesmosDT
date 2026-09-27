const fs = require('fs');

global.window = global;
eval(fs.readFileSync('js/cas_math.js', 'utf8'));

// Test compileAll on integral and sum expressions
const items = [
  { id: '1', text: 'y = \\int_{0}^{x} \\cos(t) dt' },
  { id: '2', text: 's1[n] = \\sum_{k=0}^{n} (0.5)^k' },
  { id: '3', text: 'y = \\sum_{k=1}^{5} \\frac{\\sin(k x)}{k}' },
  { id: '4', text: 'I1 = \\int_{0}^{1} x^2 dx' }
];

console.log('Testing raw items...');
items.forEach(it => {
  const mathStr = OmniMath.latexToMath(it.text);
  console.log(it.id + ':', it.text, '=>', mathStr);
});
