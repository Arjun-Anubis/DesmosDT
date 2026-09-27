const assert = require('assert');
const fs = require('fs');
const path = require('path');
const OmniMath = require(path.resolve(__dirname, '../js/cas_math.js'));

console.log('--- Verifying Standalone Web App Files ---');

// 1. Check file existence
const requiredFiles = [
  'index.html',
  'css/style.css',
  'js/cas_math.js',
  'js/graphpaper.js',
  'js/app.js',
  'serve.js'
];

requiredFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  assert.ok(fs.existsSync(fullPath), `File must exist: ${file}`);
  console.log(`✓ Exists: ${file}`);
});

// 2. Test OmniMath compilation
const vars = { a: 2, b: 0.5 };

// Continuous expression with variables
const cont = OmniMath.compileExpression('a * sin(b * x)', vars);
assert.strictEqual(typeof cont.eval, 'function');
const y0 = cont.eval(0, 0);
assert.strictEqual(y0, 0, 'sin(0) should be 0');
const yPi = cont.eval(Math.PI, Math.PI);
assert.strictEqual(Math.round(yPi), 2, '2 * sin(0.5 * pi) = 2');
console.log('✓ Continuous expression with variable sliders evaluated correctly');

// Discrete sequence
const disc = OmniMath.compileExpression('(0.5^n) * u[n]', vars);
assert.strictEqual(disc.eval(-1, -1), 0, 'u[-1] is 0');
assert.strictEqual(disc.eval(0, 0), 1, '0.5^0 * u[0] is 1');
assert.strictEqual(disc.eval(1, 1), 0.5, '0.5^1 is 0.5');
console.log('✓ Discrete sequence evaluated correctly');

// Slider definition
const slider = OmniMath.compileExpression('a = 3.5');
assert.strictEqual(slider.isSlider, true);
assert.strictEqual(slider.varName, 'a');
assert.strictEqual(slider.value, 3.5);
console.log('✓ Slider assignment parsed correctly');

// CAS Integration
const diffRes = OmniMath.diff('sin(x^2)', 'x');
console.log('diff(sin(x^2), x) =', diffRes);
assert.ok(diffRes.includes('cos') && diffRes.includes('x'), 'Derivative contains cos and x');

const intRes = OmniMath.integrate('x^3', 'x');
console.log('integrate(x^3, x) =', intRes);
assert.ok(intRes.includes('4'), 'Antiderivative of x^3 has /4');

console.log('\n=============================================');
console.log(' ALL STANDALONE WEB APP CHECKS PASSED!       ');
console.log('=============================================\n');
