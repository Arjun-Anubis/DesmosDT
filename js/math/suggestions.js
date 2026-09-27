/**
 * OmniMath: Autocomplete & CAS Suggestion Engine
 * Provides context-aware mathematical, CAS, trigonometric, discrete signal, and user variable suggestions.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const transpilerMod = require('./transpiler');
    module.exports = factory(transpilerMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(transpilerDeps) {
  'use strict';

  const analyzeExpression = transpilerDeps.analyzeExpression;

  // --- BUILT-IN CAS & MATH AUTOCOMPLETE DATABASE ---
  const BUILTIN_SUGGESTIONS = [
    // Discrete Signals
    { text: 'delta[n]', label: 'delta[n]', category: 'Discrete', desc: 'Unit impulse sequence δ[n]' },
    { text: 'u[n]', label: 'u[n]', category: 'Discrete', desc: 'Unit step sequence u[n]' },
    { text: 'r[n]', label: 'r[n]', category: 'Discrete', desc: 'Unit ramp sequence r[n]' },
    { text: 'rect[n, 3]', label: 'rect[n, N]', category: 'Discrete', desc: 'Rectangular pulse of width 2N+1' },
    { text: 'sinc(n)', label: 'sinc(n)', category: 'Discrete', desc: 'Normalized sinc sin(πn)/(πn)' },
    { text: 'conv(s1, s2)', label: 'conv(s1, s2)', category: 'Discrete', desc: 'Discrete-time linear convolution' },
    // Trigonometric
    { text: 'sin(x)', label: 'sin(x)', category: 'Trig', desc: 'Sine function' },
    { text: 'cos(x)', label: 'cos(x)', category: 'Trig', desc: 'Cosine function' },
    { text: 'tan(x)', label: 'tan(x)', category: 'Trig', desc: 'Tangent function' },
    { text: 'asin(x)', label: 'asin(x)', category: 'Trig', desc: 'Arcsine (inverse sine)' },
    { text: 'acos(x)', label: 'acos(x)', category: 'Trig', desc: 'Arccosine (inverse cosine)' },
    { text: 'atan(x)', label: 'atan(x)', category: 'Trig', desc: 'Arctangent (inverse tangent)' },
    // Exponential & Algebra
    { text: 'exp(x)', label: 'exp(x)', category: 'Math', desc: 'Exponential e^x' },
    { text: 'ln(x)', label: 'ln(x)', category: 'Math', desc: 'Natural logarithm ln(x)' },
    { text: 'sqrt(x)', label: 'sqrt(x)', category: 'Math', desc: 'Square root √x' },
    { text: 'abs(x)', label: 'abs(x)', category: 'Math', desc: 'Absolute value |x|' },
    { text: 'floor(x)', label: 'floor(x)', category: 'Math', desc: 'Floor integer ⌊x⌋' },
    { text: 'ceil(x)', label: 'ceil(x)', category: 'Math', desc: 'Ceiling integer ⌈x⌉' },
    // Symbolic CAS Operations
    { text: 'diff(x^3, x)', label: 'diff(expr, x)', category: 'CAS', desc: 'Symbolic exact derivative d/dx' },
    { text: 'integrate(x^2, x)', label: 'integrate(expr, x)', category: 'CAS', desc: 'Symbolic antiderivative ∫ dx' },
    { text: 'solve(x^2 - 4 = 0, x)', label: 'solve(eqn, x)', category: 'CAS', desc: 'Solve algebraic roots' },
    { text: 'taylor(sin(x), x, 0, 4)', label: 'taylor(expr, x, a, n)', category: 'CAS', desc: 'Taylor polynomial series' },
    // Advanced & Series / Calculus
    { text: 'sum(k=0, 10, (0.5)^k)', label: 'sum(k=0, N, expr)', category: 'Series', desc: 'Finite summation Σ' },
    { text: 'sum(k=1, 10, k^2)', label: 'sum(k=1, N, expr)', category: 'Calculus', desc: 'Finite summation Σ_{k=a}^b' },
    { text: 'integral(0, x, (t) => cos(t))', label: 'integral(a, b, fn)', category: 'Calculus', desc: 'Definite integral ∫_a^b f(t) dt' },
    { text: 'int(0, 1, x^2, x)', label: 'int(a, b, expr, x)', category: 'Calculus', desc: 'Definite integral ∫_a^b expr dx' },
    { text: '{ x < 0: -1, 1 }', label: '{ condition: a, b }', category: 'Piecewise', desc: 'Piecewise conditional branches' },
    { text: '(cos(t), sin(t))', label: '(f(t), g(t))', category: 'Parametric', desc: 'Parametric 2D curve' },
    { text: 'r = 1 + cos(theta)', label: 'r = f(theta)', category: 'Polar', desc: 'Polar coordinate curve' },
    // Complex Numbers & Phasors
    { text: '3 + 4i', label: 'a + bi', category: 'Complex', desc: 'Cartesian complex number' },
    { text: 'exp(i * pi / 4)', label: 'exp(i * theta)', category: 'Complex', desc: 'Euler polar phasor e^(iθ)' },
    { text: 're(z)', label: 're(z)', category: 'Complex', desc: 'Real component of complex number' },
    { text: 'im(z)', label: 'im(z)', category: 'Complex', desc: 'Imaginary component of complex number' },
    { text: 'abs(z)', label: 'abs(z)', category: 'Complex', desc: 'Magnitude |z| = √(re² + im²)' },
    { text: 'arg(z)', label: 'arg(z)', category: 'Complex', desc: 'Phase angle arg(z) = atan2(im, re)' },
    { text: 'conj(z)', label: 'conj(z)', category: 'Complex', desc: 'Complex conjugate a - bi' }
  ];

  function getSuggestions(query = '', activeItems = []) {
    const q = (query || '').toLowerCase().trim();
    const suggestions = [...BUILTIN_SUGGESTIONS];

    // Add user-defined signals and variables dynamically
    if (Array.isArray(activeItems)) {
      activeItems.forEach(it => {
        if (!it.text) return;
        const info = analyzeExpression(it.text);
        if (info && info.name) {
          if (info.kind === 'discrete') {
            suggestions.unshift({
              text: `${info.name}[n]`,
              label: `${info.name}[n]`,
              category: 'User Signal',
              desc: `User defined discrete signal: ${it.text}`
            });
          } else if (info.kind === 'continuous') {
            suggestions.unshift({
              text: `${info.name}(x)`,
              label: `${info.name}(x)`,
              category: 'User Function',
              desc: `User defined continuous function: ${it.text}`
            });
          } else if (info.kind === 'slider' || info.kind === 'variable') {
            suggestions.unshift({
              text: info.name,
              label: `${info.name}`,
              category: 'Variable',
              desc: `Variable ${info.name}`
            });
          }
        }
      });
    }

    if (!q) return suggestions.slice(0, 8);

    return suggestions.filter(s => {
      return s.text.toLowerCase().includes(q) ||
             s.label.toLowerCase().includes(q) ||
             s.desc.toLowerCase().includes(q) ||
             s.category.toLowerCase().includes(q);
    }).slice(0, 8);
  }

  return {
    BUILTIN_SUGGESTIONS,
    getSuggestions
  };
});
