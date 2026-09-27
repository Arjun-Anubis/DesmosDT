/**
 * OmniMath: Discrete-Time & Symbolic CAS Unified Facade
 * 
 * Aggregates all modular sub-systems into the unified OmniMath API:
 *  - js/math/complex.js        : Complex number arithmetic & transcendental functions
 *  - js/math/quadrature.js     : Gauss-Legendre 10-point adaptive numerical integration
 *  - js/math/cas_parser.js     : Lexical tokenizer, AST parser & code generator
 *  - js/math/cas_algebra.js    : Symbolic diff, integrate, polynomial solver, Taylor series
 *  - js/math/latex_converter.js: LaTeX parser, math serializer, balanced delimiters, sums & integrals
 *  - js/math/transpiler.js     : Expression classifier, implicit multiplication, piecewise compiler
 *  - js/math/compiler.js       : Environment manager, signal/function closures & evaluation
 *  - js/math/dsp.js            : Signal metrics (energy, power, periodicity) & DTFT spectrum
 *  - js/math/suggestions.js    : In-line CAS autocomplete database & query matcher
 */
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
      const mathDir = candidates.find(dir => fs.existsSync(path.join(dir, 'complex.js')));
      if (mathDir) {
        const complexMod = require(path.join(mathDir, 'complex.js'));
        const quadMod = require(path.join(mathDir, 'quadrature.js'));
        const parserMod = require(path.join(mathDir, 'cas_parser.js'));
        const algebraMod = require(path.join(mathDir, 'cas_algebra.js'));
        const latexMod = require(path.join(mathDir, 'latex_converter.js'));
        const transpilerMod = require(path.join(mathDir, 'transpiler.js'));
        const compilerMod = require(path.join(mathDir, 'compiler.js'));
        const dspMod = require(path.join(mathDir, 'dsp.js'));
        const suggestionsMod = require(path.join(mathDir, 'suggestions.js'));

        OmniMath = Object.assign(OmniMath,
          complexMod,
          quadMod,
          parserMod,
          algebraMod,
          latexMod,
          transpilerMod,
          compilerMod,
          dspMod,
          suggestionsMod,
          {
            // Public string-to-LaTeX CAS wrappers
            diff: (e, w) => latexMod.toLatex(algebraMod.simplify(algebraMod.diff(parserMod.parse(e), w))),
            integrate: (e, w) => latexMod.toLatex(algebraMod.simplify(algebraMod.integrate(parserMod.parse(e), w))),
            rawDiff: algebraMod.diff,
            rawIntegrate: algebraMod.integrate
          }
        );
      }
    } catch (e) {
      console.warn('[OmniMath] Error loading modular math sub-systems:', e);
    }
  } else {
    // In browser environment where modules are loaded via script tags
    if (OmniMath.toLatex && OmniMath.simplify && OmniMath.diff && OmniMath.parse) {
      const rawDiff = OmniMath.diff;
      const rawIntegrate = OmniMath.integrate;
      OmniMath.rawDiff = rawDiff;
      OmniMath.rawIntegrate = rawIntegrate;
      OmniMath.diff = (e, w) => OmniMath.toLatex(OmniMath.simplify(rawDiff(OmniMath.parse(e), w)));
      OmniMath.integrate = (e, w) => OmniMath.toLatex(OmniMath.simplify(rawIntegrate(OmniMath.parse(e), w)));
    }
  }

  root.OmniMath = OmniMath;
  if (typeof window !== 'undefined') {
    window.OmniMath = OmniMath;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = OmniMath;
  }
  return OmniMath;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
