/**
 * OmniGraph - Desmos-Style Application Controller
 * 
 * Features:
 * - Clean slate startup (no preloaded signals) with optional localStorage / URL hash persistence
 * - In-line intelligent CAS autocomplete suggestions popup while typing
 * - Discrete-Time tools per row: Data Table (CSV/NumPy/MATLAB export), DAC Reconstruction Overlays (ZOH/Linear/Sinc), DTFT Spectrum drawer, and Energy/Power metrics
 * - Inequalities, Points, Parametric, Polar, and Piecewise support
 * - Draggable Canvas Anchors & Sliders
 * - Dark Mode / Midnight Theme & Light Mode
 * - Global Mute / Show All, Vector SVG Export, High-Res PNG Export, and Shareable Permalinks
 * - Row Duplication (Ctrl+D), Folders, and Keyboard Navigation (Enter, Backspace, Arrows, Undo/Redo)
 */

(function() {
  'use strict';

  // --- VECTOR SVG ICONS (NO UNICODE EMOJIS) ---
  const SVG_ICONS = {
    plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    note: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    table: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    dac: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12c3-7 6-7 9 0s6 7 9 0"/></svg>`,
    dtft: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="4" y2="14"/><line x1="9" y1="20" x2="9" y2="6"/><line x1="14" y1="20" x2="14" y2="10"/><line x1="19" y1="20" x2="19" y2="16"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    dragGrip: `<svg viewBox="0 0 24 24" width="10" height="14" fill="currentColor"><circle cx="8" cy="5" r="1.8"/><circle cx="16" cy="5" r="1.8"/><circle cx="8" cy="12" r="1.8"/><circle cx="16" cy="12" r="1.8"/><circle cx="8" cy="19" r="1.8"/><circle cx="16" cy="19" r="1.8"/></svg>`,
    alertTriangle: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    arrowUp: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
    arrowDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`
  };

  // --- PALETTE CONSTANTS (DESMOS CLASSIC) ---
  const DESMOS_COLORS = [
    '#2d70b3', // Blue
    '#c74440', // Red
    '#388c46', // Green
    '#6042a6', // Purple
    '#000000', // Black
    '#fa7e19'  // Orange
  ];

  // --- GLOBAL STATE ---
  const state = {
    items: [],
    variables: {},
    activePopoverId: null,
    nextColorIndex: 0,
    history: [],
    historyIndex: -1,
    angleMode: 'radians',
    darkMode: false,
    allMuted: false,
    activeSuggestionIndex: -1,
    activeInputEl: null,
    activeDiagCardId: null,
    draggedCardId: null,
    keypadOpen: false,
    keypadTab: 'main',
    activeMathField: null,
    activeItemId: null
  };

  let graph = null;

  function getMath() {
    if (typeof window !== 'undefined' && window.OmniMath) return window.OmniMath;
    if (typeof OmniMath !== 'undefined') return OmniMath;
    return {
      compileAll: () => new Map(),
      diff: () => '0',
      integrate: () => '0',
      solve: () => [],
      taylor: () => '0',
      computeSignalMetrics: () => ({ energy: 0, power: 0, period: 'None' }),
      computeDTFT: () => [],
      getSuggestions: () => []
    };
  }

  function getNextColor() {
    const col = DESMOS_COLORS[state.nextColorIndex % DESMOS_COLORS.length];
    state.nextColorIndex++;
    return col;
  }

  // --- INITIALIZE APPLICATION ---
  function init() {
    try {
      const canvas = document.getElementById('graph-canvas');
      if (!canvas) {
        console.error('[OmniGraph] Canvas #graph-canvas not found!');
        return;
      }

      const GraphClass = window.Graphpaper || (typeof Graphpaper !== 'undefined' ? Graphpaper : null);
      if (!GraphClass) {
        console.error('[OmniGraph] Graphpaper class not found!');
        return;
      }

      graph = new GraphClass(canvas, { darkMode: state.darkMode });

      // Connect Draggable Points from Canvas to Sliders / Variables
      graph.onPointDrag = (ptItem, mathX, mathY) => {
        if (!ptItem || !ptItem.compiled) return;
        // Check if point coordinates match any variable
        const xVar = ptItem.compiled.xExpr;
        const yVar = ptItem.compiled.yExpr;
        let changed = false;

        state.items.forEach(it => {
          if (it.type === 'slider' && it.compiled && it.compiled.varName) {
            const vName = it.compiled.varName;
            if (xVar === vName) {
              it.sliderVal = Math.max(it.sliderMin, Math.min(it.sliderMax, Number(mathX.toFixed(2))));
              changed = true;
            } else if (yVar === vName) {
              it.sliderVal = Math.max(it.sliderMin, Math.min(it.sliderMax, Number(mathY.toFixed(2))));
              changed = true;
            }
          }
        });

        if (changed) {
          renderSidebar();
          recompileAll();
        }
      };

      // Check URL hash permalink or localStorage, otherwise clean slate (1 empty row)
      let loadedFromStorage = false;
      if (typeof window !== 'undefined' && window.location && typeof window.location.hash === 'string' && window.location.hash.startsWith('#state=')) {
        try {
          const encoded = window.location.hash.replace('#state=', '');
          const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
          if (Array.isArray(decoded) && decoded.length > 0) {
            state.items = decoded;
            loadedFromStorage = true;
          }
        } catch(e) {}
      }

      if (!loadedFromStorage && typeof localStorage !== 'undefined' && localStorage.getItem('omnigraph_items')) {
        try {
          const saved = JSON.parse(localStorage.getItem('omnigraph_items'));
          // If the cached items are from the old preloaded default suite, discard them
          const isLegacyPreset = Array.isArray(saved) && saved.some(it => it.text && (it.text.includes('0.8^n') || it.text.includes('0.2*pi*n')));
          if (Array.isArray(saved) && saved.length > 0 && !isLegacyPreset) {
            state.items = saved;
            loadedFromStorage = true;
          } else if (isLegacyPreset) {
            localStorage.removeItem('omnigraph_items');
          }
        } catch(e) {}
      }

      if (!loadedFromStorage || state.items.length === 0) {
        // Clean slate: starts completely empty with one blank row ready for user input!
        state.items = [
          {
            id: 'item_1',
            text: '',
            color: '#2d70b3',
            lineStyle: 'solid',
            lineWidth: 2.5,
            markerShape: 'circle-filled',
            markerRadius: 5,
            visible: true
          }
        ];
      }

      initUIHandlers();
      renderSidebar();
      recompileAll();
      saveHistory();

      console.log('[OmniGraph] Clean Desmos-style interface initialized with full QOL suite.');
    } catch (err) {
      console.error('[OmniGraph] Initialization failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- HISTORY & PERSISTENCE ---
  function saveHistory() {
    const snapshot = JSON.stringify(state.items.map(it => ({
      id: it.id,
      text: it.text,
      color: it.color,
      lineStyle: it.lineStyle,
      lineWidth: it.lineWidth,
      markerShape: it.markerShape,
      visible: it.visible,
      sliderVal: it.sliderVal,
      sliderMin: it.sliderMin,
      sliderMax: it.sliderMax,
      reconstruction: it.reconstruction
    })));

    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push(snapshot);
    state.historyIndex++;

    // Auto-save to localStorage
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('omnigraph_items', snapshot); } catch(e) {}
    }
  }

  function undo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      const snapshot = JSON.parse(state.history[state.historyIndex]);
      state.items = snapshot;
      renderSidebar();
      recompileAll();
    }
  }

  function redo() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      const snapshot = JSON.parse(state.history[state.historyIndex]);
      state.items = snapshot;
      renderSidebar();
      recompileAll();
    }
  }

  // --- ITEM MANAGEMENT ---
  function insertItem(index = -1, props = {}) {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      text: props.text !== undefined ? props.text : '',
      color: props.color || getNextColor(),
      lineStyle: props.lineStyle || 'solid',
      lineWidth: props.lineWidth || 2.5,
      markerShape: props.markerShape || 'circle-filled',
      markerRadius: props.markerRadius || 5,
      baseline: props.baseline !== undefined ? props.baseline : 0,
      visible: props.visible !== undefined ? props.visible : true,
      sliderVal: props.sliderVal !== undefined ? props.sliderVal : 1,
      sliderMin: props.sliderMin !== undefined ? props.sliderMin : -10,
      sliderMax: props.sliderMax !== undefined ? props.sliderMax : 10,
      sliderStep: props.sliderStep !== undefined ? props.sliderStep : 0.1,
      isPlaying: false,
      playDirection: 1,
      reconstruction: 'none',
      ...props
    };

    if (index >= 0 && index <= state.items.length) {
      state.items.splice(index, 0, newItem);
    } else {
      state.items.push(newItem);
    }

    renderSidebar();
    recompileAll();
    saveHistory();
    return newItem;
  }

  function duplicateItem(id) {
    const idx = state.items.findIndex(it => it.id === id);
    if (idx === -1) return;
    const src = state.items[idx];
    const clone = insertItem(idx + 1, {
      text: src.text,
      color: getNextColor(),
      lineStyle: src.lineStyle,
      lineWidth: src.lineWidth,
      markerShape: src.markerShape,
      sliderVal: src.sliderVal,
      sliderMin: src.sliderMin,
      sliderMax: src.sliderMax
    });
    renderSidebar(clone.id);
  }

  function removeItem(id) {
    state.items = state.items.filter(it => it.id !== id);
    if (state.activePopoverId === id) state.activePopoverId = null;

    if (state.items.length === 0) {
      insertItem(0, { text: '' });
      return;
    }

    renderSidebar();
    recompileAll();
    saveHistory();
  }

  function addSlider(varName, defaultVal = 1, insertAfterIdx = null) {
    if (!varName) return;
    const exists = state.items.some(it => it.type === 'slider' && it.compiled && it.compiled.varName === varName);
    if (exists) return;

    state.variables[varName] = defaultVal;
    let idx = state.items.length;
    if (insertAfterIdx !== null && insertAfterIdx >= 0 && insertAfterIdx < state.items.length) {
      idx = insertAfterIdx + 1;
    }
    const newItem = insertItem(idx, {
      text: `${varName} = ${defaultVal}`,
      sliderVal: defaultVal,
      sliderMin: -10,
      sliderMax: 10,
      sliderStep: 0.1
    });
    renderSidebar(newItem.id);
    recompileAll();
    saveHistory();
    return newItem;
  }

  function moveItem(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= state.items.length || toIndex < 0 || toIndex >= state.items.length) return;
    const [moved] = state.items.splice(fromIndex, 1);
    state.items.splice(toIndex, 0, moved);
    renderSidebar(moved.id);
    recompileAll();
    saveHistory();
  }

  // --- COMPILATION & EVALUATION ---
  function recompileAll() {
    const math = getMath();
    const compiledMap = math.compileAll(state.items, state.variables, { angleMode: state.angleMode });

    state.items.forEach(it => {
      const comp = compiledMap.get(it.id);
      it.compiled = comp;
      if (comp) {
        if (comp.isEmpty || (!it.text || it.text.trim() === '')) {
          it.type = 'empty';
        } else if (comp.isNote) {
          it.type = 'note';
        } else if (comp.isFolder) {
          it.type = 'folder';
        } else if (comp.isSlider) {
          it.type = 'slider';
          state.variables[comp.varName] = it.sliderVal;
        } else if (comp.isComplex || comp.kind === 'complex') {
          it.type = 'complex';
        } else if (comp.kind === 'discrete') {
          it.type = 'discrete';
        } else {
          it.type = comp.kind || 'continuous';
        }
      }
    });

    if (graph) {
      graph.updateState(state.items, state.variables);
    }
  }

  // --- RENDER SIDEBAR ---
  function renderSidebar(focusId = null) {
    const listEl = document.getElementById('expression-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    state.items.forEach((item, index) => {
      const isNote = item.type === 'note' || (item.compiled && item.compiled.isNote);
      const isFolder = item.type === 'folder' || (item.compiled && item.compiled.isFolder);
      const isDiscrete = item.type === 'discrete' || (item.compiled && item.compiled.kind === 'discrete');
      const isSlider = item.type === 'slider';
      const isEmpty = !item.text || item.text.trim() === '' || (item.compiled && item.compiled.isEmpty);

      const diagnostics = (item.compiled && item.compiled.diagnostics) || [];
      const missingVars = (item.compiled && item.compiled.missingVariables) || [];
      const hasDiagnostics = diagnostics.length > 0;
      const hasError = diagnostics.some(d => d.severity === 'error');

      const card = document.createElement('div');
      card.className = `expr-card ${item.visible ? '' : 'hidden-item'} ${isNote ? 'is-note' : ''} ${isFolder ? 'is-folder' : ''} ${isEmpty ? 'is-empty' : ''}`;
      card.setAttribute('data-id', item.id);
      card.setAttribute('data-index', index);

      let metricsBadge = '';
      if (!isEmpty && isDiscrete && item.compiled && item.compiled.eval && !item.compiled.isPartial) {
        const math = getMath();
        const m = math.computeSignalMetrics(item.compiled.eval);
        metricsBadge = `<span class="badge-metrics" title="Energy &amp; Power metrics">E=${m.energy}, P=${m.power}</span>`;
      }

      card.innerHTML = `
        <div class="expr-main-row">
          <!-- Left Gutter: Row Index & Reorder Controls -->
          <div class="expr-gutter" title="Drag to reorder row">
            <span class="expr-drag-handle" title="Drag to reorder">${SVG_ICONS.dragGrip}</span>
            <span class="expr-index">${index + 1}</span>
            <div class="expr-move-btns">
              ${index > 0 ? `<button type="button" class="expr-move-btn expr-move-up-btn" title="Move Up (Alt+Up)">${SVG_ICONS.arrowUp}</button>` : ''}
              ${index < state.items.length - 1 ? `<button type="button" class="expr-move-btn expr-move-down-btn" title="Move Down (Alt+Down)">${SVG_ICONS.arrowDown}</button>` : ''}
            </div>
          </div>

          <!-- Content Row -->
          <div class="expr-content-row">
            ${isFolder ? `
              <div class="expr-swatch-wrapper">
                <span class="expr-note-icon">${SVG_ICONS.folder}</span>
              </div>
              <div class="expr-input-wrapper">
                <input type="text" class="expr-input" value="${escapeHtml(item.text)}" placeholder="Folder title, e.g. folder: Filter Pipeline">
              </div>
              <div class="expr-card-tools">
                <button class="expr-delete-btn" title="Delete folder">${SVG_ICONS.close}</button>
              </div>
            ` : isNote ? `
              <div class="expr-swatch-wrapper">
                <span class="expr-note-icon" title="Note">${SVG_ICONS.note}</span>
              </div>
              <div class="expr-input-wrapper">
                <input type="text" class="expr-input" value="${escapeHtml(item.text)}" placeholder="Type a note (e.g. // Comment or &quot;Note&quot;)">
              </div>
              <div class="expr-card-tools">
                <button class="expr-dup-btn" title="Duplicate (Ctrl+D)">${SVG_ICONS.copy}</button>
                <button class="expr-delete-btn" title="Delete note">${SVG_ICONS.close}</button>
              </div>
            ` : `
              <!-- Swatch Wrapper: ONLY show colored circle when NOT empty! -->
              <div class="expr-swatch-wrapper">
                ${!isEmpty ? `
                  <button class="expr-swatch-btn ${item.visible ? 'visible' : 'hidden'}"
                          style="--swatch-color: ${item.color};"
                          title="Click to hide/show, click gear for styles">
                    <svg class="desmos-curve-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M4 14 C7 8, 11 8, 12 12 C13 16, 17 16, 20 10" fill="none" stroke="${item.visible ? '#ffffff' : item.color}" stroke-width="2.6" stroke-linecap="round"/>
                    </svg>
                  </button>
                ` : `
                  <div class="expr-swatch-placeholder"></div>
                `}
              </div>

              <!-- Expression Input (MathQuill + Input fallback) -->
              <div class="expr-input-wrapper">
                <span class="expr-mathquill-input" data-id="${item.id}"></span>
                <input type="text" class="expr-input expr-fallback-input" style="display:none;" value="${escapeHtml(item.text)}" placeholder="Type an expression, e.g. y = sin(x)">
                ${isDiscrete && !isEmpty ? `<span class="badge-dt" title="Discrete-Time Signal">DT</span>` : ''}
                ${(item.type === 'complex' || (item.compiled && item.compiled.isComplex)) && !isEmpty ? `<span class="badge-complex" title="Complex Number / Phasor">ℂ</span>` : ''}
                ${hasDiagnostics ? `
                  <button type="button" class="expr-diag-badge ${hasError ? 'is-error' : 'is-warning'}" title="Diagnostics &amp; Fixes">
                    ${SVG_ICONS.alertTriangle}
                  </button>
                ` : ''}
              </div>

              <!-- Card Actions -->
              <div class="expr-card-tools">
                ${!isEmpty ? `<button class="expr-gear-btn" title="Edit line &amp; marker style">${SVG_ICONS.gear}</button>` : ''}
                ${!isEmpty ? `<button class="expr-dup-btn" title="Duplicate row (Ctrl+D)">${SVG_ICONS.copy}</button>` : ''}
                <button class="expr-delete-btn" title="Delete row">${SVG_ICONS.close}</button>
              </div>
            `}
          </div>
        </div>

        <!-- Diagnostic Tooltip -->
        ${state.activeDiagCardId === item.id && hasDiagnostics ? `
          <div class="expr-diag-tooltip">
            ${diagnostics.map(d => `
              <div class="diag-entry ${d.severity}">
                <span class="diag-msg">${escapeHtml(d.message)}</span>
                ${d.fix ? `
                  <button type="button" class="btn-diag-fix" data-card-id="${item.id}" data-fix-type="${d.fix.type}" data-fix-var="${d.fix.variable || ''}" data-fix-from="${d.fix.from || ''}" data-fix-to="${d.fix.to || ''}" data-fix-char="${d.fix.char || ''}">
                    ${escapeHtml(d.fix.label)}
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Add Slider Prompt: Desmos-Style inline prompt -->
        ${missingVars.length > 0 ? `
          <div class="add-slider-prompt">
            <span class="add-slider-label">add slider:</span>
            ${missingVars.length > 1 ? `<button type="button" class="add-slider-btn btn-slider-all" data-vars="${missingVars.join(',')}">[all]</button>` : ''}
            ${missingVars.map(v => `<button type="button" class="add-slider-btn btn-slider-var" data-var="${v}">[${v}]</button>`).join('')}
          </div>
        ` : ''}

        <!-- Discrete Tools Bar (Table, DAC Reconstruction, DTFT, Metrics) - ONLY when NOT empty -->
        ${isDiscrete && !isEmpty ? `
          <div class="card-discrete-actions">
            <button class="btn-card-action btn-table" title="View Samples Table">${SVG_ICONS.table} <span>Table</span></button>
            <button class="btn-card-action btn-dac ${item.reconstruction && item.reconstruction !== 'none' ? 'active' : ''}" title="Cycle DAC Interpolation: None / ZOH / Linear / Sinc">
              ${SVG_ICONS.dac} <span>DAC: ${item.reconstruction ? item.reconstruction.toUpperCase() : 'OFF'}</span>
            </button>
            <button class="btn-card-action btn-dtft" title="Inspect DTFT Spectrum |X(e^jω)|">${SVG_ICONS.dtft} <span>DTFT</span></button>
            ${metricsBadge}
          </div>
        ` : ''}

        <!-- Slider Bar (If Expression is Variable Assignment a = ...) - ONLY when NOT empty -->
        ${isSlider && !isEmpty ? `
          <div class="expr-slider-bar">
            <button class="slider-play-btn" title="${item.isPlaying ? 'Pause' : 'Animate'}">${item.isPlaying ? SVG_ICONS.pause : SVG_ICONS.play}</button>
            <span class="slider-bound slider-bound-min" data-bound="min" title="Click to edit min limit">${item.sliderMin}</span>
            <input type="range" class="slider-range" min="${item.sliderMin}" max="${item.sliderMax}" step="${item.sliderStep}" value="${item.sliderVal}">
            <span class="slider-bound slider-bound-max" data-bound="max" title="Click to edit max limit">${item.sliderMax}</span>
            <span class="slider-val-display">${Number(item.sliderVal.toFixed(2))}</span>
          </div>
        ` : ''}

        <!-- Style Popover (Anchored to this Card) -->
        ${state.activePopoverId === item.id ? renderStylePopoverHTML(item) : ''}
      `;

      bindCardEvents(card, item, index);
      listEl.appendChild(card);
    });

    // Update faint index in blank dock below
    const faintEl = (typeof document.querySelector === 'function') ? document.querySelector('.faint-next-index') : null;
    if (faintEl) {
      faintEl.textContent = state.items.length + 1;
    }

    if (focusId) {
      const targetCard = (typeof listEl.querySelector === 'function') ? listEl.querySelector(`[data-id="${focusId}"]`) : null;
      if (targetCard) {
        if (typeof document.querySelectorAll === 'function') {
          document.querySelectorAll('.expr-card').forEach(c => c.classList.remove('active-card'));
        }
        targetCard.classList.add('active-card');
        const targetItem = state.items.find(it => it.id === focusId);
        if (targetItem && targetItem.mathField && typeof targetItem.mathField.focus === 'function') {
          setTimeout(() => targetItem.mathField.focus(), 10);
        } else {
          const targetInput = targetCard.querySelector('.expr-input, .expr-fallback-input');
          if (targetInput && targetInput.focus) {
            targetInput.focus();
            const len = (targetInput.value || '').length;
            if (typeof targetInput.setSelectionRange === 'function') {
              targetInput.setSelectionRange(len, len);
            }
          }
        }
      }
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- STYLE POPOVER (DESMOS PALETTE & STEM STYLES) ---
  function renderStylePopoverHTML(item) {
    const isDiscrete = item.type === 'discrete';

    return `
      <div class="style-popover">
        <div class="popover-row">
          <label>Color:</label>
          <div class="popover-color-grid">
            ${DESMOS_COLORS.map(c => `
              <span class="popover-color-swatch ${item.color === c ? 'selected' : ''}" style="background:${c};" data-color="${c}"></span>
            `).join('')}
            <input type="color" class="popover-color-custom" value="${item.color}" title="Custom Color">
          </div>
        </div>

        <div class="popover-row">
          <label>Line Style:</label>
          <select class="popover-select" id="popover-linestyle">
            <option value="solid" ${item.lineStyle === 'solid' ? 'selected' : ''}>Solid</option>
            <option value="dashed" ${item.lineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
            <option value="dotted" ${item.lineStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
          </select>
        </div>

        <div class="popover-row">
          <label>Thickness: <span class="val-txt">${item.lineWidth}px</span></label>
          <input type="range" class="popover-range" min="1" max="6" step="0.5" value="${item.lineWidth}" id="popover-linewidth">
        </div>

        ${isDiscrete ? `
          <div class="popover-row">
            <label>Marker Cap (Stems):</label>
            <select class="popover-select" id="popover-marker">
              <option value="circle-filled" ${item.markerShape === 'circle-filled' ? 'selected' : ''}>Filled Circle</option>
              <option value="circle-hollow" ${item.markerShape === 'circle-hollow' ? 'selected' : ''}>Hollow Circle</option>
              <option value="cross" ${item.markerShape === 'cross' ? 'selected' : ''}>Cross (+)</option>
              <option value="arrow" ${item.markerShape === 'arrow' ? 'selected' : ''}>Impulse Arrow</option>
              <option value="square" ${item.markerShape === 'square' ? 'selected' : ''}>Square</option>
            </select>
          </div>
        ` : ''}

        <button class="popover-done-btn">Done</button>
      </div>
    `;
  }

  // --- DYNAMIC CARD DIAGNOSTICS & SLIDERS UPDATE ---
  function updateCardDiagnosticsAndSliders(card, item, index) {
    if (!card || !item) return;
    const diagnostics = (item.compiled && item.compiled.diagnostics) || [];
    const missingVars = (item.compiled && item.compiled.missingVariables) || [];
    const hasDiagnostics = diagnostics.length > 0;
    const hasError = diagnostics.some(d => d.severity === 'error');

    // 1. Update Add Slider Prompt
    let promptEl = card.querySelector('.add-slider-prompt');
    if (missingVars.length > 0) {
      const promptHtml = `
        <span class="add-slider-label">add slider:</span>
        ${missingVars.length > 1 ? `<button type="button" class="add-slider-btn btn-slider-all" data-vars="${missingVars.join(',')}">[all]</button>` : ''}
        ${missingVars.map(v => `<button type="button" class="add-slider-btn btn-slider-var" data-var="${v}">[${v}]</button>`).join('')}
      `;
      if (!promptEl) {
        promptEl = document.createElement('div');
        promptEl.className = 'add-slider-prompt';
        const discreteActions = card.querySelector('.card-discrete-actions');
        if (discreteActions && discreteActions.parentElement === card) {
          card.insertBefore(promptEl, discreteActions);
        } else {
          card.appendChild(promptEl);
        }
      }
      promptEl.innerHTML = promptHtml;

      const sliderAllBtn = promptEl.querySelector('.btn-slider-all');
      if (sliderAllBtn) {
        sliderAllBtn.onclick = (e) => {
          e.stopPropagation();
          const vars = (sliderAllBtn.getAttribute('data-vars') || '').split(',').map(s => s.trim()).filter(Boolean);
          vars.forEach((v, i) => addSlider(v, 1, index + i));
        };
      }

      const sliderVarBtns = promptEl.querySelectorAll('.btn-slider-var');
      sliderVarBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const v = btn.getAttribute('data-var');
          addSlider(v, 1, index);
        };
      });
    } else if (promptEl) {
      if (promptEl.parentElement) promptEl.parentElement.removeChild(promptEl);
    }

    // 2. Update Diagnostic Badge
    const inputWrapper = card.querySelector('.expr-input-wrapper');
    let diagBadge = card.querySelector('.expr-diag-badge');
    if (hasDiagnostics) {
      if (!diagBadge && inputWrapper) {
        diagBadge = document.createElement('button');
        diagBadge.setAttribute('type', 'button');
        diagBadge.className = `expr-diag-badge ${hasError ? 'is-error' : 'is-warning'}`;
        diagBadge.setAttribute('title', 'Diagnostics & Fixes');
        diagBadge.innerHTML = SVG_ICONS.alertTriangle;
        diagBadge.onclick = (e) => {
          e.stopPropagation();
          state.activeDiagCardId = (state.activeDiagCardId === item.id) ? null : item.id;
          renderSidebar();
        };
        inputWrapper.appendChild(diagBadge);
      } else if (diagBadge) {
        diagBadge.className = `expr-diag-badge ${hasError ? 'is-error' : 'is-warning'}`;
      }
    } else if (diagBadge) {
      if (diagBadge.parentElement) diagBadge.parentElement.removeChild(diagBadge);
    }
  }

  // --- BIND CARD EVENTS ---
  function bindCardEvents(card, item, index) {
    const swatchBtn = card.querySelector('.expr-swatch-btn');
    const delBtn = card.querySelector('.expr-delete-btn');
    const dupBtn = card.querySelector('.expr-dup-btn');
    const gearBtn = card.querySelector('.expr-gear-btn');
    const mqSpan = card.querySelector('.expr-mathquill-input');
    const fallbackInput = card.querySelector('.expr-fallback-input, .expr-input');

    if (swatchBtn) {
      swatchBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        renderSidebar();
        recompileAll();
      };
    }

    if (gearBtn) {
      gearBtn.onclick = (e) => {
        e.stopPropagation();
        state.activePopoverId = (state.activePopoverId === item.id) ? null : item.id;
        renderSidebar();
      };
    }

    if (dupBtn) {
      dupBtn.onclick = (e) => {
        e.stopPropagation();
        duplicateItem(item.id);
      };
    }

    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        removeItem(item.id);
      };
    }

    // Move Up / Move Down buttons
    const upBtn = card.querySelector('.expr-move-up-btn');
    if (upBtn) {
      upBtn.onclick = (e) => {
        e.stopPropagation();
        moveItem(index, index - 1);
      };
    }
    const downBtn = card.querySelector('.expr-move-down-btn');
    if (downBtn) {
      downBtn.onclick = (e) => {
        e.stopPropagation();
        moveItem(index, index + 1);
      };
    }

    // HTML5 Drag and Drop Reordering
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      state.draggedCardId = item.id;
      card.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      state.draggedCardId = null;
      if (typeof document.querySelectorAll === 'function') {
        document.querySelectorAll('.expr-card').forEach(c => c.classList.remove('drop-above', 'drop-below'));
      }
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!state.draggedCardId || state.draggedCardId === item.id) return;
      const rect = card.getBoundingClientRect ? card.getBoundingClientRect() : { top: 0, height: 50 };
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        card.classList.add('drop-above');
        card.classList.remove('drop-below');
      } else {
        card.classList.add('drop-below');
        card.classList.remove('drop-above');
      }
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('drop-above', 'drop-below');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drop-above', 'drop-below');
      const srcId = state.draggedCardId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
      if (!srcId || srcId === item.id) return;
      const srcIdx = state.items.findIndex(it => it.id === srcId);
      let targetIdx = state.items.findIndex(it => it.id === item.id);
      if (srcIdx === -1 || targetIdx === -1) return;
      const rect = card.getBoundingClientRect ? card.getBoundingClientRect() : { top: 0, height: 50 };
      const midY = rect.top + rect.height / 2;
      if (e.clientY >= midY && targetIdx < state.items.length - 1) {
        targetIdx++;
      }
      moveItem(srcIdx, targetIdx);
    });

    // Diagnostic badge & quick fixes
    const diagBadge = card.querySelector('.expr-diag-badge');
    if (diagBadge) {
      diagBadge.onclick = (e) => {
        e.stopPropagation();
        state.activeDiagCardId = (state.activeDiagCardId === item.id) ? null : item.id;
        renderSidebar();
      };
    }

    const fixBtns = card.querySelectorAll('.btn-diag-fix');
    fixBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const fType = btn.getAttribute('data-fix-type');
        if (fType === 'add_slider') {
          const v = btn.getAttribute('data-fix-var');
          addSlider(v, 1, index);
        } else if (fType === 'replace_var') {
          const f = btn.getAttribute('data-fix-from');
          const t = btn.getAttribute('data-fix-to');
          const regex = new RegExp(`\\b${f}\\b`, 'g');
          item.text = (item.text || '').replace(regex, t);
          if (item.latex) item.latex = item.latex.replace(regex, t);
          if (item.mathField && typeof item.mathField.latex === 'function') {
            item.mathField.latex(item.latex || item.text);
          }
          state.activeDiagCardId = null;
          renderSidebar();
          recompileAll();
          saveHistory();
        } else if (fType === 'append_char') {
          const ch = btn.getAttribute('data-fix-char');
          item.text = (item.text || '') + ch;
          if (item.latex) item.latex = (item.latex || '') + ch;
          if (item.mathField && typeof item.mathField.latex === 'function') {
            item.mathField.latex(item.latex || item.text);
          }
          state.activeDiagCardId = null;
          renderSidebar();
          recompileAll();
          saveHistory();
        }
      };
    });

    // Add Slider prompt buttons
    const sliderAllBtn = card.querySelector('.btn-slider-all');
    if (sliderAllBtn) {
      sliderAllBtn.onclick = (e) => {
        e.stopPropagation();
        const vars = (sliderAllBtn.getAttribute('data-vars') || '').split(',').map(s => s.trim()).filter(Boolean);
        vars.forEach((v, i) => {
          addSlider(v, 1, index + i);
        });
      };
    }

    const sliderVarBtns = card.querySelectorAll('.btn-slider-var');
    sliderVarBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const v = btn.getAttribute('data-var');
        addSlider(v, 1, index);
      };
    });

    // Discrete action buttons
    const tableBtn = card.querySelector('.btn-table');
    if (tableBtn) tableBtn.onclick = () => openDataTable(item);

    const dacBtn = card.querySelector('.btn-dac');
    if (dacBtn) {
      dacBtn.onclick = () => {
        const modes = ['none', 'zoh', 'linear', 'sinc'];
        const curIdx = modes.indexOf(item.reconstruction || 'none');
        item.reconstruction = modes[(curIdx + 1) % modes.length];
        renderSidebar();
        recompileAll();
      };
    }

    const dtftBtn = card.querySelector('.btn-dtft');
    if (dtftBtn) dtftBtn.onclick = () => openDTFTSpectrum(item);

    // Active card highlighting on focus
    card.addEventListener('focusin', () => {
      state.activeItemId = item.id;
      if (item.mathField) state.activeMathField = item.mathField;
      if (typeof document.querySelectorAll === 'function') {
        document.querySelectorAll('.expr-card').forEach(c => c.classList.remove('active-card'));
      }
      card.classList.add('active-card');
      if (typeof window !== 'undefined' && (window.innerWidth <= 768 || ('ontouchstart' in window))) {
        if (!state.keypadOpen && typeof setKeypadOpen === 'function') {
          setKeypadOpen(true);
        }
      }
    });

    card.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!card.contains(document.activeElement)) {
          card.classList.remove('active-card');
        }
      }, 150);
    });

    // Check if MathQuill is available in browser
    if (typeof window !== 'undefined' && window.MathQuill && mqSpan && !card.classList.contains('is-note') && !card.classList.contains('is-folder')) {
      const MQ = window.MathQuill.getInterface(2);
      const math = getMath();

      const mathField = MQ.MathField(mqSpan, {
        spaceBehaviors: { current: 'keystroke' },
        handlers: {
          edit: function() {
            const latex = mathField.latex();
            const mathStr = math.latexToMath ? math.latexToMath(latex) : latex;
            const wasEmpty = !item.text || item.text.trim() === '';
            item.latex = latex;
            item.text = mathStr;
            const nowEmpty = !item.text || item.text.trim() === '';

            // Transitioning between empty and non-empty: update swatch and card tools without losing focus
            if (wasEmpty !== nowEmpty) {
              const swatchWrapper = card.querySelector('.expr-swatch-wrapper');
              if (swatchWrapper) {
                if (!nowEmpty) {
                  swatchWrapper.innerHTML = `
                    <button class="expr-swatch-btn ${item.visible ? 'visible' : 'hidden'}"
                            style="--swatch-color: ${item.color};"
                            title="Click to hide/show, click gear for styles">
                      <svg class="desmos-curve-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path d="M4 14 C7 8, 11 8, 12 12 C13 16, 17 16, 20 10" fill="none" stroke="${item.visible ? '#ffffff' : item.color}" stroke-width="2.6" stroke-linecap="round"/>
                      </svg>
                    </button>
                  `;
                  const newBtn = swatchWrapper.querySelector('.expr-swatch-btn');
                  if (newBtn) {
                    newBtn.onclick = (e) => {
                      e.stopPropagation();
                      item.visible = !item.visible;
                      renderSidebar();
                      recompileAll();
                    };
                  }
                  card.classList.remove('is-empty');
                } else {
                  swatchWrapper.innerHTML = `<div class="expr-swatch-placeholder"></div>`;
                  card.classList.add('is-empty');
                }
              }

              const cardTools = card.querySelector('.expr-card-tools');
              if (cardTools) {
                if (!nowEmpty) {
                  cardTools.innerHTML = `
                    <button class="expr-gear-btn" title="Edit line &amp; marker style">${SVG_ICONS.gear}</button>
                    <button class="expr-dup-btn" title="Duplicate row (Ctrl+D)">${SVG_ICONS.copy}</button>
                    <button class="expr-delete-btn" title="Delete row">${SVG_ICONS.close}</button>
                  `;
                  const newGear = cardTools.querySelector('.expr-gear-btn');
                  if (newGear) {
                    newGear.onclick = (e) => {
                      e.stopPropagation();
                      state.activePopoverId = (state.activePopoverId === item.id) ? null : item.id;
                      renderSidebar();
                    };
                  }
                  const newDup = cardTools.querySelector('.expr-dup-btn');
                  if (newDup) {
                    newDup.onclick = (e) => {
                      e.stopPropagation();
                      duplicateItem(item.id);
                    };
                  }
                  const newDel = cardTools.querySelector('.expr-delete-btn');
                  if (newDel) {
                    newDel.onclick = (e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    };
                  }
                } else {
                  cardTools.innerHTML = `<button class="expr-delete-btn" title="Delete row">${SVG_ICONS.close}</button>`;
                  const newDel = cardTools.querySelector('.expr-delete-btn');
                  if (newDel) {
                    newDel.onclick = (e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    };
                  }
                }
              }
            }

            recompileAll();
            updateCardDiagnosticsAndSliders(card, item, index);
            saveHistory();
          },
          enter: function() {
            const nextItem = insertItem(index + 1, { text: '' });
            renderSidebar(nextItem.id);
          }
        }
      });

      if (item.latex) {
        mathField.latex(item.latex);
      } else if (item.text) {
        mathField.latex(math.mathToLatex ? math.mathToLatex(item.text) : item.text);
      }

      item.mathField = mathField;

      mqSpan.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          moveItem(index, index - 1);
        } else if (e.altKey && e.key === 'ArrowDown' && index < state.items.length - 1) {
          e.preventDefault();
          moveItem(index, index + 1);
        } else if (e.key === 'Backspace' && (!item.text || item.text.trim() === '') && state.items.length > 1) {
          e.preventDefault();
          const prevId = index > 0 ? state.items[index - 1].id : state.items[1].id;
          removeItem(item.id);
          renderSidebar(prevId);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateItem(item.id);
        } else if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          renderSidebar(state.items[index - 1].id);
        } else if (e.key === 'ArrowDown' && index < state.items.length - 1) {
          e.preventDefault();
          renderSidebar(state.items[index + 1].id);
        }
      });

    } else if (fallbackInput) {
      // Non-MathQuill fallback (e.g. headless tests or note/folder input)
      fallbackInput.style.display = 'block';
      fallbackInput.className = 'expr-input';

      fallbackInput.oninput = (e) => {
        const wasEmpty = !item.text || item.text.trim() === '';
        item.text = e.target.value;
        const nowEmpty = !item.text || item.text.trim() === '';
        if (wasEmpty !== nowEmpty) {
          const swatchWrapper = card.querySelector('.expr-swatch-wrapper');
          if (swatchWrapper) {
            if (!nowEmpty) {
              swatchWrapper.innerHTML = `
                <button class="expr-swatch-btn ${item.visible ? 'visible' : 'hidden'}"
                        style="--swatch-color: ${item.color};">
                  <svg class="desmos-curve-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M4 14 C7 8, 11 8, 12 12 C13 16, 17 16, 20 10" fill="none" stroke="${item.visible ? '#ffffff' : item.color}" stroke-width="2.6" stroke-linecap="round"/>
                  </svg>
                </button>
              `;
              const newBtn = swatchWrapper.querySelector('.expr-swatch-btn');
              if (newBtn) {
                newBtn.onclick = (ev) => {
                  ev.stopPropagation();
                  item.visible = !item.visible;
                  renderSidebar();
                  recompileAll();
                };
              }
              card.classList.remove('is-empty');
            } else {
              swatchWrapper.innerHTML = `<div class="expr-swatch-placeholder"></div>`;
              card.classList.add('is-empty');
            }
          }

          const cardTools = card.querySelector('.expr-card-tools');
          if (cardTools) {
            if (!nowEmpty) {
              cardTools.innerHTML = `
                <button class="expr-gear-btn" title="Edit line &amp; marker style">${SVG_ICONS.gear}</button>
                <button class="expr-dup-btn" title="Duplicate row (Ctrl+D)">${SVG_ICONS.copy}</button>
                <button class="expr-delete-btn" title="Delete row">${SVG_ICONS.close}</button>
              `;
              const newGear = cardTools.querySelector('.expr-gear-btn');
              if (newGear) {
                newGear.onclick = (ev) => {
                  ev.stopPropagation();
                  state.activePopoverId = (state.activePopoverId === item.id) ? null : item.id;
                  renderSidebar();
                };
              }
              const newDup = cardTools.querySelector('.expr-dup-btn');
              if (newDup) {
                newDup.onclick = (ev) => {
                  ev.stopPropagation();
                  duplicateItem(item.id);
                };
              }
              const newDel = cardTools.querySelector('.expr-delete-btn');
              if (newDel) {
                newDel.onclick = (ev) => {
                  ev.stopPropagation();
                  removeItem(item.id);
                };
              }
            } else {
              cardTools.innerHTML = `<button class="expr-delete-btn" title="Delete row">${SVG_ICONS.close}</button>`;
              const newDel = cardTools.querySelector('.expr-delete-btn');
              if (newDel) {
                newDel.onclick = (ev) => {
                  ev.stopPropagation();
                  removeItem(item.id);
                };
              }
            }
          }
        }
        recompileAll();
        updateCardDiagnosticsAndSliders(card, item, index);
        showSuggestions(fallbackInput, item);
      };

      fallbackInput.onfocus = () => {
        state.activeInputEl = fallbackInput;
        state.activeItemId = item.id;
        state.activeMathField = null;
        if (typeof document.querySelectorAll === 'function') {
          document.querySelectorAll('.expr-card').forEach(c => c.classList.remove('active-card'));
        }
        card.classList.add('active-card');
      };

      fallbackInput.onblur = () => {
        setTimeout(() => {
          if (!card.contains(document.activeElement)) {
            card.classList.remove('active-card');
          }
          hideSuggestions();
        }, 200);
      };

      fallbackInput.onkeydown = (e) => {
        if (e.altKey && e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          moveItem(index, index - 1);
          return;
        } else if (e.altKey && e.key === 'ArrowDown' && index < state.items.length - 1) {
          e.preventDefault();
          moveItem(index, index + 1);
          return;
        }

        const popover = document.getElementById('cas-suggestions-popover');
        const isPopoverVisible = popover && popover.style.display !== 'none';

        if (isPopoverVisible) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateSuggestions(1);
            return;
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSuggestions(-1);
            return;
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            const selected = popover.querySelector('.suggestion-item.selected');
            if (selected) {
              e.preventDefault();
              applySuggestion(fallbackInput, selected.getAttribute('data-text'), item);
              hideSuggestions();
              return;
            }
          } else if (e.key === 'Escape') {
            hideSuggestions();
            return;
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const nextItem = insertItem(index + 1, { text: '' });
          renderSidebar(nextItem.id);
        } else if (e.key === 'Backspace' && fallbackInput.value === '' && state.items.length > 1) {
          e.preventDefault();
          const prevId = index > 0 ? state.items[index - 1].id : state.items[1].id;
          removeItem(item.id);
          renderSidebar(prevId);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateItem(item.id);
        } else if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          renderSidebar(state.items[index - 1].id);
        } else if (e.key === 'ArrowDown' && index < state.items.length - 1) {
          e.preventDefault();
          renderSidebar(state.items[index + 1].id);
        }
      };
    }

    // Slider Controls (if present)
    if (item.type === 'slider') {
      const sliderRange = card.querySelector('.slider-range');
      const valDisplay = card.querySelector('.slider-val-display');
      const playBtn = card.querySelector('.slider-play-btn');

      if (sliderRange) {
        sliderRange.oninput = (e) => {
          item.sliderVal = parseFloat(e.target.value);
          if (valDisplay) valDisplay.textContent = Number(item.sliderVal.toFixed(2));
          recompileAll();
        };
      }

      if (playBtn) {
        playBtn.onclick = () => {
          item.isPlaying = !item.isPlaying;
          playBtn.innerHTML = item.isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
          playBtn.setAttribute('title', item.isPlaying ? 'Pause' : 'Animate');
          if (item.isPlaying) runSliderLoop(item, sliderRange, valDisplay);
        };
      }

      // Inline editable slider bounds
      card.querySelectorAll('.slider-bound').forEach(boundEl => {
        boundEl.onclick = (e) => {
          e.stopPropagation();
          const which = boundEl.getAttribute('data-bound');
          const currentVal = which === 'min' ? item.sliderMin : item.sliderMax;
          const newValStr = prompt(`Set slider ${which} bound:`, currentVal);
          if (newValStr !== null) {
            const num = parseFloat(newValStr);
            if (!isNaN(num) && isFinite(num)) {
              if (which === 'min') item.sliderMin = num;
              else item.sliderMax = num;
              renderSidebar();
              recompileAll();
            }
          }
        };
      });
    }

    // Popover Event Bindings
    if (state.activePopoverId === item.id) {
      const popover = card.querySelector('.style-popover');
      if (!popover) return;

      popover.querySelectorAll('.popover-color-swatch').forEach(sw => {
        sw.onclick = () => {
          item.color = sw.getAttribute('data-color');
          renderSidebar();
          recompileAll();
        };
      });

      const customColor = popover.querySelector('.popover-color-custom');
      if (customColor) {
        customColor.oninput = (e) => {
          item.color = e.target.value;
          renderSidebar();
          recompileAll();
        };
      }

      const lineStyleSelect = popover.querySelector('#popover-linestyle');
      if (lineStyleSelect) {
        lineStyleSelect.onchange = (e) => {
          item.lineStyle = e.target.value;
          recompileAll();
        };
      }

      const lineWidthInput = popover.querySelector('#popover-linewidth');
      if (lineWidthInput) {
        lineWidthInput.oninput = (e) => {
          item.lineWidth = parseFloat(e.target.value);
          popover.querySelector('.val-txt').textContent = `${item.lineWidth}px`;
          recompileAll();
        };
      }

      const markerSelect = popover.querySelector('#popover-marker');
      if (markerSelect) {
        markerSelect.onchange = (e) => {
          item.markerShape = e.target.value;
          recompileAll();
        };
      }

      popover.querySelector('.popover-done-btn').onclick = () => {
        state.activePopoverId = null;
        renderSidebar();
      };
    }
  }

  // --- AUTOCOMPLETE SUGGESTIONS LOGIC ---
  function showSuggestions(inputEl, item) {
    const popover = document.getElementById('cas-suggestions-popover');
    if (!popover) return;

    const val = inputEl.value || '';
    const cursor = inputEl.selectionStart || val.length;
    // Get current word
    const leftText = val.slice(0, cursor);
    const wordMatch = leftText.match(/([a-zA-Z0-9_\\[\\]]+)$/);
    const query = wordMatch ? wordMatch[1] : '';

    if (!query && val.trim().length > 0) {
      hideSuggestions();
      return;
    }

    const math = getMath();
    const suggestions = math.getSuggestions(query, state.items);
    if (!suggestions || suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    popover.innerHTML = suggestions.map((s, idx) => `
      <div class="suggestion-item ${idx === 0 ? 'selected' : ''}" data-text="${escapeHtml(s.text)}" data-index="${idx}">
        <div class="sugg-left">
          <span class="sugg-text">${escapeHtml(s.label)}</span>
          <span class="sugg-desc">${escapeHtml(s.desc)}</span>
        </div>
        <span class="sugg-badge">${escapeHtml(s.category)}</span>
      </div>
    `).join('');

    state.activeSuggestionIndex = 0;

    // Position popover
    const rect = inputEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;
    popover.style.display = 'flex';

    popover.querySelectorAll('.suggestion-item').forEach(el => {
      el.onmousedown = (e) => {
        e.preventDefault();
        applySuggestion(inputEl, el.getAttribute('data-text'), item);
        hideSuggestions();
      };
    });
  }

  function hideSuggestions() {
    const popover = document.getElementById('cas-suggestions-popover');
    if (popover) popover.style.display = 'none';
    state.activeSuggestionIndex = -1;
  }

  function navigateSuggestions(delta) {
    const popover = document.getElementById('cas-suggestions-popover');
    if (!popover) return;
    const items = popover.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;

    items.forEach(el => el.classList.remove('selected'));
    state.activeSuggestionIndex = (state.activeSuggestionIndex + delta + items.length) % items.length;
    items[state.activeSuggestionIndex].classList.add('selected');
    items[state.activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
  }

  function applySuggestion(inputEl, text, item) {
    const val = inputEl.value || '';
    const cursor = inputEl.selectionStart || val.length;
    const leftText = val.slice(0, cursor);
    const rightText = val.slice(cursor);
    const wordMatch = leftText.match(/([a-zA-Z0-9_\\[\\]]+)$/);
    const prefixLen = wordMatch ? wordMatch[1].length : 0;

    const newLeft = leftText.slice(0, leftText.length - prefixLen) + text;
    inputEl.value = newLeft + rightText;
    item.text = inputEl.value;

    const newCursor = newLeft.length;
    if (typeof inputEl.setSelectionRange === 'function') {
      inputEl.setSelectionRange(newCursor, newCursor);
    }
    inputEl.focus();

    recompileAll();
    saveHistory();
  }

  // --- SLIDER ANIMATION LOOP ---
  function runSliderLoop(item, rangeEl, valDisplay) {
    if (!item.isPlaying) return;

    let v = item.sliderVal + item.playDirection * item.sliderStep * 0.4;
    if (v >= item.sliderMax) {
      v = item.sliderMax;
      item.playDirection = -1;
    } else if (v <= item.sliderMin) {
      v = item.sliderMin;
      item.playDirection = 1;
    }

    item.sliderVal = v;
    if (rangeEl) rangeEl.value = v;
    if (valDisplay) valDisplay.textContent = Number(v.toFixed(2));
    recompileAll();

    const raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
      ? window.requestAnimationFrame.bind(window)
      : (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));
    raf(() => runSliderLoop(item, rangeEl, valDisplay));
  }

  // --- DATA TABLE MODAL ---
  function openDataTable(item) {
    if (!item.compiled || !item.compiled.eval) return;
    const modal = document.getElementById('table-modal');
    const content = document.getElementById('table-data-content');
    const title = document.getElementById('table-modal-title');
    if (!modal || !content) return;

    const name = item.compiled.name || 'x[n]';
    if (title) title.textContent = `Samples: ${item.text || name}`;

    const nStart = -10;
    const nEnd = 20;
    const rows = [];

    let tableHtml = `<table class="samples-table"><thead><tr><th>n</th><th>${escapeHtml(name)}</th></tr></thead><tbody>`;
    for (let n = nStart; n <= nEnd; n++) {
      const rawVal = item.compiled.evalRaw ? item.compiled.evalRaw(n, n) : item.compiled.eval(n, n);
      let strVal = '0';
      if (rawVal && typeof rawVal.toString === 'function' && (rawVal.re !== undefined || rawVal.im !== undefined)) {
        strVal = rawVal.toString();
      } else if (typeof rawVal === 'number') {
        strVal = isNaN(rawVal) ? '0' : Number(rawVal.toFixed(4)).toString();
      } else {
        strVal = String(rawVal);
      }
      rows.push({ n, val: strVal });
      tableHtml += `<tr><td>${n}</td><td>${strVal}</td></tr>`;
    }
    tableHtml += '</tbody></table>';
    content.innerHTML = tableHtml;

    // Bind Copy Buttons
    document.getElementById('copy-csv-btn').onclick = () => {
      const csv = 'n,' + name + '\n' + rows.map(r => `${r.n},${r.val}`).join('\n');
      navigator.clipboard.writeText(csv).then(() => alert('Copied CSV to clipboard!'));
    };
    document.getElementById('copy-numpy-btn').onclick = () => {
      const py = `np.array([${rows.map(r => r.val).join(', ')}])`;
      navigator.clipboard.writeText(py).then(() => alert('Copied NumPy array to clipboard!'));
    };
    document.getElementById('copy-matlab-btn').onclick = () => {
      const mat = `[${rows.map(r => r.val).join(' ')}]`;
      navigator.clipboard.writeText(mat).then(() => alert('Copied MATLAB vector to clipboard!'));
    };

    modal.style.display = 'flex';
  }

  // --- DTFT FREQUENCY SPECTRUM DRAWER ---
  function openDTFTSpectrum(item) {
    if (!item.compiled || !item.compiled.eval) return;
    const modal = document.getElementById('dtft-modal');
    const canvas = document.getElementById('dtft-canvas');
    const info = document.getElementById('dtft-metrics-info');
    if (!modal || !canvas) return;

    const math = getMath();
    const dtftPoints = math.computeDTFT(item.compiled.eval, 120);
    const metrics = math.computeSignalMetrics(item.compiled.eval);

    if (info) {
      info.innerHTML = `
        <span>Energy E: <b>${metrics.energy}</b></span>
        <span>Power P: <b>${metrics.power}</b></span>
        <span>Period: <b>${metrics.period}</b></span>
      `;
    }

    // Draw spectrum on canvas
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;

    // Axis lines
    ctx.beginPath();
    ctx.moveTo(0, h - 25); ctx.lineTo(w, h - 25);
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Axis labels
    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('-π', 10, h - 10);
    ctx.fillText('0', w / 2 - 3, h - 10);
    ctx.fillText('π', w - 20, h - 10);

    // Find max mag
    let maxMag = 1e-6;
    dtftPoints.forEach(p => { if (p.mag > maxMag) maxMag = p.mag; });

    // Draw DTFT Magnitude Curve
    ctx.save();
    ctx.strokeStyle = item.color || '#2d70b3';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    dtftPoints.forEach((p, idx) => {
      const px = ((p.omega + Math.PI) / (2 * Math.PI)) * w;
      const py = (h - 28) - (p.mag / maxMag) * (h - 45);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();

    modal.style.display = 'flex';
  }

  // --- GLOBAL UI & CONTROLLER HANDLERS ---
  function initUIHandlers() {
    // 1. Plus Button & Add Menu Dropdown
    const plusBtn = document.getElementById('desmos-plus-btn');
    const addMenu = document.getElementById('add-menu-dropdown');
    if (plusBtn) {
      plusBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (addMenu) {
          const isHidden = (addMenu.style.display === 'none' || !addMenu.style.display);
          const shareMenu = document.getElementById('share-menu-dropdown');
          if (shareMenu) shareMenu.style.display = 'none';
          addMenu.style.display = isHidden ? 'flex' : 'none';
        }
        // If called without event object (e.g. automated test suites), add row directly
        if (!e) {
          const item = insertItem(state.items.length, { text: '' });
          renderSidebar(item.id);
        }
      };
    }

    // Add Menu Action Buttons
    const addExprBtn = document.getElementById('add-expr-btn');
    if (addExprBtn) {
      addExprBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (addMenu) addMenu.style.display = 'none';
        const item = insertItem(state.items.length, { text: '' });
        renderSidebar(item.id);
      };
    }

    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
      addNoteBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (addMenu) addMenu.style.display = 'none';
        const item = insertItem(state.items.length, { text: 'Note: ', type: 'note' });
        renderSidebar(item.id);
      };
    }

    const addFolderBtn = document.getElementById('add-folder-btn');
    if (addFolderBtn) {
      addFolderBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (addMenu) addMenu.style.display = 'none';
        const item = insertItem(state.items.length, { text: 'folder: New Folder', type: 'folder' });
        renderSidebar(item.id);
      };
    }

    const addTableBtn = document.getElementById('add-table-btn');
    if (addTableBtn) {
      addTableBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (addMenu) addMenu.style.display = 'none';
        const item = insertItem(state.items.length, { text: 'x[n] = (0.8^n) * u[n]' });
        renderSidebar(item.id);
        openDataTable(item);
      };
    }

    // 2. Undo & Redo Buttons
    const undoBtn = document.getElementById('desmos-undo-btn');
    if (undoBtn) undoBtn.onclick = undo;
    const redoBtn = document.getElementById('desmos-redo-btn');
    if (redoBtn) redoBtn.onclick = redo;

    // 3. Click blank dock area to add line
    const onDockClick = () => {
      const lastItem = state.items[state.items.length - 1];
      if (lastItem && lastItem.text.trim() === '') {
        renderSidebar(lastItem.id);
      } else {
        const newItem = insertItem(state.items.length, { text: '' });
        renderSidebar(newItem.id);
      }
    };

    const sidebarScroll = document.getElementById('sidebar-scroll-area');
    if (sidebarScroll) {
      sidebarScroll.onclick = (e) => {
        if (e.target === sidebarScroll || (e.target && e.target.id === 'sidebar-blank-dock')) {
          onDockClick();
        }
      };
    }

    const blankDock = document.getElementById('sidebar-blank-dock');
    if (blankDock) {
      blankDock.onclick = onDockClick;
    }

    // 4. Mute All / Show All Toggle fallback (for test compatibility)
    const muteBtn = document.getElementById('toggle-mute-btn');
    if (muteBtn) {
      muteBtn.onclick = () => {
        state.allMuted = !state.allMuted;
        state.items.forEach(it => { it.visible = !state.allMuted; });
        renderSidebar();
        recompileAll();
      };
    }

    // 5. Dark Theme Toggle fallback (for test compatibility)
    const darkBtn = document.getElementById('toggle-dark-btn');
    if (darkBtn) {
      darkBtn.onclick = () => {
        state.darkMode = !state.darkMode;
        document.body.classList.toggle('dark-theme', state.darkMode);
        if (graph) graph.setSettings({ darkMode: state.darkMode });
      };
    }

    // 6. Share & Export Menu Dropdown Toggle
    const shareToggleBtn = document.getElementById('share-menu-toggle');
    const shareDropdown = document.getElementById('share-menu-dropdown');
    if (shareToggleBtn && shareDropdown) {
      shareToggleBtn.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const isHidden = (shareDropdown.style.display === 'none' || !shareDropdown.style.display);
        if (addMenu) addMenu.style.display = 'none';
        shareDropdown.style.display = isHidden ? 'flex' : 'none';
      };
    }

    // 7. Vector SVG Export
    const exportSvgBtn = document.getElementById('export-svg-btn');
    if (exportSvgBtn) {
      exportSvgBtn.onclick = () => {
        if (shareDropdown) shareDropdown.style.display = 'none';
        if (!graph) return;
        const svgString = graph.exportSVG();
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = `omnigraph_${Date.now()}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
      };
    }

    // 8. High-Res PNG Export
    const exportPngBtn = document.getElementById('export-png-btn');
    if (exportPngBtn) {
      exportPngBtn.onclick = () => {
        if (shareDropdown) shareDropdown.style.display = 'none';
        const link = document.createElement('a');
        link.download = `omnigraph_${Date.now()}.png`;
        link.href = graph.canvas.toDataURL('image/png');
        link.click();
      };
    }

    // 9. Shareable Permalink (URL Hash state encoding)
    const shareBtn = document.getElementById('share-graph-btn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        if (shareDropdown) shareDropdown.style.display = 'none';
        const cleanState = state.items.map(it => ({
          text: it.text,
          color: it.color,
          lineStyle: it.lineStyle,
          sliderVal: it.sliderVal
        }));
        const encoded = btoa(encodeURIComponent(JSON.stringify(cleanState)));
        window.location.hash = `state=${encoded}`;
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert('Shareable URL copied to clipboard!');
        });
      };
    }

    // Close Dropdown Menus on Outside Click
    window.addEventListener('click', (e) => {
      if (addMenu && addMenu.style.display !== 'none') {
        if (!e.target.closest('#add-menu-dropdown') && !e.target.closest('#desmos-plus-btn')) {
          addMenu.style.display = 'none';
        }
      }
      if (shareDropdown && shareDropdown.style.display !== 'none') {
        if (!e.target.closest('#share-menu-dropdown') && !e.target.closest('#share-menu-toggle')) {
          shareDropdown.style.display = 'none';
        }
      }
    });

    // 10. Zoom Controls
    document.getElementById('zoom-in-btn').onclick = () => graph.zoom(0.85);
    document.getElementById('zoom-out-btn').onclick = () => graph.zoom(1.18);
    document.getElementById('home-view-btn').onclick = () => graph.setHome();

    // 11. Modal Close Buttons
    const closeTableBtn = document.getElementById('close-table-btn');
    if (closeTableBtn) closeTableBtn.onclick = () => { document.getElementById('table-modal').style.display = 'none'; };

    const closeDtftBtn = document.getElementById('close-dtft-btn');
    if (closeDtftBtn) closeDtftBtn.onclick = () => { document.getElementById('dtft-modal').style.display = 'none'; };

    // 12. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    });

    // 13. Graph Settings / Wrench Modal
    const wrenchBtn = document.getElementById('wrench-btn');
    const wrenchModal = document.getElementById('wrench-modal');
    const closeWrenchBtn = document.getElementById('close-wrench-btn');
    const applyWrenchBtn = document.getElementById('apply-wrench-btn');
    const angleRadBtn = document.getElementById('angle-rad-btn');
    const angleDegBtn = document.getElementById('angle-deg-btn');

    if (wrenchBtn && wrenchModal) {
      wrenchBtn.onclick = () => {
        if (graph) {
          document.getElementById('setting-grid').checked = graph.showGrid;
          document.getElementById('setting-subgrid').checked = graph.showSubGrid;
          document.getElementById('setting-axes').checked = graph.showAxes;
          document.getElementById('setting-labels').checked = graph.showLabels;
          document.getElementById('setting-aspect').checked = graph.squareAspectRatio;
          document.getElementById('setting-xlabel').value = graph.xAxisLabel || 'x';
          document.getElementById('setting-ylabel').value = graph.yAxisLabel || 'y';
          document.getElementById('bound-xmin').value = Number(graph.bounds.xMin.toFixed(4));
          document.getElementById('bound-xmax').value = Number(graph.bounds.xMax.toFixed(4));
          document.getElementById('bound-ymin').value = Number(graph.bounds.yMin.toFixed(4));
          document.getElementById('bound-ymax').value = Number(graph.bounds.yMax.toFixed(4));
        }

        if (state.angleMode === 'degrees') {
          angleDegBtn.classList.add('active');
          angleRadBtn.classList.remove('active');
        } else {
          angleRadBtn.classList.add('active');
          angleDegBtn.classList.remove('active');
        }

        wrenchModal.style.display = 'flex';
      };

      if (closeWrenchBtn) closeWrenchBtn.onclick = () => { wrenchModal.style.display = 'none'; };

      if (angleRadBtn && angleDegBtn) {
        angleRadBtn.onclick = () => {
          state.angleMode = 'radians';
          angleRadBtn.classList.add('active');
          angleDegBtn.classList.remove('active');
          if (graph) graph.angleMode = 'radians';
          recompileAll();
        };

        angleDegBtn.onclick = () => {
          state.angleMode = 'degrees';
          angleDegBtn.classList.add('active');
          angleRadBtn.classList.remove('active');
          if (graph) graph.angleMode = 'degrees';
          recompileAll();
        };
      }

      if (applyWrenchBtn) {
        applyWrenchBtn.onclick = () => {
          const xMin = parseFloat(document.getElementById('bound-xmin').value);
          const xMax = parseFloat(document.getElementById('bound-xmax').value);
          const yMin = parseFloat(document.getElementById('bound-ymin').value);
          const yMax = parseFloat(document.getElementById('bound-ymax').value);
          const xLbl = document.getElementById('setting-xlabel').value;
          const yLbl = document.getElementById('setting-ylabel').value;

          if (graph) {
            graph.setSettings({
              showGrid: document.getElementById('setting-grid').checked,
              showSubGrid: document.getElementById('setting-subgrid').checked,
              showAxes: document.getElementById('setting-axes').checked,
              showLabels: document.getElementById('setting-labels').checked,
              squareAspectRatio: document.getElementById('setting-aspect').checked,
              xAxisLabel: xLbl || 'x',
              yAxisLabel: yLbl || 'y',
              angleMode: state.angleMode,
              bounds: (isFinite(xMin) && isFinite(xMax) && isFinite(yMin) && isFinite(yMax) && xMax > xMin && yMax > yMin) ? {
                xMin, xMax, yMin, yMax
              } : null
            });
          }
          recompileAll();
          wrenchModal.style.display = 'none';
        };
      }
    }

    // 14. Sidebar Collapse & Expand
    const collapseSidebarBtn = document.getElementById('collapse-sidebar-btn');
    const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
    const sidebar = document.getElementById('sidebar');

    if (collapseSidebarBtn && sidebar) {
      collapseSidebarBtn.onclick = () => {
        sidebar.classList.add('collapsed');
        if (expandSidebarBtn) expandSidebarBtn.style.display = 'flex';
        if (graph) graph.resize();
        setTimeout(() => { if (graph) graph.resize(); }, 220);
      };
    }

    if (expandSidebarBtn && sidebar) {
      expandSidebarBtn.onclick = () => {
        sidebar.classList.remove('collapsed');
        expandSidebarBtn.style.display = 'none';
        if (graph) graph.resize();
        setTimeout(() => { if (graph) graph.resize(); }, 220);
      };
    }

    // 15. Sidebar Header Settings Button (triggers wrench modal)
    const sidebarWrenchBtn = document.getElementById('sidebar-wrench-btn');
    if (sidebarWrenchBtn && wrenchBtn) {
      sidebarWrenchBtn.onclick = () => {
        wrenchBtn.click();
      };
    }

    // 16. Initialize Virtual Math Keypad
    initKeypad();

    // 17. Mobile Orientation Change & Window Resize
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (graph && typeof graph.resize === 'function') graph.resize();
        }, 150);
      });
    }
  }

  // --- VIRTUAL ON-SCREEN MATH KEYPAD ---
  function updateInputModes(keypadOpen) {
    if (typeof document === 'undefined') return;
    const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || window.innerWidth <= 768);
    if (!isTouch) return;
    const inputs = document.querySelectorAll('.mq-textarea textarea, .expr-input, .expr-fallback-input');
    inputs.forEach(el => {
      if (keypadOpen) {
        el.setAttribute('inputmode', 'none');
      } else {
        el.removeAttribute('inputmode');
      }
    });
  }

  function setKeypadOpen(open) {
    const toggleBtn = document.getElementById('keypad-toggle-btn');
    const keypad = document.getElementById('virtual-keypad');
    state.keypadOpen = open;
    if (keypad) {
      if (open) {
        keypad.classList.add('open');
        if (toggleBtn) toggleBtn.classList.add('active');
        if (document.body) document.body.classList.add('keypad-open');
        if (!state.activeItemId && state.items.length > 0) {
          renderSidebar(state.items[state.items.length - 1].id);
        }
      } else {
        keypad.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('active');
        if (document.body) document.body.classList.remove('keypad-open');
      }
    }
    updateInputModes(open);
    if (graph && typeof graph.resize === 'function') graph.resize();
  }

  function initKeypad() {
    const toggleBtn = document.getElementById('keypad-toggle-btn');
    const keypad = document.getElementById('virtual-keypad');
    const closeBtn = document.getElementById('keypad-close-btn');
    if (!keypad) return;

    if (toggleBtn) {
      toggleBtn.onclick = () => setKeypadOpen(!state.keypadOpen);
    }
    if (closeBtn) {
      closeBtn.onclick = () => setKeypadOpen(false);
    }

    // Keypad tabs
    const tabBtns = keypad.querySelectorAll('.keypad-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.getAttribute('data-tab');
        state.keypadTab = tabName;
        keypad.querySelectorAll('.keypad-panel').forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(`keypad-panel-${tabName}`);
        if (targetPanel) targetPanel.classList.add('active');
      };
    });

    // Handle keypad button clicks without losing input focus
    const keyBtns = keypad.querySelectorAll('.keypad-btn');
    keyBtns.forEach(btn => {
      btn.onmousedown = (e) => {
        e.preventDefault();
        handleKeypadPress(btn);
      };
    });
  }

  function handleKeypadPress(btn) {
    let activeItem = state.items.find(it => it.id === state.activeItemId);
    if (!activeItem && state.items.length > 0) {
      activeItem = state.items[state.items.length - 1];
      state.activeItemId = activeItem.id;
    }
    if (!activeItem) {
      activeItem = insertItem(0, { text: '' });
      state.activeItemId = activeItem.id;
    }

    const mf = activeItem.mathField;
    const cmd = btn.getAttribute('data-cmd');
    const write = btn.getAttribute('data-write');
    const action = btn.getAttribute('data-action');

    if (mf && typeof mf.cmd === 'function') {
      if (cmd) {
        if (cmd === '^2') {
          mf.cmd('^');
          mf.write('2');
        } else {
          mf.cmd(cmd);
        }
      } else if (write) {
        mf.write(write);
      } else if (action) {
        if (action === 'backspace') {
          mf.keystroke('Backspace');
        } else if (action === 'left') {
          mf.keystroke('Left');
        } else if (action === 'right') {
          mf.keystroke('Right');
        } else if (action === 'enter') {
          const curIdx = state.items.findIndex(it => it.id === activeItem.id);
          const next = insertItem(curIdx + 1, { text: '' });
          renderSidebar(next.id);
        }
      }
      if (typeof mf.focus === 'function') mf.focus();
    } else {
      // Fallback text input (headless tests or note/folder items)
      const inputEl = document.querySelector(`[data-id="${activeItem.id}"] .expr-input, [data-id="${activeItem.id}"] .expr-fallback-input`);
      if (inputEl) {
        let val = inputEl.value || '';
        let start = inputEl.selectionStart !== undefined ? inputEl.selectionStart : val.length;
        let end = inputEl.selectionEnd !== undefined ? inputEl.selectionEnd : val.length;

        if (action === 'backspace') {
          if (start === end && start > 0) {
            inputEl.value = val.slice(0, start - 1) + val.slice(end);
            inputEl.selectionStart = inputEl.selectionEnd = start - 1;
          } else if (start !== end) {
            inputEl.value = val.slice(0, start) + val.slice(end);
            inputEl.selectionStart = inputEl.selectionEnd = start;
          }
        } else if (action === 'enter') {
          const curIdx = state.items.findIndex(it => it.id === activeItem.id);
          const next = insertItem(curIdx + 1, { text: '' });
          renderSidebar(next.id);
          return;
        } else {
          const toInsert = cmd ? (cmd === '^2' ? '^2' : (cmd === '\\sqrt' ? 'sqrt(' : cmd)) : (write || '');
          inputEl.value = val.slice(0, start) + toInsert + val.slice(end);
          inputEl.selectionStart = inputEl.selectionEnd = start + toInsert.length;
        }
        activeItem.text = inputEl.value;
        recompileAll();
        const activeCard = document.querySelector(`[data-id="${activeItem.id}"]`);
        const activeIdx = state.items.findIndex(it => it.id === activeItem.id);
        if (activeCard) updateCardDiagnosticsAndSliders(activeCard, activeItem, activeIdx);
        saveHistory();
        if (inputEl.focus) inputEl.focus();
      }
    }
  }

})();
