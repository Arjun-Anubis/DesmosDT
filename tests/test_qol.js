const assert = require('assert');
const path = require('path');
const OmniMath = require(path.resolve(__dirname, '../js/cas_math.js'));

console.log('--- Testing QOL Features in OmniMath ---');

// 1. Implicit Multiplication: 2x + 3sin(x)
const c1 = OmniMath.compileExpression('2x + 3sin(x)');
assert.strictEqual(c1.eval(0, 0), 0);
assert.strictEqual(Math.round(c1.eval(Math.PI / 2, 0)), Math.round(Math.PI + 3));
console.log('✓ Implicit multiplication (2x + 3sin(x)) works');

// 2. Domain Restrictions: y = x^2 { -2 <= x <= 2 }
const c2 = OmniMath.compileExpression('x^2 { -2 <= x <= 2 }');
assert.strictEqual(c2.eval(0, 0), 0);
assert.strictEqual(c2.eval(2, 2), 4);
assert.ok(isNaN(c2.eval(2.1, 2.1)), 'x = 2.1 should be out of domain (NaN)');
assert.ok(isNaN(c2.eval(-2.1, -2.1)), 'x = -2.1 should be out of domain (NaN)');
console.log('✓ Continuous domain restriction { -2 <= x <= 2 } works');

// 3. Discrete Domain Restriction: s1[n] = 0.5^n { n >= 0 }
const d1 = OmniMath.compileExpression('0.5^n { n >= 0 }');
assert.strictEqual(d1.eval(0, 0), 1);
assert.strictEqual(d1.eval(2, 2), 0.25);
assert.ok(isNaN(d1.eval(-1, -1)), 'n = -1 should be out of domain (NaN)');
console.log('✓ Discrete domain restriction { n >= 0 } works');

// 4. Note parsing
const note = OmniMath.analyzeExpression('"This is a note for the homework"');
assert.strictEqual(note.kind, 'note');
assert.strictEqual(note.noteText, 'This is a note for the homework');
console.log('✓ Note detection works');

// 5. Smart Coordinate Formatter
assert.strictEqual(OmniMath.formatCoordinate(0.5), '1/2');
assert.strictEqual(OmniMath.formatCoordinate(0.25), '1/4');
assert.strictEqual(OmniMath.formatCoordinate(0.75), '3/4');
assert.strictEqual(OmniMath.formatCoordinate(Math.PI), 'π');
assert.strictEqual(OmniMath.formatCoordinate(4), '4');
console.log('✓ Smart coordinate formatter works');

console.log('--- ALL QOL MATH TESTS PASSED! ---');
