const fs = require('fs');
global.window = global;
eval(fs.readFileSync('js/cas_math.js', 'utf8'));

const Complex = OmniMath.Complex;

function _add(a, b) {
  if (a instanceof Complex || b instanceof Complex) return Complex.from(a).add(b);
  return a + b;
}
function _mul(a, b) {
  if (a instanceof Complex || b instanceof Complex) return Complex.from(a).mul(b);
  return a * b;
}

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

// Test int e^(i t) dt from 0 to pi = 2i
const res = numericalIntegral(0, Math.PI, (t) => {
  return new Complex(Math.cos(t), Math.sin(t));
});
console.log('int e^(i*t) dt from 0 to pi:', res.toString(), '(expected 2i)');

// Test real integral
const realRes = numericalIntegral(0, 1, x => x * x);
console.log('int x^2 dt from 0 to 1:', realRes, '(expected 0.33333333333333337)');
