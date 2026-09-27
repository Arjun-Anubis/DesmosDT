const fs = require('fs');
const path = require('path');

// Test 1: require
delete require.cache[path.resolve('js/cas_math.js')];

// Write test cas_math.js
const testCasMath = `
(function(root) {
  'use strict';

  let OmniMath = root.OmniMath || {};

  if (typeof require === 'function') {
    try {
      const path = require('path');
      const fs = require('fs');
      const candidates = [
        path.resolve(__dirname || '.', 'math'),
        path.resolve(__dirname || '.', 'js/math'),
        path.resolve(process.cwd(), 'js/math')
      ];
      let mathDir = candidates.find(dir => fs.existsSync(path.join(dir, 'complex.js')));
      if (mathDir) {
        const complex = require(path.join(mathDir, 'complex.js'));
        const quad = require(path.join(mathDir, 'quadrature.js'));
        const parser = require(path.join(mathDir, 'cas_parser.js'));
        const algebra = require(path.join(mathDir, 'cas_algebra.js'));
        const latex = require(path.join(mathDir, 'latex_converter.js'));
        const transpiler = require(path.join(mathDir, 'transpiler.js'));
        const compiler = require(path.join(mathDir, 'compiler.js'));
        const dsp = require(path.join(mathDir, 'dsp.js'));
        const suggestions = require(path.join(mathDir, 'suggestions.js'));

        OmniMath = Object.assign(OmniMath,
          complex, quad, parser, algebra, latex, transpiler, compiler, dsp, suggestions
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  root.OmniMath = OmniMath;
  if (typeof module === 'object' && module.exports) {
    module.exports = OmniMath;
  }
  return OmniMath;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
`;

// Test in eval
global.window = global;
eval(testCasMath);
console.log('Eval OmniMath loaded:', typeof OmniMath);
console.log('OmniMath.diff:', typeof OmniMath.diff);
console.log('OmniMath.latexToMath:', typeof OmniMath.latexToMath);
console.log('OmniMath.compileAll:', typeof OmniMath.compileAll);
console.log('OmniMath.numericalIntegral:', typeof OmniMath.numericalIntegral);
console.log('OmniMath.Complex:', typeof OmniMath.Complex);
console.log('Derivative test:', OmniMath.diff('x^3', 'x'));
console.log('Integral test:', OmniMath.numericalIntegral(0, 1, x => x * x));
