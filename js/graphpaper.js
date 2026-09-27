/**
 * OmniGraph - High-Performance 60 FPS Cartesian Graphpaper Canvas Engine
 * 
 * Features:
 * - Dynamic adaptive sub-grid & sticky axis numbers (Desmos-identical)
 * - Viewport-adaptive dynamic domain plotting for continuous curves and discrete signals
 * - Key Points of Interest (POIs): Roots, Y-intercepts, Extrema, and Curve Intersections with magnetic snap
 * - Interactive Curve Tracing & Draggable Coordinate Anchors
 * - Reconstruction Overlays for Discrete Signals (ZOH / Staircase, Linear FOH, Whittaker-Shannon Sinc)
 * - Area Shading for Inequalities (<=, <, >=, >)
 * - Parametric (cos(t), sin(t)), Polar (r = f(theta)), and Point (x, y) Plotting
 * - Dark Mode / Midnight Theme & Light Mode
 * - Square Aspect Ratio (1:1 lock) & Custom Axis Labels
 * - Vector SVG Export & High-Resolution PNG Export
 */

(function(root, factory) {
  const instance = factory();
  if (typeof root !== 'undefined' && root) {
    root.Graphpaper = instance;
  }
  if (typeof window !== 'undefined' && window) {
    window.Graphpaper = instance;
  }
  if (typeof module === 'object' && module && module.exports) {
    module.exports = instance;
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';

  function isSameEntity(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.type === b.type &&
           a.label === b.label &&
           Math.abs(a.px - b.px) < 1 &&
           Math.abs(a.py - b.py) < 1;
  }

  class Graphpaper {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');

      // Math Viewport Bounds
      this.bounds = {
        xMin: options.xMin || -10,
        xMax: options.xMax || 10,
        yMin: options.yMin || -6,
        yMax: options.yMax || 6
      };

      // Default home bounds for reset
      this.homeBounds = { ...this.bounds };

      // Render settings
      this.showGrid = options.showGrid !== undefined ? options.showGrid : true;
      this.showSubGrid = options.showSubGrid !== undefined ? options.showSubGrid : true;
      this.showAxes = options.showAxes !== undefined ? options.showAxes : true;
      this.showLabels = options.showLabels !== undefined ? options.showLabels : true;
      this.angleMode = options.angleMode || 'radians';
      this.darkMode = options.darkMode || false;
      this.squareAspectRatio = options.squareAspectRatio || false;
      this.xAxisLabel = options.xAxisLabel || 'x';
      this.yAxisLabel = options.yAxisLabel || 'y';

      // Mouse & Tracing state
      this.isDragging = false;
      this.isTracing = false;
      this.isDraggingPoint = false;
      this.draggedPointItem = null;
      this.tracedItem = null;
      this.lastMouse = { x: 0, y: 0 };
      this.mouseMath = { x: 0, y: 0 };
      this.hoveredEntity = null;
      this.pinnedEntity = null;
      this.keyPoints = [];

      // Resize observer
      this.resize();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => this.resize());
      }

      // Bind interaction handlers
      this.bindEvents();

      // State items to draw
      this.expressions = [];
      this.variables = {};
      this.onPointDrag = null; // Callback for updating linked slider variables
    }

    resize() {
      const parent = this.canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : { width: 800, height: 600 };
      const hasWindow = typeof window !== 'undefined';
      this.dpr = (hasWindow && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      this.width = rect.width > 0 ? rect.width : (hasWindow && window.innerWidth ? Math.max(400, window.innerWidth - 380) : 800);
      this.height = rect.height > 0 ? rect.height : (hasWindow && window.innerHeight ? Math.max(300, window.innerHeight) : 600);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);

      if (this.squareAspectRatio) {
        this.enforceSquareAspect();
      }

      this.requestRender();
    }

    enforceSquareAspect() {
      const xSpan = this.bounds.xMax - this.bounds.xMin;
      const targetYSpan = xSpan * (this.height / this.width);
      const yMid = (this.bounds.yMin + this.bounds.yMax) / 2;
      this.bounds.yMin = yMid - targetYSpan / 2;
      this.bounds.yMax = yMid + targetYSpan / 2;
    }

    // --- COORDINATE PROJECTIONS ---
    mathToScreen(x, y) {
      const px = ((x - this.bounds.xMin) / (this.bounds.xMax - this.bounds.xMin)) * this.width;
      const py = ((this.bounds.yMax - y) / (this.bounds.yMax - this.bounds.yMin)) * this.height;
      return { x: px, y: py };
    }

    screenToMath(px, py) {
      const x = this.bounds.xMin + (px / this.width) * (this.bounds.xMax - this.bounds.xMin);
      const y = this.bounds.yMax - (py / this.height) * (this.bounds.yMax - this.bounds.yMin);
      return { x, y };
    }

    formatVal(v) {
      if (typeof window !== 'undefined' && window.OmniMath && window.OmniMath.formatCoordinate) {
        return window.OmniMath.formatCoordinate(v);
      }
      if (typeof OmniMath !== 'undefined' && OmniMath.formatCoordinate) {
        return OmniMath.formatCoordinate(v);
      }
      return Number(v.toPrecision(5)).toString();
    }

    // --- VIEWPORT NAVIGATION ---
    setHome() {
      this.bounds = { ...this.homeBounds };
      if (this.squareAspectRatio) this.enforceSquareAspect();
      this.requestRender();
    }

    setBounds(xMin, xMax, yMin, yMax) {
      if (typeof xMin === 'number' && isFinite(xMin)) this.bounds.xMin = xMin;
      if (typeof xMax === 'number' && isFinite(xMax)) this.bounds.xMax = xMax;
      if (typeof yMin === 'number' && isFinite(yMin)) this.bounds.yMin = yMin;
      if (typeof yMax === 'number' && isFinite(yMax)) this.bounds.yMax = yMax;
      if (this.squareAspectRatio) this.enforceSquareAspect();
      this.requestRender();
    }

    setDarkMode(val) {
      this.darkMode = !!val;
      this.requestRender();
    }

    setSettings(opts = {}) {
      if (opts.showGrid !== undefined) this.showGrid = opts.showGrid;
      if (opts.showSubGrid !== undefined) this.showSubGrid = opts.showSubGrid;
      if (opts.showAxes !== undefined) this.showAxes = opts.showAxes;
      if (opts.showLabels !== undefined) this.showLabels = opts.showLabels;
      if (opts.angleMode !== undefined) this.angleMode = opts.angleMode;
      if (opts.darkMode !== undefined) this.darkMode = opts.darkMode;
      if (opts.squareAspectRatio !== undefined) this.squareAspectRatio = opts.squareAspectRatio;
      if (opts.xAxisLabel !== undefined) this.xAxisLabel = opts.xAxisLabel;
      if (opts.yAxisLabel !== undefined) this.yAxisLabel = opts.yAxisLabel;
      if (opts.bounds) {
        this.setBounds(opts.bounds.xMin, opts.bounds.xMax, opts.bounds.yMin, opts.bounds.yMax);
      } else if (this.squareAspectRatio) {
        this.enforceSquareAspect();
      }
      this.requestRender();
    }

    zoom(factor, centerScreen = null) {
      const center = centerScreen || { x: this.width / 2, y: this.height / 2 };
      const centerMath = this.screenToMath(center.x, center.y);

      const xSpan = (this.bounds.xMax - this.bounds.xMin) * factor;
      const ySpan = (this.bounds.yMax - this.bounds.yMin) * factor;

      const xRatio = center.x / this.width;
      const yRatio = 1 - (center.y / this.height);

      this.bounds.xMin = centerMath.x - xRatio * xSpan;
      this.bounds.xMax = this.bounds.xMin + xSpan;
      this.bounds.yMin = centerMath.y - yRatio * ySpan;
      this.bounds.yMax = this.bounds.yMin + ySpan;

      if (this.squareAspectRatio) this.enforceSquareAspect();
      this.requestRender();
    }

    // --- EVENT BINDING ---
    bindEvents() {
      const el = this.canvas;

      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        // Check if clicked near a draggable point item
        for (const item of this.expressions) {
          if (item.visible && item.compiled && item.compiled.kind === 'point' && item.compiled.evalPoint) {
            const ptMath = item.compiled.evalPoint();
            if (!isNaN(ptMath.x) && !isNaN(ptMath.y)) {
              const ptScr = this.mathToScreen(ptMath.x, ptMath.y);
              if (Math.hypot(ptScr.x - px, ptScr.y - py) < 14) {
                this.isDraggingPoint = true;
                this.draggedPointItem = item;
                el.style.cursor = 'move';
                return;
              }
            }
          }
        }

        // If clicking on or near an entity / curve / POI, begin interactive curve tracing & pin it
        if (this.hoveredEntity) {
          this.isTracing = true;
          this.tracedItem = this.hoveredEntity.item || null;
          this.pinnedEntity = { ...this.hoveredEntity };
          el.style.cursor = 'pointer';
          this.requestRender();
        } else {
          this.pinnedEntity = null;
          this.isDragging = true;
          this.lastMouse = { x: e.clientX, y: e.clientY };
          el.style.cursor = 'grabbing';
          this.requestRender();
        }
      });

      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          this.mouseMath = this.screenToMath(px, py);

          if (this.isDraggingPoint && this.draggedPointItem) {
            // Dragging a coordinate point on canvas
            if (this.onPointDrag) {
              this.onPointDrag(this.draggedPointItem, this.mouseMath.x, this.mouseMath.y);
            }
            this.requestRender();
          } else if (this.isTracing && this.tracedItem) {
            // Interactive Curve Tracing: pin marker along curve at cursor xMath
            const xMath = this.mouseMath.x;
            let yVal = this.tracedItem.compiled.eval(xMath, xMath);
            if (!isNaN(yVal) && isFinite(yVal)) {
              const pt = this.mathToScreen(xMath, yVal);
              
              // Magnetic snap to nearby POIs if within 14px
              let snappedPoi = null;
              let minPoiDist = 14;
              for (const poi of this.keyPoints) {
                if (poi.item === this.tracedItem) {
                  const dist = Math.hypot(poi.px - px, poi.py - py);
                  if (dist < minPoiDist) {
                    minPoiDist = dist;
                    snappedPoi = poi;
                  }
                }
              }

              if (snappedPoi) {
                this.hoveredEntity = {
                  type: snappedPoi.type,
                  isPoi: true,
                  px: snappedPoi.px,
                  py: snappedPoi.py,
                  xVal: snappedPoi.xVal,
                  yVal: snappedPoi.yVal,
                  color: snappedPoi.color,
                  label: snappedPoi.label,
                  item: snappedPoi.item
                };
              } else {
                this.hoveredEntity = {
                  type: 'trace',
                  px: pt.x,
                  py: pt.y,
                  xVal: xMath,
                  yVal: yVal,
                  color: this.tracedItem.color,
                  label: `(${this.formatVal(xMath)}, ${this.formatVal(yVal)})`,
                  item: this.tracedItem
                };
              }
              this.requestRender();
            }
          } else if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };

            const mathDx = (dx / this.width) * (this.bounds.xMax - this.bounds.xMin);
            const mathDy = (dy / this.height) * (this.bounds.yMax - this.bounds.yMin);

            this.bounds.xMin -= mathDx;
            this.bounds.xMax -= mathDx;
            this.bounds.yMin += mathDy;
            this.bounds.yMax += mathDy;

            this.requestRender();
          } else if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
            this.checkHover(px, py);
          }
        });

        window.addEventListener('mouseup', () => {
          if (this.isDragging || this.isTracing || this.isDraggingPoint) {
            this.isDragging = false;
            this.isTracing = false;
            this.isDraggingPoint = false;
            this.draggedPointItem = null;
            this.tracedItem = null;
            el.style.cursor = 'crosshair';
          }
        });
      }

      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 0.88 : 1.14;
        this.zoom(factor, { x: px, y: py });
      }, { passive: false });

      el.addEventListener('mouseleave', () => {
        if (!this.isTracing && !this.isDraggingPoint) {
          this.hoveredEntity = null;
          this.requestRender();
        }
      });

      // --- TOUCH EVENT HANDLERS (MOBILE / TABLET GESTURES) ---
      let touchStartDist = 0;
      let isPinchZooming = false;
      let lastSingleTouch = null;
      let singleTouchStart = null;

      el.addEventListener('touchstart', (e) => {
        if (!e.touches) return;
        const rect = el.getBoundingClientRect();

        if (e.touches.length === 1) {
          isPinchZooming = false;
          const t = e.touches[0];
          const px = t.clientX - rect.left;
          const py = t.clientY - rect.top;
          this.mouseMath = this.screenToMath(px, py);
          lastSingleTouch = { x: t.clientX, y: t.clientY };
          singleTouchStart = { x: t.clientX, y: t.clientY, time: Date.now() };

          // 1. Check draggable coordinate point (larger 24px finger target)
          for (const item of this.expressions) {
            if (item.visible && item.compiled && item.compiled.kind === 'point' && item.compiled.evalPoint) {
              const ptMath = item.compiled.evalPoint();
              if (!isNaN(ptMath.x) && !isNaN(ptMath.y)) {
                const ptScr = this.mathToScreen(ptMath.x, ptMath.y);
                if (Math.hypot(ptScr.x - px, ptScr.y - py) < 24) {
                  this.isDraggingPoint = true;
                  this.draggedPointItem = item;
                  if (e.cancelable) e.preventDefault();
                  return;
                }
              }
            }
          }

          // 2. Check nearby curve or key point for inspection
          this.checkHover(px, py);
          if (this.hoveredEntity) {
            this.isTracing = true;
            this.tracedItem = this.hoveredEntity.item || null;
            this.pinnedEntity = { ...this.hoveredEntity };
            this.requestRender();
          } else {
            this.pinnedEntity = null;
            this.isDragging = true;
            this.requestRender();
          }
          if (e.cancelable) e.preventDefault();
        } else if (e.touches.length === 2) {
          // 2-finger pinch gesture
          isPinchZooming = true;
          this.isDragging = false;
          this.isTracing = false;
          this.isDraggingPoint = false;
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          if (e.cancelable) e.preventDefault();
        }
      }, { passive: false });

      el.addEventListener('touchmove', (e) => {
        if (!e.touches) return;
        if (e.cancelable) e.preventDefault();
        const rect = el.getBoundingClientRect();

        if (e.touches.length === 2 && isPinchZooming) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          if (touchStartDist > 0 && curDist > 0) {
            let factor = touchStartDist / curDist;
            factor = Math.max(0.75, Math.min(1.35, factor));
            const curCenter = {
              x: ((t1.clientX + t2.clientX) / 2) - rect.left,
              y: ((t1.clientY + t2.clientY) / 2) - rect.top
            };
            this.zoom(factor, curCenter);
            touchStartDist = curDist;
          }
        } else if (e.touches.length === 1 && !isPinchZooming) {
          const t = e.touches[0];
          const px = t.clientX - rect.left;
          const py = t.clientY - rect.top;
          this.mouseMath = this.screenToMath(px, py);

          if (this.isDraggingPoint && this.draggedPointItem) {
            if (this.onPointDrag) {
              this.onPointDrag(this.draggedPointItem, this.mouseMath.x, this.mouseMath.y);
            }
            this.requestRender();
          } else if (this.isTracing && this.tracedItem) {
            const xMath = this.mouseMath.x;
            let yVal = this.tracedItem.compiled.eval(xMath, xMath);
            if (!isNaN(yVal) && isFinite(yVal)) {
              const pt = this.mathToScreen(xMath, yVal);
              let snappedPoi = null;
              let minPoiDist = 22;
              for (const poi of this.keyPoints) {
                if (poi.item === this.tracedItem) {
                  const dist = Math.hypot(poi.px - px, poi.py - py);
                  if (dist < minPoiDist) {
                    minPoiDist = dist;
                    snappedPoi = poi;
                  }
                }
              }
              if (snappedPoi) {
                this.hoveredEntity = {
                  type: snappedPoi.type,
                  isPoi: true,
                  px: snappedPoi.px,
                  py: snappedPoi.py,
                  xVal: snappedPoi.xVal,
                  yVal: snappedPoi.yVal,
                  color: snappedPoi.color,
                  label: snappedPoi.label,
                  item: snappedPoi.item
                };
              } else {
                this.hoveredEntity = {
                  type: 'trace',
                  px: pt.x,
                  py: pt.y,
                  xVal: xMath,
                  yVal: yVal,
                  color: this.tracedItem.color,
                  label: `(${this.formatVal(xMath)}, ${this.formatVal(yVal)})`,
                  item: this.tracedItem
                };
              }
              this.pinnedEntity = { ...this.hoveredEntity };
              this.requestRender();
            }
          } else if (this.isDragging && lastSingleTouch) {
            const dx = t.clientX - lastSingleTouch.x;
            const dy = t.clientY - lastSingleTouch.y;
            lastSingleTouch = { x: t.clientX, y: t.clientY };

            const mathDx = (dx / this.width) * (this.bounds.xMax - this.bounds.xMin);
            const mathDy = (dy / this.height) * (this.bounds.yMax - this.bounds.yMin);

            this.bounds.xMin -= mathDx;
            this.bounds.xMax -= mathDx;
            this.bounds.yMin += mathDy;
            this.bounds.yMax += mathDy;

            this.requestRender();
          }
        }
      }, { passive: false });

      const handleTouchEnd = (e) => {
        const touchCount = e.touches ? e.touches.length : 0;
        if (touchCount === 0) {
          if (singleTouchStart && lastSingleTouch) {
            const moveDist = Math.hypot(lastSingleTouch.x - singleTouchStart.x, lastSingleTouch.y - singleTouchStart.y);
            const duration = Date.now() - singleTouchStart.time;
            if (moveDist < 8 && duration < 350) {
              const rect = el.getBoundingClientRect();
              const px = lastSingleTouch.x - rect.left;
              const py = lastSingleTouch.y - rect.top;
              this.checkHover(px, py);
              if (this.hoveredEntity) {
                this.pinnedEntity = { ...this.hoveredEntity };
              } else {
                this.pinnedEntity = null;
                this.hoveredEntity = null;
              }
            }
          }
          this.isDragging = false;
          this.isTracing = false;
          this.isDraggingPoint = false;
          this.draggedPointItem = null;
          this.tracedItem = null;
          isPinchZooming = false;
          lastSingleTouch = null;
          singleTouchStart = null;
          this.requestRender();
        } else if (touchCount === 1) {
          isPinchZooming = false;
          lastSingleTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          this.isDragging = true;
        }
      };

      el.addEventListener('touchend', handleTouchEnd);
      el.addEventListener('touchcancel', handleTouchEnd);
    }

    // --- KEY POINTS OF INTEREST & INTERSECTIONS COMPUTATION ---
    computeKeyPoints() {
      const pois = [];
      const b = this.bounds;
      const xSpan = b.xMax - b.xMin;
      const ySpan = b.yMax - b.yMin;

      const activeContinuous = [];

      for (const item of this.expressions) {
        if (!item.visible || !item.compiled || item.compiled.isEmpty || !item.text || item.text.trim() === '' || item.compiled.isSlider || item.compiled.isNote || item.compiled.isFolder) continue;

        const isDiscrete = item.type === 'discrete' || (item.compiled && item.compiled.kind === 'discrete');
        if (isDiscrete) {
          let nStart = (item.customRange && item.nMin !== undefined) ? item.nMin : Math.floor(b.xMin - 1);
          let nEnd = (item.customRange && item.nMax !== undefined) ? item.nMax : Math.ceil(b.xMax + 1);

          if (nEnd - nStart > 1000) {
            const mid = Math.round((b.xMin + b.xMax) / 2);
            nStart = Math.max(nStart, mid - 500);
            nEnd = Math.min(nEnd, mid + 500);
          }

          for (let n = nStart; n <= nEnd; n++) {
            const val = item.compiled.eval(n, n);
            if (isNaN(val) || !isFinite(val)) continue;
            if (Math.abs(val) < 1e-9) {
              const pt = this.mathToScreen(n, 0);
              pois.push({
                type: 'root',
                isPoi: true,
                xVal: n,
                yVal: 0,
                px: pt.x,
                py: pt.y,
                color: item.color,
                label: `(${n}, 0)`,
                item
              });
            }
          }
        } else if (item.compiled.kind === 'point' && item.compiled.evalPoint) {
          const ptM = item.compiled.evalPoint();
          if (!isNaN(ptM.x) && !isNaN(ptM.y) && ptM.x >= b.xMin && ptM.x <= b.xMax && ptM.y >= b.yMin && ptM.y <= b.yMax) {
            const pt = this.mathToScreen(ptM.x, ptM.y);
            pois.push({
              type: 'point',
              isPoi: true,
              xVal: ptM.x,
              yVal: ptM.y,
              px: pt.x,
              py: pt.y,
              color: item.color,
              label: item.compiled.name ? `${item.compiled.name} = (${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})` : `(${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})`,
              item
            });
          }
        } else if (item.compiled.kind === 'complex' && item.compiled.evalPoint) {
          const ptM = item.compiled.evalPoint();
          if (!isNaN(ptM.x) && !isNaN(ptM.y) && ptM.x >= b.xMin && ptM.x <= b.xMax && ptM.y >= b.yMin && ptM.y <= b.yMax) {
            const pt = this.mathToScreen(ptM.x, ptM.y);
            const cStr = item.compiled.value ? item.compiled.value.toString() : `(${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})`;
            pois.push({
              type: 'complex',
              isPoi: true,
              xVal: ptM.x,
              yVal: ptM.y,
              px: pt.x,
              py: pt.y,
              color: item.color,
              label: item.compiled.name ? `${item.compiled.name} = ${cStr}` : cStr,
              item
            });
          }
        } else if (item.compiled.kind === 'continuous' || item.type === 'continuous' || item.compiled.kind === 'inequality') {
          activeContinuous.push(item);

          // 1. Y-Intercept
          if (b.xMin <= 0 && b.xMax >= 0) {
            const y0 = item.compiled.eval(0, 0);
            if (!isNaN(y0) && isFinite(y0) && y0 >= b.yMin && y0 <= b.yMax) {
              const pt = this.mathToScreen(0, y0);
              pois.push({
                type: 'y-intercept',
                isPoi: true,
                xVal: 0,
                yVal: y0,
                px: pt.x,
                py: pt.y,
                color: item.color,
                label: `(0, ${this.formatVal(y0)})`,
                item
              });
            }
          }

          // 2. X-Intercepts (Roots) & Extrema scanning
          const samples = 120;
          const step = xSpan / samples;
          let prevX = b.xMin;
          let prevY = item.compiled.eval(prevX, prevX);
          let prevSlope = null;

          for (let i = 1; i <= samples; i++) {
            const curX = b.xMin + i * step;
            const curY = item.compiled.eval(curX, curX);

            if (isNaN(curY) || !isFinite(curY) || isNaN(prevY) || !isFinite(prevY)) {
              prevX = curX;
              prevY = curY;
              prevSlope = null;
              continue;
            }

            // Root detection (opposite sign with no vertical asymptote jump)
            if ((prevY * curY <= 0) && Math.abs(curY - prevY) < ySpan * 1.5) {
              let lo = prevX, hi = curX;
              for (let iter = 0; iter < 12; iter++) {
                const mid = (lo + hi) / 2;
                const midY = item.compiled.eval(mid, mid);
                if (isNaN(midY)) break;
                if (Math.abs(midY) < 1e-9 || (hi - lo) < 1e-6 * xSpan) {
                  lo = mid; break;
                }
                if (prevY * midY <= 0) {
                  hi = mid;
                } else {
                  lo = mid;
                }
              }
              let rootX = (lo + hi) / 2;
              if (Math.abs(rootX) < 1e-4) rootX = 0;
              const pt = this.mathToScreen(rootX, 0);
              if (pt.x >= 0 && pt.x <= this.width && pt.y >= 0 && pt.y <= this.height) {
                pois.push({
                  type: 'root',
                  isPoi: true,
                  xVal: rootX,
                  yVal: 0,
                  px: pt.x,
                  py: pt.y,
                  color: item.color,
                  label: `(${this.formatVal(rootX)}, 0)`,
                  item
                });
              }
            }

            // Extrema detection (slope sign change) with derivative bisection refinement
            const curSlope = curY - prevY;
            if (prevSlope !== null && (prevSlope * curSlope < 0) && Math.abs(curSlope - prevSlope) < ySpan) {
              let eLo = prevX, eHi = curX;
              const deriv = (x) => {
                const eps = 1e-5;
                return (item.compiled.eval(x + eps, x + eps) - item.compiled.eval(x - eps, x - eps)) / (2 * eps);
              };
              let dLo = deriv(eLo);
              for (let iter = 0; iter < 16; iter++) {
                const mid = (eLo + eHi) / 2;
                const dMid = deriv(mid);
                if (isNaN(dMid) || Math.abs(dMid) < 1e-9 || (eHi - eLo) < 1e-6 * xSpan) {
                  eLo = mid; break;
                }
                if (dLo * dMid <= 0) {
                  eHi = mid;
                } else {
                  eLo = mid;
                  dLo = dMid;
                }
              }
              let extX = (eLo + eHi) / 2;
              if (Math.abs(extX) < 1e-4) extX = 0;
              const extY = item.compiled.eval(extX, extX);
              if (!isNaN(extY) && isFinite(extY) && extY >= b.yMin && extY <= b.yMax) {
                const pt = this.mathToScreen(extX, extY);
                pois.push({
                  type: 'extremum',
                  isPoi: true,
                  xVal: extX,
                  yVal: extY,
                  px: pt.x,
                  py: pt.y,
                  color: item.color,
                  label: `(${this.formatVal(extX)}, ${this.formatVal(extY)})`,
                  item
                });
              }
            }

            prevSlope = curSlope;
            prevX = curX;
            prevY = curY;
          }
        }
      }

      // 3. Curve Intersections Detection (Between pairs of visible continuous curves)
      if (activeContinuous.length >= 2) {
        for (let i = 0; i < activeContinuous.length; i++) {
          for (let j = i + 1; j < activeContinuous.length; j++) {
            const itA = activeContinuous[i];
            const itB = activeContinuous[j];
            const samples = 80;
            const step = xSpan / samples;
            let prevX = b.xMin;
            let prevDiff = itA.compiled.eval(prevX, prevX) - itB.compiled.eval(prevX, prevX);

            for (let s = 1; s <= samples; s++) {
              const curX = b.xMin + s * step;
              const diffVal = itA.compiled.eval(curX, curX) - itB.compiled.eval(curX, curX);

              if (isNaN(diffVal) || isNaN(prevDiff)) {
                prevX = curX;
                prevDiff = diffVal;
                continue;
              }

              if (prevDiff * diffVal <= 0 && Math.abs(diffVal - prevDiff) < ySpan * 1.5) {
                let lo = prevX, hi = curX;
                for (let iter = 0; iter < 12; iter++) {
                  const mid = (lo + hi) / 2;
                  const mDiff = itA.compiled.eval(mid, mid) - itB.compiled.eval(mid, mid);
                  if (isNaN(mDiff) || Math.abs(mDiff) < 1e-9) { lo = mid; break; }
                  if (prevDiff * mDiff <= 0) hi = mid;
                  else lo = mid;
                }
                const intX = (lo + hi) / 2;
                const intY = itA.compiled.eval(intX, intX);
                if (!isNaN(intY) && isFinite(intY) && intY >= b.yMin && intY <= b.yMax) {
                  const pt = this.mathToScreen(intX, intY);
                  pois.push({
                    type: 'intersection',
                    isPoi: true,
                    xVal: intX,
                    yVal: intY,
                    px: pt.x,
                    py: pt.y,
                    color: '#64748b',
                    label: `Intersection (${this.formatVal(intX)}, ${this.formatVal(intY)})`,
                    item: itA
                  });
                }
              }
              prevX = curX;
              prevDiff = diffVal;
            }
          }
        }
      }

      return pois;
    }

    // --- HOVER & SNAP DETECTION ---
    checkHover(mouseX, mouseY) {
      let closest = null;
      let minDistance = 14;

      // 1. Magnetic snap to Key Points of Interest (POIs) first!
      for (const poi of this.keyPoints) {
        const dist = Math.hypot(poi.px - mouseX, poi.py - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...poi };
        }
      }

      if (closest) {
        if (!isSameEntity(this.hoveredEntity, closest)) {
          this.hoveredEntity = closest;
          this.requestRender();
        }
        return;
      }

      minDistance = 16;
      for (const item of this.expressions) {
        if (!item.visible || !item.compiled || item.compiled.isEmpty || !item.text || item.text.trim() === '' || item.compiled.isSlider || item.compiled.isNote || item.compiled.isFolder) continue;

        const isDiscrete = item.type === 'discrete' || (item.compiled && item.compiled.kind === 'discrete');
        if (isDiscrete) {
          let nStart = (item.customRange && item.nMin !== undefined) ? item.nMin : Math.floor(this.bounds.xMin - 1);
          let nEnd = (item.customRange && item.nMax !== undefined) ? item.nMax : Math.ceil(this.bounds.xMax + 1);

          if (nEnd - nStart > 1000) {
            const mid = Math.round((this.bounds.xMin + this.bounds.xMax) / 2);
            nStart = Math.max(nStart, mid - 500);
            nEnd = Math.min(nEnd, mid + 500);
          }

          for (let n = nStart; n <= nEnd; n++) {
            let val = item.compiled.eval(n, n);
            if (isNaN(val) || !isFinite(val)) continue;

            const pt = this.mathToScreen(n, val);
            const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
            if (dist < minDistance) {
              minDistance = dist;
              closest = {
                type: 'sample',
                px: pt.x,
                py: pt.y,
                xVal: n,
                yVal: val,
                color: item.color,
                label: `n = ${n}, y = ${this.formatVal(val)}`,
                item
              };
            }
          }
        } else if (item.compiled.kind === 'point' && item.compiled.evalPoint) {
          const ptM = item.compiled.evalPoint();
          if (!isNaN(ptM.x) && !isNaN(ptM.y)) {
            const ptS = this.mathToScreen(ptM.x, ptM.y);
            const dist = Math.hypot(ptS.x - mouseX, ptS.y - mouseY);
            if (dist < minDistance) {
              minDistance = dist;
              closest = {
                type: 'point',
                px: ptS.x,
                py: ptS.y,
                xVal: ptM.x,
                yVal: ptM.y,
                color: item.color,
                label: item.compiled.name ? `${item.compiled.name} = (${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})` : `(${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})`,
                item
              };
            }
          }
        } else if (item.compiled.kind === 'complex' && item.compiled.evalPoint) {
          const ptM = item.compiled.evalPoint();
          if (!isNaN(ptM.x) && !isNaN(ptM.y)) {
            const ptS = this.mathToScreen(ptM.x, ptM.y);
            const dist = Math.hypot(ptS.x - mouseX, ptS.y - mouseY);
            if (dist < minDistance) {
              minDistance = dist;
              const cValStr = item.compiled.value ? item.compiled.value.toString() : `(${this.formatVal(ptM.x)}, ${this.formatVal(ptM.y)})`;
              closest = {
                type: 'complex',
                px: ptS.x,
                py: ptS.y,
                xVal: ptM.x,
                yVal: ptM.y,
                color: item.color,
                label: item.compiled.name ? `${item.compiled.name} = ${cValStr}` : cValStr,
                item
              };
            }
          }
        } else {
          // Continuous Curve Snap
          const xMath = this.mouseMath.x;
          const yVal = item.compiled.eval(xMath, xMath);
          if (!isNaN(yVal) && isFinite(yVal)) {
            const pt = this.mathToScreen(xMath, yVal);
            const dist = Math.abs(pt.y - mouseY);
            if (dist < minDistance) {
              minDistance = dist;
              closest = {
                type: 'curve',
                px: pt.x,
                py: pt.y,
                xVal: xMath,
                yVal: yVal,
                color: item.color,
                label: `(${this.formatVal(xMath)}, ${this.formatVal(yVal)})`,
                item
              };
            }
          }
        }
      }

      if (!isSameEntity(this.hoveredEntity, closest)) {
        this.hoveredEntity = closest;
        this.requestRender();
      }
    }

    // --- RENDERING PIPELINE ---
    updateState(expressions, variables) {
      this.expressions = expressions;
      this.variables = variables;
      this.requestRender();
    }

    requestRender() {
      if (this.renderRequested) return;
      this.renderRequested = true;
      const raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));
      raf(() => {
        this.renderRequested = false;
        this.render();
      });
    }

    render() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // 1. Clear Canvas (Dark or Light)
      if (this.darkMode) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      // 2. Draw Grid & Axes
      if (this.showGrid) this.drawGrid();

      // 3. Draw Expressions (Inequalities, Curves, Stems, Points, Parametric)
      for (const item of this.expressions) {
        if (!item.visible || !item.compiled || item.compiled.isEmpty || !item.text || item.text.trim() === '' || item.compiled.isSlider || item.compiled.isNote || item.compiled.isFolder) continue;

        const kind = item.compiled.kind;
        if (kind === 'inequality') {
          this.drawInequality(item);
        } else if (kind === 'point') {
          this.drawPoint(item);
        } else if (kind === 'complex') {
          this.drawComplexNumber(item);
        } else if (kind === 'parametric') {
          this.drawParametric(item);
        } else if (kind === 'polar') {
          this.drawPolar(item);
        } else if (kind === 'discrete' || item.type === 'discrete') {
          this.drawDiscreteSignal(item);
          if (item.reconstruction) {
            this.drawReconstructionOverlay(item);
          }
        } else {
          this.drawContinuousCurve(item);
        }
      }

      // 4. Compute & Render Key Points of Interest (POIs)
      this.keyPoints = this.computeKeyPoints();
      this.drawKeyPoints(this.keyPoints);

      // 5. Draw Pinned & Hover Tooltips
      if (this.pinnedEntity) {
        this.drawHoverTooltip(this.pinnedEntity, true);
      }
      if (this.hoveredEntity && (!this.pinnedEntity || !isSameEntity(this.hoveredEntity, this.pinnedEntity))) {
        this.drawHoverTooltip(this.hoveredEntity, false);
      }
    }

    // --- ADAPTIVE CARTESIAN GRID ---
    drawGrid() {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const b = this.bounds;

      const xSpan = b.xMax - b.xMin;
      const ySpan = b.yMax - b.yMin;

      function getStep(span, pixelDimension) {
        const roughSteps = pixelDimension / 70;
        const rawStep = span / roughSteps;
        const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const norm = rawStep / mag;
        if (norm < 1.5) return mag;
        if (norm < 3.5) return 2 * mag;
        if (norm < 7.5) return 5 * mag;
        return 10 * mag;
      }

      const xStep = getStep(xSpan, w);
      const yStep = getStep(ySpan, h);
      const xSub = xStep / 5;
      const ySub = yStep / 5;

      const subGridCol = this.darkMode ? '#152033' : '#f1f5f9';
      const majorGridCol = this.darkMode ? '#1e293b' : '#e2e8f0';
      const axesCol = this.darkMode ? '#64748b' : '#64748b';
      const textCol = this.darkMode ? '#94a3b8' : '#64748b';

      // 1. Minor Sub-Grid Lines
      if (this.showSubGrid) {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = subGridCol;
        ctx.beginPath();
        for (let x = Math.floor(b.xMin / xSub) * xSub; x <= b.xMax; x += xSub) {
          const pt = this.mathToScreen(x, 0);
          ctx.moveTo(pt.x, 0); ctx.lineTo(pt.x, h);
        }
        for (let y = Math.floor(b.yMin / ySub) * ySub; y <= b.yMax; y += ySub) {
          const pt = this.mathToScreen(0, y);
          ctx.moveTo(0, pt.y); ctx.lineTo(w, pt.y);
        }
        ctx.stroke();
      }

      // 2. Major Grid Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = majorGridCol;
      ctx.beginPath();
      for (let x = Math.floor(b.xMin / xStep) * xStep; x <= b.xMax; x += xStep) {
        const pt = this.mathToScreen(x, 0);
        ctx.moveTo(pt.x, 0); ctx.lineTo(pt.x, h);
      }
      for (let y = Math.floor(b.yMin / yStep) * yStep; y <= b.yMax; y += yStep) {
        const pt = this.mathToScreen(0, y);
        ctx.moveTo(0, pt.y); ctx.lineTo(w, pt.y);
      }
      ctx.stroke();

      // 3. Axes
      if (this.showAxes) {
        const origin = this.mathToScreen(0, 0);

        ctx.lineWidth = 1.6;
        ctx.strokeStyle = axesCol;

        // X Axis
        ctx.beginPath();
        const yAxisPx = Math.max(15, Math.min(h - 15, origin.y));
        ctx.moveTo(0, yAxisPx);
        ctx.lineTo(w, yAxisPx);
        ctx.stroke();

        // Y Axis
        ctx.beginPath();
        const xAxisPx = Math.max(30, Math.min(w - 30, origin.x));
        ctx.moveTo(xAxisPx, 0);
        ctx.lineTo(xAxisPx, h);
        ctx.stroke();

        // Axis Name Badges
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = textCol;
        ctx.textAlign = 'right';
        ctx.fillText(this.xAxisLabel, w - 12, yAxisPx - 8);
        ctx.textAlign = 'left';
        ctx.fillText(this.yAxisLabel, xAxisPx + 8, 16);

        // Numbers Labels
        if (this.showLabels) {
          ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = textCol;
          ctx.textAlign = 'center';

          // X Labels
          for (let x = Math.floor(b.xMin / xStep) * xStep; x <= b.xMax; x += xStep) {
            if (Math.abs(x) < 1e-9) continue;
            const pt = this.mathToScreen(x, 0);
            const labelStr = Number(x.toPrecision(6)).toString();
            ctx.fillText(labelStr, pt.x, yAxisPx + 16);
          }

          // Y Labels
          ctx.textAlign = 'right';
          for (let y = Math.floor(b.yMin / yStep) * yStep; y <= b.yMax; y += yStep) {
            if (Math.abs(y) < 1e-9) continue;
            const pt = this.mathToScreen(0, y);
            const labelStr = Number(y.toPrecision(6)).toString();
            ctx.fillText(labelStr, xAxisPx - 8, pt.y + 4);
          }

          // Zero Origin
          ctx.textAlign = 'right';
          ctx.fillText('0', xAxisPx - 6, yAxisPx + 14);
        }
      }
    }

    // --- CONTINUOUS CURVE DRAWING (60 FPS) ---
    drawContinuousCurve(item) {
      const ctx = this.ctx;
      const b = this.bounds;
      const w = this.width;
      const h = this.height;

      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth || 2.5;

      if (item.lineStyle === 'dashed') ctx.setLineDash([7, 4]);
      else if (item.lineStyle === 'dotted') ctx.setLineDash([2, 3]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      let isDrawing = false;
      let lastY = 0;

      const stepPx = 2;
      for (let px = 0; px <= w; px += stepPx) {
        const xMath = b.xMin + (px / w) * (b.xMax - b.xMin);
        const yVal = item.compiled.eval(xMath, xMath);

        if (isNaN(yVal) || !isFinite(yVal)) {
          isDrawing = false;
          continue;
        }

        const py = ((b.yMax - yVal) / (b.yMax - b.yMin)) * h;

        if (isDrawing && Math.abs(py - lastY) > h * 0.9) {
          ctx.moveTo(px, py);
        } else if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }
        lastY = py;
      }

      ctx.stroke();
      ctx.restore();
    }

    // --- INEQUALITY SHADING ---
    drawInequality(item) {
      const ctx = this.ctx;
      const b = this.bounds;
      const w = this.width;
      const h = this.height;
      const op = item.compiled.operator || '<=';

      ctx.save();

      // Shading fill
      ctx.fillStyle = hexToRgba(item.color, 0.16);
      ctx.beginPath();

      const stepPx = 2;
      const baselinePy = (op === '<=' || op === '<') ? h : 0;

      ctx.moveTo(0, baselinePy);
      for (let px = 0; px <= w; px += stepPx) {
        const xMath = b.xMin + (px / w) * (b.xMax - b.xMin);
        const yVal = item.compiled.eval(xMath, xMath);
        const py = isNaN(yVal) ? baselinePy : ((b.yMax - yVal) / (b.yMax - b.yMin)) * h;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(w, baselinePy);
      ctx.closePath();
      ctx.fill();

      // Draw boundary line
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth || 2.5;
      if (op === '<' || op === '>') ctx.setLineDash([6, 5]); // Strict inequality is dashed
      else ctx.setLineDash([]);

      ctx.beginPath();
      let isDrawing = false;
      for (let px = 0; px <= w; px += stepPx) {
        const xMath = b.xMin + (px / w) * (b.xMax - b.xMin);
        const yVal = item.compiled.eval(xMath, xMath);
        if (isNaN(yVal) || !isFinite(yVal)) {
          isDrawing = false;
          continue;
        }
        const py = ((b.yMax - yVal) / (b.yMax - b.yMin)) * h;
        if (!isDrawing) { ctx.moveTo(px, py); isDrawing = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.restore();
    }

    // --- POINT PLOTTING & DRAGGABLE ANCHORS ---
    drawPoint(item) {
      if (!item.compiled.evalPoint) return;
      const ptM = item.compiled.evalPoint();
      if (isNaN(ptM.x) || isNaN(ptM.y)) return;

      const ptS = this.mathToScreen(ptM.x, ptM.y);
      const ctx = this.ctx;

      ctx.save();
      // Outer halo
      ctx.beginPath();
      ctx.arc(ptS.x, ptS.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(item.color, 0.25);
      ctx.fill();

      // Solid inner
      ctx.beginPath();
      ctx.arc(ptS.x, ptS.y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label if named
      if (item.compiled.name) {
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = this.darkMode ? '#f8fafc' : '#1e293b';
        ctx.fillText(item.compiled.name, ptS.x + 9, ptS.y - 4);
      }
      ctx.restore();
    }

    // --- COMPLEX NUMBER (ARGAND / PHASOR) DRAWING ---
    drawComplexNumber(item) {
      const ctx = this.ctx;
      if (!item.compiled || !item.compiled.evalPoint) return;
      const ptM = item.compiled.evalPoint();
      if (isNaN(ptM.x) || isNaN(ptM.y) || !isFinite(ptM.x) || !isFinite(ptM.y)) return;

      const origin = this.mathToScreen(0, 0);
      const ptS = this.mathToScreen(ptM.x, ptM.y);

      ctx.save();
      // 1. Phasor line from origin (0,0) to (re, im)
      ctx.strokeStyle = item.color || '#9333ea';
      ctx.lineWidth = item.lineWidth || 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(ptS.x, ptS.y);
      ctx.stroke();

      // 2. Phasor Arrowhead
      const angle = Math.atan2(ptS.y - origin.y, ptS.x - origin.x);
      const arrowLen = 9;
      ctx.setLineDash([]);
      ctx.fillStyle = item.color || '#9333ea';
      ctx.beginPath();
      ctx.moveTo(ptS.x, ptS.y);
      ctx.lineTo(
        ptS.x - arrowLen * Math.cos(angle - Math.PI / 6),
        ptS.y - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ptS.x - arrowLen * Math.cos(angle + Math.PI / 6),
        ptS.y - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // 3. Point Anchor Dot
      ctx.beginPath();
      ctx.arc(ptS.x, ptS.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = item.color || '#9333ea';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Label Badge
      const labelText = item.compiled.name
        ? `${item.compiled.name} = ${item.compiled.value ? item.compiled.value.toString() : ''}`
        : (item.compiled.value ? item.compiled.value.toString() : '');
      if (labelText) {
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.darkMode ? '#f8fafc' : '#1e293b';
        ctx.fillText(labelText, ptS.x + 9, ptS.y - 6);
      }
      ctx.restore();
    }

    // --- PARAMETRIC CURVE DRAWING ---
    drawParametric(item) {
      const ctx = this.ctx;
      const b = this.bounds;
      const w = this.width;
      const h = this.height;

      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth || 2.5;
      ctx.beginPath();

      const tMin = 0;
      const tMax = 2 * Math.PI;
      const steps = 300;
      let isDrawing = false;

      for (let i = 0; i <= steps; i++) {
        const t = tMin + (i / steps) * (tMax - tMin);
        const ptM = item.compiled.evalPoint(t);
        if (isNaN(ptM.x) || isNaN(ptM.y) || !isFinite(ptM.x) || !isFinite(ptM.y)) {
          isDrawing = false;
          continue;
        }
        const ptS = this.mathToScreen(ptM.x, ptM.y);
        if (!isDrawing) { ctx.moveTo(ptS.x, ptS.y); isDrawing = true; }
        else ctx.lineTo(ptS.x, ptS.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- POLAR CURVE DRAWING ---
    drawPolar(item) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth || 2.5;
      ctx.beginPath();

      const thetaMin = 0;
      const thetaMax = 2 * Math.PI;
      const steps = 360;
      let isDrawing = false;

      for (let i = 0; i <= steps; i++) {
        const theta = thetaMin + (i / steps) * (thetaMax - thetaMin);
        const r = item.compiled.eval(theta, theta, theta);
        if (isNaN(r) || !isFinite(r)) {
          isDrawing = false;
          continue;
        }
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const ptS = this.mathToScreen(x, y);
        if (!isDrawing) { ctx.moveTo(ptS.x, ptS.y); isDrawing = true; }
        else ctx.lineTo(ptS.x, ptS.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- DISCRETE STEM & LOLLIPOP DRAWING (60 FPS) ---
    drawDiscreteSignal(item) {
      const ctx = this.ctx;
      const b = this.bounds;

      let nMin = (item.customRange && item.nMin !== undefined) ? item.nMin : Math.floor(b.xMin - 1);
      let nMax = (item.customRange && item.nMax !== undefined) ? item.nMax : Math.ceil(b.xMax + 1);

      if (nMax - nMin > 4000) {
        const mid = Math.round((b.xMin + b.xMax) / 2);
        nMin = Math.max(nMin, mid - 2000);
        nMax = Math.min(nMax, mid + 2000);
      }

      const basePt = this.mathToScreen(0, item.baseline || 0);
      const yZeroPx = basePt.y;

      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth || 2.5;

      if (item.lineStyle === 'dashed') ctx.setLineDash([6, 4]);
      else if (item.lineStyle === 'dotted') ctx.setLineDash([2, 3]);
      else ctx.setLineDash([]);

      // 1. Draw Stems
      ctx.beginPath();
      for (let n = nMin; n <= nMax; n++) {
        const val = item.compiled.eval(n, n);
        if (isNaN(val) || !isFinite(val)) continue;
        const pt = this.mathToScreen(n, val);
        ctx.moveTo(pt.x, yZeroPx);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // 2. Draw Marker Caps
      ctx.setLineDash([]);
      const r = item.markerRadius || 5;

      for (let n = nMin; n <= nMax; n++) {
        const val = item.compiled.eval(n, n);
        if (isNaN(val) || !isFinite(val)) continue;
        const pt = this.mathToScreen(n, val);

        if (item.markerShape === 'circle-hollow') {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = this.darkMode ? '#0f172a' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.lineWidth || 2;
          ctx.stroke();
        } else if (item.markerShape === 'cross') {
          ctx.beginPath();
          ctx.moveTo(pt.x - r, pt.y - r); ctx.lineTo(pt.x + r, pt.y + r);
          ctx.moveTo(pt.x + r, pt.y - r); ctx.lineTo(pt.x - r, pt.y + r);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.lineWidth || 2;
          ctx.stroke();
        } else if (item.markerShape === 'arrow') {
          const dir = val >= (item.baseline || 0) ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x - r, pt.y - dir * r);
          ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + r, pt.y - dir * r);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = (item.lineWidth || 2) + 0.5;
          ctx.stroke();
        } else if (item.markerShape === 'square') {
          ctx.beginPath();
          ctx.rect(pt.x - r, pt.y - r, 2 * r, 2 * r);
          ctx.fillStyle = item.color;
          ctx.fill();
        } else {
          // Default: Filled Circle
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = item.color;
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // --- RECONSTRUCTION & INTERPOLATION OVERLAYS ---
    drawReconstructionOverlay(item) {
      const mode = item.reconstruction; // 'zoh', 'linear', or 'sinc'
      if (!mode || mode === 'none') return;

      const ctx = this.ctx;
      const b = this.bounds;
      const w = this.width;
      const h = this.height;

      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);

      const nMin = Math.floor(b.xMin - 1);
      const nMax = Math.ceil(b.xMax + 1);

      ctx.beginPath();

      if (mode === 'zoh') {
        // Zero-Order Hold (Staircase)
        let isStarted = false;
        for (let n = nMin; n <= nMax; n++) {
          const val = item.compiled.eval(n, n);
          if (isNaN(val)) continue;
          const p1 = this.mathToScreen(n, val);
          const p2 = this.mathToScreen(n + 1, val);
          if (!isStarted) {
            ctx.moveTo(p1.x, p1.y);
            isStarted = true;
          } else {
            ctx.lineTo(p1.x, p1.y);
          }
          ctx.lineTo(p2.x, p2.y);
        }
      } else if (mode === 'linear') {
        // Linear First-Order Hold (Connect the dots)
        let isStarted = false;
        for (let n = nMin; n <= nMax; n++) {
          const val = item.compiled.eval(n, n);
          if (isNaN(val)) continue;
          const pt = this.mathToScreen(n, val);
          if (!isStarted) { ctx.moveTo(pt.x, pt.y); isStarted = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
      } else if (mode === 'sinc') {
        // Whittaker-Shannon Ideal Sinc Reconstruction
        const stepPx = 3;
        let isStarted = false;
        for (let px = 0; px <= w; px += stepPx) {
          const t = b.xMin + (px / w) * (b.xMax - b.xMin);
          let sum = 0;
          for (let k = Math.floor(t - 15); k <= Math.ceil(t + 15); k++) {
            const xk = item.compiled.eval(k, k);
            if (isNaN(xk) || xk === 0) continue;
            const diff = t - k;
            const sincVal = (diff === 0) ? 1 : Math.sin(Math.PI * diff) / (Math.PI * diff);
            sum += xk * sincVal;
          }
          const pt = this.mathToScreen(t, sum);
          if (!isStarted) { ctx.moveTo(pt.x, pt.y); isStarted = true; }
          else ctx.lineTo(pt.x, pt.y);
        }
      }

      ctx.stroke();
      ctx.restore();
    }

    // --- KEY POINTS (POIs) RENDERING ---
    drawKeyPoints(pois) {
      const ctx = this.ctx;
      for (const poi of pois) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(poi.px, poi.py, 4, 0, 2 * Math.PI);
        ctx.fillStyle = this.darkMode ? '#0f172a' : 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = poi.color || '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- HOVER / TRACE TOOLTIP ---
    drawHoverTooltip(entity, isPinned = false) {
      if (!entity || !entity.label) return;
      const ctx = this.ctx;
      const { px, py, color, label, isPoi, type } = entity;

      ctx.save();

      // Outer Halo Ring
      ctx.beginPath();
      ctx.arc(px, py, isPoi ? 7 : 9, 0, 2 * Math.PI);
      ctx.strokeStyle = color || '#2d70b3';
      ctx.lineWidth = isPinned ? 3 : 2.5;
      ctx.stroke();

      if (isPoi) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Tooltip Card
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textW = ctx.measureText(label).width;
      const boxW = Math.max(48, textW + 20);
      const boxH = 26;
      let boxX = px + 12;
      let boxY = py - 32;

      if (boxX + boxW > this.width - 8) boxX = px - boxW - 12;
      if (boxX < 8) boxX = 8;
      if (boxY < 8) boxY = py + 14;

      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = this.darkMode ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();

      if (isPinned) {
        ctx.strokeStyle = color || '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Explicitly reset alignment & baseline to ensure perfect centering inside bubble!
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2);
      ctx.restore();
    }

    // --- VECTOR SVG EXPORT ---
    exportSVG() {
      const w = this.width;
      const h = this.height;
      const b = this.bounds;
      const bgCol = this.darkMode ? '#0f172a' : '#ffffff';
      const gridCol = this.darkMode ? '#1e293b' : '#e2e8f0';
      const axesCol = this.darkMode ? '#64748b' : '#64748b';

      let svg = `<?xml version="1.0" standalone="no"?>\n`;
      svg += `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">\n`;
      svg += `  <rect width="${w}" height="${h}" fill="${bgCol}"/>\n`;

      // Axes
      const origin = this.mathToScreen(0, 0);
      const xAxisY = Math.max(15, Math.min(h - 15, origin.y));
      const yAxisX = Math.max(30, Math.min(w - 30, origin.x));
      svg += `  <line x1="0" y1="${xAxisY}" x2="${w}" y2="${xAxisY}" stroke="${axesCol}" stroke-width="1.8"/>\n`;
      svg += `  <line x1="${yAxisX}" y1="0" x2="${yAxisX}" y2="${h}" stroke="${axesCol}" stroke-width="1.8"/>\n`;

      // Expressions
      for (const item of this.expressions) {
        if (!item.visible || !item.compiled || item.compiled.isEmpty || !item.text || item.text.trim() === '' || item.compiled.isSlider || item.compiled.isNote || item.compiled.isFolder) continue;

        if (item.type === 'discrete' || (item.compiled && item.compiled.kind === 'discrete')) {
          const nMin = Math.floor(b.xMin - 1);
          const nMax = Math.ceil(b.xMax + 1);
          for (let n = nMin; n <= nMax; n++) {
            const val = item.compiled.eval(n, n);
            if (isNaN(val) || !isFinite(val)) continue;
            const pt = this.mathToScreen(n, val);
            svg += `  <line x1="${pt.x}" y1="${xAxisY}" x2="${pt.x}" y2="${pt.y}" stroke="${item.color}" stroke-width="${item.lineWidth || 2.5}"/>\n`;
            svg += `  <circle cx="${pt.x}" cy="${pt.y}" r="${item.markerRadius || 5}" fill="${item.color}"/>\n`;
          }
        } else {
          // Continuous polyline
          let pointsStr = '';
          for (let px = 0; px <= w; px += 2) {
            const xMath = b.xMin + (px / w) * (b.xMax - b.xMin);
            const yVal = item.compiled.eval(xMath, xMath);
            if (isNaN(yVal) || !isFinite(yVal)) continue;
            const py = ((b.yMax - yVal) / (b.yMax - b.yMin)) * h;
            pointsStr += `${px},${py.toFixed(1)} `;
          }
          if (pointsStr) {
            svg += `  <polyline fill="none" stroke="${item.color}" stroke-width="${item.lineWidth || 2.5}" points="${pointsStr.trim()}"/>\n`;
          }
        }
      }

      svg += `</svg>`;
      return svg;
    }
  }

  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(45, 112, 179, ${alpha})`;
    let c = hex.substring(1);
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return Graphpaper;
});
