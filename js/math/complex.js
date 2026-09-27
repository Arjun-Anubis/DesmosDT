/**
 * OmniMath: Complex Number System & Polymorphic Arithmetic
 * Represents complex numbers z = a + bi with full algebraic and transcendental operations.
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

  class Complex {
    constructor(re = 0, im = 0) {
      this.re = Number(re) || 0;
      this.im = Number(im) || 0;
    }

    add(other) {
      const o = Complex.from(other);
      return new Complex(this.re + o.re, this.im + o.im);
    }

    sub(other) {
      const o = Complex.from(other);
      return new Complex(this.re - o.re, this.im - o.im);
    }

    mul(other) {
      const o = Complex.from(other);
      return new Complex(
        this.re * o.re - this.im * o.im,
        this.re * o.im + this.im * o.re
      );
    }

    div(other) {
      const o = Complex.from(other);
      const denom = o.re * o.re + o.im * o.im;
      if (denom === 0) return new Complex(NaN, NaN);
      return new Complex(
        (this.re * o.re + this.im * o.im) / denom,
        (this.im * o.re - this.re * o.im) / denom
      );
    }

    pow(other) {
      const o = Complex.from(other);
      if (o.im === 0) {
        if (this.im === 0 && this.re >= 0) {
          return new Complex(Math.pow(this.re, o.re), 0);
        }
        if (Number.isInteger(o.re)) {
          let n = o.re;
          if (n === 0) return new Complex(1, 0);
          if (n < 0) return new Complex(1, 0).div(this.pow(-n));
          let res = new Complex(1, 0);
          let base = this;
          while (n > 0) {
            if (n % 2 === 1) res = res.mul(base);
            base = base.mul(base);
            n = Math.floor(n / 2);
          }
          return res;
        }
      }
      return this.ln().mul(o).exp();
    }

    neg() {
      return new Complex(-this.re, -this.im);
    }

    abs() {
      return Math.hypot(this.re, this.im);
    }

    arg() {
      return Math.atan2(this.im, this.re);
    }

    conj() {
      return new Complex(this.re, -this.im);
    }

    exp() {
      const r = Math.exp(this.re);
      return new Complex(r * Math.cos(this.im), r * Math.sin(this.im));
    }

    ln() {
      return new Complex(Math.log(this.abs()), this.arg());
    }

    sin() {
      return new Complex(
        Math.sin(this.re) * Math.cosh(this.im),
        Math.cos(this.re) * Math.sinh(this.im)
      );
    }

    cos() {
      return new Complex(
        Math.cos(this.re) * Math.cosh(this.im),
        -Math.sin(this.re) * Math.sinh(this.im)
      );
    }

    tan() {
      return this.sin().div(this.cos());
    }

    sinh() {
      return new Complex(
        Math.sinh(this.re) * Math.cos(this.im),
        Math.cosh(this.re) * Math.sin(this.im)
      );
    }

    cosh() {
      return new Complex(
        Math.cosh(this.re) * Math.cos(this.im),
        Math.sinh(this.re) * Math.sin(this.im)
      );
    }

    sqrt() {
      const r = this.abs();
      const theta = this.arg();
      const sqrtR = Math.sqrt(r);
      return new Complex(
        sqrtR * Math.cos(theta / 2),
        sqrtR * Math.sin(theta / 2)
      );
    }

    isReal(eps = 1e-11) {
      return Math.abs(this.im) < eps;
    }

    toNumber() {
      return this.re;
    }

    valueOf() {
      return this.re;
    }

    toString() {
      const eps = 1e-10;
      const re = Math.abs(this.re) < eps ? 0 : Number(this.re.toFixed(4));
      const im = Math.abs(this.im) < eps ? 0 : Number(this.im.toFixed(4));

      if (im === 0) return String(re);
      if (re === 0) {
        if (im === 1) return 'i';
        if (im === -1) return '-i';
        return `${im}i`;
      }
      const sign = im > 0 ? '+' : '-';
      const absIm = Math.abs(im) === 1 ? 'i' : `${Math.abs(im)}i`;
      return `${re} ${sign} ${absIm}`;
    }

    static from(val) {
      if (val instanceof Complex) return val;
      if (typeof val === 'number') return new Complex(val, 0);
      if (typeof val === 'string') return Complex.parse(val);
      return new Complex(NaN, NaN);
    }

    static parse(str) {
      if (!str || typeof str !== 'string') return new Complex(NaN, NaN);
      const s = str.trim().replace(/\s+/g, '');
      if (s === 'i' || s === '+i' || s === 'j' || s === '+j') return new Complex(0, 1);
      if (s === '-i' || s === '-j') return new Complex(0, -1);
      const pureIm = s.match(/^([+-]?\d+(?:\.\d+)?)[ij]$/i);
      if (pureIm) return new Complex(0, parseFloat(pureIm[1]));
      const compMatch = s.match(/^([+-]?\d+(?:\.\d+)?)([+-]\d*(?:\.\d+)?)[ij]$/i);
      if (compMatch) {
        const re = parseFloat(compMatch[1]);
        let imStr = compMatch[2];
        if (imStr === '+' || imStr === '') imStr = '1';
        else if (imStr === '-') imStr = '-1';
        return new Complex(re, parseFloat(imStr));
      }
      const pureReal = parseFloat(s);
      if (!isNaN(pureReal)) return new Complex(pureReal, 0);
      return new Complex(NaN, NaN);
    }
  }

  function _add(a, b) {
    if (a instanceof Complex || b instanceof Complex) return Complex.from(a).add(b);
    return a + b;
  }
  function _sub(a, b) {
    if (a instanceof Complex || b instanceof Complex) return Complex.from(a).sub(b);
    return a - b;
  }
  function _mul(a, b) {
    if (a instanceof Complex || b instanceof Complex) return Complex.from(a).mul(b);
    return a * b;
  }
  function _div(a, b) {
    if (a instanceof Complex || b instanceof Complex) return Complex.from(a).div(b);
    return a / b;
  }
  function _pow(a, b) {
    if (a instanceof Complex || b instanceof Complex) return Complex.from(a).pow(b);
    if (typeof a === 'number' && a < 0 && !Number.isInteger(b)) return new Complex(a, 0).pow(b);
    return Math.pow(a, b);
  }
  function _neg(a) {
    if (a instanceof Complex) return a.neg();
    return -a;
  }

  return {
    Complex,
    _add,
    _sub,
    _mul,
    _div,
    _pow,
    _neg
  };
});
