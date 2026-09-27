/**
 * OmniMath: Gauss-Legendre Quadrature & Numerical Integration Engine
 * High-precision 10-point adaptive numerical integration for continuous functions and curves.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    const complexMod = require('./complex');
    module.exports = factory(complexMod);
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory(root.OmniMath));
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function(deps) {
  'use strict';

  const Complex = deps.Complex;
  const _add = deps._add;
  const _mul = deps._mul;

  const GL10_NODES = [
    0.1488743389816312,
    0.4333953941292472,
    0.6794095682990244,
    0.8650633666889845,
    0.9739065285171717
  ];
  const GL10_WEIGHTS = [
    0.2955242247147529,
    0.2692667193099963,
    0.2190863625159820,
    0.1494513491505806,
    0.0666713443086881
  ];

  function integrateGL10(fn, a, b) {
    const m = (a + b) / 2;
    const h = (b - a) / 2;
    let sum = 0;
    for (let i = 0; i < 5; i++) {
      const dx = h * GL10_NODES[i];
      const v1 = fn(m + dx);
      const v2 = fn(m - dx);
      const vSum = _add(v1, v2);
      sum = _add(sum, _mul(GL10_WEIGHTS[i], vSum));
    }
    return _mul(h, sum);
  }

  function numericalIntegral(a, b, fn) {
    if (typeof a !== 'number' || typeof b !== 'number' || isNaN(a) || isNaN(b)) return NaN;
    if (a === b) return 0;
    if (b < a) {
      const res = numericalIntegral(b, a, fn);
      return res instanceof Complex ? res.neg() : -res;
    }
    const len = b - a;
    const steps = Math.min(64, Math.max(1, Math.ceil(len / 4)));
    const stepSize = len / steps;
    let total = 0;
    for (let s = 0; s < steps; s++) {
      const subA = a + s * stepSize;
      const subB = subA + stepSize;
      total = _add(total, integrateGL10(fn, subA, subB));
    }
    return total;
  }

  return {
    GL10_NODES,
    GL10_WEIGHTS,
    integrateGL10,
    numericalIntegral
  };
});
