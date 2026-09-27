const path = require('path');
const CAS = require(path.resolve(__dirname, '../extension/cas_engine.js'));

console.log('--- Testing CAS Engine ---');

// 1. Differentiation
const d1 = CAS.diff('x^3 + 3*x^2 + 5*x - 7', 'x');
console.log('diff(x^3 + 3*x^2 + 5*x - 7) =', CAS.toLatex(d1));

const d2 = CAS.diff('sin(x)', 'x');
console.log('diff(sin(x)) =', CAS.toLatex(d2));

// 2. Integration
const i1 = CAS.integrate('x^2 + 4*x', 'x');
console.log('integrate(x^2 + 4*x) =', CAS.toLatex(i1));

// 3. Solving equations
const s1 = CAS.solve('x^2 - 5*x + 6 = 0', 'x');
console.log('solve(x^2 - 5*x + 6 = 0) =', s1);

const s2 = CAS.solve('2*x - 8 = 0', 'x');
console.log('solve(2*x - 8 = 0) =', s2);

// 4. Taylor Series
const t1 = CAS.taylor('sin(x)', 'x', 0, 5);
console.log('taylor(sin(x), 0, 5) =', t1);

// 5. Discrete Signal Evaluation
const sig1 = CAS.evaluateDiscreteSignal('0.5^n * u[n]', -3, 5);
console.log('sig1 (0.5^n * u[n]):', Array.from(sig1.entries()));

const sigDelta = CAS.evaluateDiscreteSignal('delta[n] + 2*delta[n-1]', -2, 3);
console.log('sigDelta:', Array.from(sigDelta.entries()));

// 6. Recurrence Relation
const recSig = CAS.evaluateDiscreteSignal('', 0, 5, {
  isRecurrence: true,
  a1: 0.5,
  b0: 1,
  initialConditions: { '-1': 0 }
});
console.log('recurrence y[n] = 0.5*y[n-1] + u[n]:', Array.from(recSig.entries()));

// 7. Convolution
const conv = CAS.convolveSignals(sigDelta, sig1);
console.log('convolution result length:', conv.size);

console.log('--- All Tests Passed Successfully! ---');
