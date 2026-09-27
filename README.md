# OmniGraph: Desmos-Grade Graphing & Discrete-Time DSP Laboratory

OmniGraph is a high-performance, standalone mathematical graphing laboratory combining the fluid, intuitive user experience of **Desmos** with first-class **Discrete-Time Signal Processing (DSP)**, **Symbolic Computer Algebra (CAS)**, and **Complex Number Arithmetic**.

---

## 🚀 Getting Started

### Option 1: Run Local Server (Recommended)
```bash
npm start
# Or directly:
node serve.js
```
Then navigate to: **[http://localhost:3000](http://localhost:3000)**

### Option 2: Open Directly in Any Browser
Double-click `index.html` or open it with your browser:
```
c:\Users\anubi\Downloads\antigrav\index.html
```
*Zero build steps, zero transpilation required. Works 100% offline and over `file://` protocols.*

### Running Automated Tests
```bash
npm test
# Or directly:
node tests/run_all.js
```
*Executes all 16 test suites across CAS, quadrature, complex numbers, MathQuill integration, viewport rendering, ease-of-use diagnostics, and UI event flows.*

---

## Architecture

```
antigrav/
├── index.html                   # Main single-page application entry point
├── package.json                 # Project scripts (npm start, npm test)
├── serve.js                     # Zero-dependency local static HTTP server
├── css/
│   └── style.css                # Desmos-style responsive layout & theme rules
├── js/
│   ├── cas_math.js              # OmniMath aggregator facade (Node.js & Browser UMD)
│   ├── graphpaper.js            # 60 FPS HTML5 Canvas engine with magnetic POI snapping
│   ├── app.js                   # Application controller, sidebar, sliders, and MathQuill UI
│   ├── math/                    # Modular Single-Responsibility Mathematical Sub-systems:
│   │   ├── complex.js           # Complex arithmetic, Euler form, transcendental functions
│   │   ├── quadrature.js        # Adaptive 10-point Gauss-Legendre numerical integration
│   │   ├── cas_parser.js        # Lexer, AST parser, and JS code generator
│   │   ├── cas_algebra.js       # Symbolic differentiation, anti-derivatives, solvers, Taylor series
│   │   ├── latex_converter.js   # MathQuill LaTeX ↔ JS translator, sums (\sum) & integrals (\int)
│   │   ├── transpiler.js        # Expression classifier, implicit multiplication, piecewise conditions
│   │   ├── compiler.js          # Multi-signal compiler & dynamic execution environments
│   │   ├── dsp.js               # Signal energy, average power, fundamental period, DTFT spectrum
│   │   └── suggestions.js       # In-line CAS autocomplete database & query matcher
│   └── vendor/                  # Bundled third-party libraries (jQuery, MathQuill)
├── extension/                   # Isolated legacy Chrome extension prototype
│   └── README.md                # Documentation on extension vs. standalone web app
└── tests/                       # Automated test suites & test runner
    ├── run_all.js               # Master test runner (npm test)
    ├── test_ease_of_use.js      # Error diagnostics, card reorder, inline sliders, virtual keypad
    ├── test_sums_and_integrals.js
    ├── test_complex_and_point_preview.js
    ├── test_complete_qol.js
    ├── test_desmos_mathquill_and_empty.js
    ├── test_menus_and_svg_icons.js
    ├── test_desmos_ui.js
    ├── test_browser_sim.js
    ├── test_dynamic_viewport_and_qol.js
    ├── test_signals.js
    ├── test_webapp.js
    ├── test_cas.js
    ├── test_qol.js
    ├── test_cond.js
    ├── test_regex.js
    └── test_suite.js
```

---

## 🧩 How to Expand OmniGraph

### Adding a New Math Function or Special Operator
1. Open [`js/math/transpiler.js`](file:///c:/Users/anubi/Downloads/antigrav/js/math/transpiler.js) and register your function keyword or operator mapping in `transpileCode()`.
2. Open [`js/math/compiler.js`](file:///c:/Users/anubi/Downloads/antigrav/js/math/compiler.js) and add the numerical runtime implementation to `baseContext`.
3. If the function supports complex numbers, extend the corresponding method in [`js/math/complex.js`](file:///c:/Users/anubi/Downloads/antigrav/js/math/complex.js).
4. If you want autocomplete suggestions while typing, add entries to [`js/math/suggestions.js`](file:///c:/Users/anubi/Downloads/antigrav/js/math/suggestions.js).
5. Add a test case in `tests/` and run `npm test`.

### Adding a New CAS Symbolic Transformation
1. Open [`js/math/cas_algebra.js`](file:///c:/Users/anubi/Downloads/antigrav/js/math/cas_algebra.js).
2. Add your AST pattern transformation (e.g. Laplace transforms, Fourier transforms, or matrix operations).
3. The unified facade [`js/cas_math.js`](file:///c:/Users/anubi/Downloads/antigrav/js/cas_math.js) automatically exposes it on `window.OmniMath` in browsers and `module.exports` in Node.js.

### Customizing Canvas Visuals & Snapping
1. Open [`js/graphpaper.js`](file:///c:/Users/anubi/Downloads/antigrav/js/graphpaper.js).
2. Canvas rendering is decoupled into clear lifecycle passes:
   - `renderGrid()`: Major & minor adaptive grid lines and labels.
   - `renderContinuous()`: 60 FPS curve evaluation across visible bounds.
   - `renderDiscrete()`: Stem plots with dynamic bounds and selectable marker styles.
   - `renderKeyPoints()`: Magnetic POI dots (roots, extrema, intercepts, complex projections).
   - `renderHover()`: Real-time coordinate tooltips and curve tracing.

---

## 🌟 Core Features

- **Desmos-Style MathQuill Sidebar**: Rich mathematical typography, LaTeX input, undo/redo, auto-expanding cards.
- **Actionable Error Diagnostics & Tooltips**: Proactive analysis of unclosed parentheses/brackets, continuous vs. discrete variable clashes, and undefined parameters with 1-click automatic fixes.
- **Expression Card Reordering**: Intuitive row organization with drag handles, Move Up/Down buttons, and `Alt+Up` / `Alt+Down` keyboard shortcuts.
- **Desmos-Style Inline Add Slider Prompts**: Expressions with undefined variables immediately show `add slider: [all] [var]` prompts for instantaneous 1-click slider creation.
- **Dockable Virtual Math Keypad**: Responsive on-screen keypad with tabs for `123` Main symbols, `f(x)` Functions, and `DSP` Discrete Signal blocks that writes directly into MathQuill fields without stealing focus.
- **Continuous & Discrete Multi-Signals**: Inter-signal references like `s3[n] = s1[n] - s2[n-2]`, stem plots, impulse trains.
- **Definite Sums & Integrals**: Fast adaptive 10-point Gauss-Legendre quadrature $\int_a^b f(x)dx$ and $\sum_{n=a}^b s[n]$ with runtime convergence checks.
- **Complex Numbers**: $z = a + bi$, polar forms, Euler identities $e^{i\pi} + 1 = 0$, complex coordinate tooltips.
- **Symbolic CAS**: Closed-form differentiation, integration, polynomial root solving, Taylor polynomial expansion.
- **Interactive Wrench Settings**: Radians/Degrees, dynamic axis bounds, major/minor grid visibility, square aspect ratio locks.
- **Vector & Raster Export**: Clean SVG vector plots and high-resolution PNG image captures.
