/**
 * OmniMath: DSP (Digital Signal Processing) Engine
 * Calculates signal energy, power, autocorrelation periodicity, and DTFT frequency spectra.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OmniMath = root.OmniMath || {};
    Object.assign(root.OmniMath, factory());
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';

  // --- SIGNAL METRICS CALCULATOR (ENERGY, POWER, PERIODICITY) ---
  function computeSignalMetrics(evalFn, N = 50) {
    if (typeof evalFn !== 'function') return { energy: 0, power: 0, period: 'None' };
    let energy = 0;
    const samples = [];
    for (let n = -N; n <= N; n++) {
      const v = evalFn(n, n);
      const val = (typeof v === 'number' && isFinite(v)) ? v : 0;
      samples.push(val);
      energy += val * val;
    }
    const power = energy / (2 * N + 1);

    // Periodicity test via autocorrelation
    let period = null;
    let r0 = 0;
    for (let i = 0; i < samples.length; i++) r0 += samples[i] * samples[i];

    if (r0 > 1e-5) {
      for (let m = 1; m <= 25; m++) {
        let rm = 0;
        let count = 0;
        for (let i = 0; i < samples.length - m; i++) {
          rm += samples[i] * samples[i + m];
          count++;
        }
        const normCorr = rm / (count * (r0 / samples.length));
        if (Math.abs(normCorr - 1.0) < 0.06) {
          period = m;
          break;
        }
      }
    }

    return {
      energy: Number(energy.toFixed(4)),
      power: Number(power.toFixed(4)),
      period: period ? `${period} samples` : 'Aperiodic / Non-periodic'
    };
  }

  // --- DTFT FREQUENCY SPECTRUM COMPUTATION ---
  function computeDTFT(evalFn, numPoints = 120, N = 35) {
    if (typeof evalFn !== 'function') return [];
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const omega = -Math.PI + (i / numPoints) * (2 * Math.PI);
      let real = 0;
      let imag = 0;
      for (let n = -N; n <= N; n++) {
        const xn = evalFn(n, n);
        if (isNaN(xn) || !isFinite(xn) || xn === 0) continue;
        real += xn * Math.cos(omega * n);
        imag -= xn * Math.sin(omega * n);
      }
      const mag = Math.hypot(real, imag);
      const phase = Math.atan2(imag, real);
      points.push({ omega, mag, phase });
    }
    return points;
  }

  return {
    computeSignalMetrics,
    computeDTFT
  };
});
