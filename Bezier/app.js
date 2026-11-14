'use strict';
/* =========================================================================
   Bezier Curve Studio
   Control net + the intermediate "linear approximations" of the de Casteljau
   algorithm: for a parameter t each level replaces a polygon by the polygon of
   segment points (1-t)A + tB, and the polygons shrink to the single point C(t).
   Points are draggable; you can add / remove them (degree = #points - 1).
   ========================================================================= */

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))); const r = raw / p; return p * (r >= 5 ? 5 : r >= 2 ? 2 : 1); };

/* ----------------------------- presets ---------------------------------- */
const PRESETS = [
  { id: 's', name: 'S-curve  (cubic)',
    desc: 'Four control points → a <b>cubic</b> Bézier. The de&nbsp;Casteljau construction has 3 levels '
        + '(net → 3 points → 2 points → 1). Drag any point and the <b>whole</b> curve reshapes: a Bézier has no local control.',
    pts: [[0.15, 0.25], [0.45, 0.85], [0.55, 0.15], [0.85, 0.75]] },

  { id: 'arch', name: 'Arch  (quadratic)',
    desc: 'Three points → a <b>quadratic</b> Bézier (2 de&nbsp;Casteljau levels). With only one “pull” point it makes a '
        + 'clean parabola-like arch — the simplest curved case.',
    pts: [[0.2, 0.2], [0.5, 0.92], [0.8, 0.2]] },

  { id: 'loop', name: 'Loop / cusp  (cubic)',
    desc: 'A cubic whose net crosses itself. Push the points and watch C(t) trace a loop or a cusp — the curve can go '
        + 'wherever the hull allows, but always <b>inside the convex hull</b> of the net.',
    pts: [[0.25, 0.5], [0.5, 0.95], [0.5, 0.05], [0.75, 0.5]] },

  { id: 'wave', name: 'Wave  (quintic)',
    desc: 'Six points → a <b>degree-5</b> Bézier (5 levels). Higher degree gives wigglier curves, but every point still '
        + 'influences the entire curve — the reason B-splines exist (coming later).',
    pts: [[0.1, 0.5], [0.3, 0.85], [0.45, 0.2], [0.6, 0.8], [0.75, 0.25], [0.9, 0.6]] },

  { id: 'flat', name: 'Nearly straight',
    desc: 'Points almost collinear → a nearly straight curve. Good for reading the construction: the nested polygons '
        + 'collapse almost onto the segment, and C(t) stays close to the baseline.',
    pts: [[0.15, 0.5], [0.4, 0.56], [0.6, 0.44], [0.85, 0.5]] },
];

/* ------------------------------ state ----------------------------------- */
const S = {
  preset: PRESETS[0],
  pts: PRESETS[0].pts.map(p => [p[0], p[1]]),
  t: 0.5, speed: 1, playing: false, sel: -1,
  chkNet: true, chkLevels: true, chkCurve: true, chkHull: false, chkTrace: true, chkLabels: true,
  chkElev: false, elevK: 3,
  view: { cx: 0.5, cy: 0.5, span: 0.62 },
  trail: [],
};

/* ----------------------------- canvases --------------------------------- */
const cv = $('cv'), g = cv.getContext('2d');
function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  const w = Math.max(64, Math.round(r.width * dpr));
  const h = Math.max(64, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { w: cv.width, h: cv.height, dpr };
}
function size() { return fitCanvas(); }
function scale() { const { w, h } = size(); return (Math.min(w, h) / 2) / S.view.span; }
function toS(p) { const { w, h } = size(); const k = scale(); return [w / 2 + (p[0] - S.view.cx) * k, h / 2 - (p[1] - S.view.cy) * k]; }
function toW(sx, sy) { const { w, h } = size(); const k = scale(); return [S.view.cx + (sx - w / 2) / k, S.view.cy - (sy - h / 2) / k]; }

/* --------------------------- view fitting ------------------------------- */
function fitToPoints() {
  const pts = S.pts;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (!isFinite(minX)) { S.view = { cx: .5, cy: .5, span: .62 }; return; }
  const aspect = cv.width / cv.height;
  let span = Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspect) * 1.2 + 0.06;
  S.view = { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, span: Math.max(span, 0.28) };
}
// keep a dragged point on screen by expanding the view only (never shrinks)
function ensureVisible(p) {
  const { w, h } = size();
  const hw = S.view.span * (w / h) * 0.94, hh = S.view.span * 0.94;
  let { cx, cy, span } = S.view;
  if (p[0] < cx - hw) cx = p[0] + hw; else if (p[0] > cx + hw) cx = p[0] - hw;
  if (p[1] < cy - hh) cy = p[1] + hh; else if (p[1] > cy + hh) cy = p[1] - hh;
  S.view = { cx, cy, span };
}
function clampToWorld(sx, sy) {
  const { w, h } = size();
  const hw = S.view.span * (w / h) - 0.01, hh = S.view.span - 0.01;
  const [x, y] = toW(sx, sy);
  return [clamp(x, S.view.cx - hw, S.view.cx + hw), clamp(y, S.view.cy - hh, S.view.cy + hh)];
}

/* --------------------------- zoom & pan --------------------------------- */
const ZOOM_MIN = 0.01, ZOOM_MAX = 10;           // world half-span limits (scene is ~[0,1])
// Zoom about the cursor: keep the world point under the pointer fixed. factor>1
// enlarges the span (zoom out), factor<1 shrinks it (zoom in).
function zoomAt(sx, sy, factor) {
  const [wx, wy] = toW(sx, sy);
  const old = S.view.span, neu = clamp(old * factor, ZOOM_MIN, ZOOM_MAX);
  const r = neu / old;
  S.view = { cx: wx - (wx - S.view.cx) * r, cy: wy - (wy - S.view.cy) * r, span: neu };
}

/* ----------------------- de Casteljau construction ---------------------- */
// returns the nested polygons: levels[0] = control net, levels[n] = [[C(t)]]
function levels(t) {
  let cur = S.pts.map(p => [p[0], p[1]]);
  const lv = [cur];
  while (cur.length > 1) {
    const nx = [];
    for (let i = 0; i < cur.length - 1; i++)
      nx.push([(1 - t) * cur[i][0] + t * cur[i + 1][0], (1 - t) * cur[i][1] + t * cur[i + 1][1]]);
    cur = nx; lv.push(cur);
  }
  return lv;
}
function curvePoint(t) { const lv = levels(t); return lv[lv.length - 1][0]; }
function sampleCurve(M) { const out = []; for (let i = 0; i <= M; i++) out.push(curvePoint(i / M)); return out; }

// Andrew's monotone chain — the true convex hull (CCW), the region the Bézier
// is guaranteed to stay inside. Returns the hull vertices (no collinear ones).
function convexHull(pts) {
  if (pts.length < 3) return pts.slice();
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const low = [];
  for (const p of P) { while (low.length >= 2 && cr(low[low.length - 2], low[low.length - 1], p) <= 0) low.pop(); low.push(p); }
  const up = [];
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  low.pop(); up.pop();
  return low.concat(up);
}

/* --------------------------- degree elevation --------------------------- */
// Degree elevation: express the SAME curve at degree+1. Q_i = (i/(n+1)) P_{i-1}
// + (1 - i/(n+1)) P_i. Repeating pulls the net onto the curve.
function elevateOnce(P) {
  const n = P.length - 1, Q = [];
  for (let i = 0; i <= n + 1; i++) {
    const a = i / (n + 1), L = i === 0 ? null : P[i - 1], R = i === n + 1 ? null : P[i];
    if (L && R) Q.push([a * L[0] + (1 - a) * R[0], a * L[1] + (1 - a) * R[1]]);
    else if (L) Q.push(L.slice());
    else Q.push(R.slice());
  }
  return Q;
}
function elevate(P, k) { let Q = P.map(p => p.slice()); for (let i = 0; i < k; i++) Q = elevateOnce(Q); return Q; }

/* ------------------------------ colors ---------------------------------- */
const NET = [96, 128, 196], CURVE = [110, 231, 255];
const ELEV = [206, 150, 255];
function levelColor(L, n) { return lerpC(NET, CURVE, n === 0 ? 0 : L / n); }

/* =============================== RENDER --------------------------------- */
function drawGrid() {
  const { w, h } = size();
  const a = toW(0, 0), b = toW(w, h);
  const minX = Math.min(a[0], b[0]), maxX = Math.max(a[0], b[0]);
  const minY = Math.min(a[1], b[1]), maxY = Math.max(a[1], b[1]);
  const step = niceStep((maxX - minX) / 8);
  g.lineWidth = 1;
  for (let x = Math.ceil(minX / step) * step; x <= maxX; x += step) {
    const [sx] = toS([x, 0]);
    g.strokeStyle = Math.abs(x) < step / 2 ? 'rgba(150,170,220,.22)' : 'rgba(150,170,220,.07)';
    g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx, h); g.stroke();
  }
  for (let y = Math.ceil(minY / step) * step; y <= maxY; y += step) {
    const [, sy] = toS([0, y]);
    g.strokeStyle = Math.abs(y) < step / 2 ? 'rgba(150,170,220,.22)' : 'rgba(150,170,220,.07)';
    g.beginPath(); g.moveTo(0, sy); g.lineTo(w, sy); g.stroke();
  }
}
function polyPath(pts) { g.beginPath(); for (let i = 0; i < pts.length; i++) { const [x, y] = toS(pts[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } }
function strokePoly(pts, col, lw) { if (pts.length < 2) return; polyPath(pts); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); }
function dot(x, y, r, fill, col, ring) {
  g.beginPath(); g.arc(x, y, r, 0, 7);
  if (fill) { g.fillStyle = col; g.fill(); }
  if (ring) { g.strokeStyle = ring; g.lineWidth = 1.4; g.stroke(); }
}
function drawLevel(L, lv, n) {
  const col = levelColor(L, n);
  strokePoly(lv, rgb(col, L === 0 ? .55 : .9), L === 0 ? 1.6 : 2.1);
  for (const p of lv) { const [x, y] = toS(p); dot(x, y, 3.2, true, rgb(col, .95), 'rgba(0,0,0,.5)'); }
}

function render() {
  const { w, h, dpr } = fitCanvas();
  g.clearRect(0, 0, w, h);
  g.lineJoin = g.lineCap = 'round';
  drawGrid();
  const n = S.pts.length - 1;

  // trace of C(t) as t sweeps
  if (S.chkTrace && S.trail.length > 1) {
    g.setLineDash([]);
    for (let i = 1; i < S.trail.length; i++) {
      const A = toS(S.trail[i - 1]), B = toS(S.trail[i]);
      g.strokeStyle = 'rgba(110,231,255,.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    }
  }

  // full sampled curve
  if (S.chkCurve) strokePoly(sampleCurve(160), rgb(CURVE, .95), 2.6);

  // convex hull fill (the region the curve is guaranteed to stay inside)
  if (S.chkHull) {
    const ch = convexHull(S.pts);
    if (ch.length >= 3) {
      polyPath(ch); g.closePath(); g.fillStyle = 'rgba(183,148,246,.10)'; g.fill();
      g.strokeStyle = 'rgba(183,148,246,.45)'; g.setLineDash([5, 4]); g.lineWidth = 1.3; g.stroke(); g.setLineDash([]);
    }
  }

  // de Casteljau construction
  if (S.chkNet || (S.chkLevels && n >= 1)) {
    const lv = levels(S.t);
    if (S.chkNet) drawLevel(0, lv[0], n);
    if (S.chkLevels) {
      for (let L = 1; L < n; L++) drawLevel(L, lv[L], n);       // intermediate linear approximations
      // final level is the single point C(t)
      const [cx, cy] = toS(lv[n][0]);
      dot(cx, cy, 7, true, '#a8ffff', 'rgba(255,255,255,.9)');
      dot(cx, cy, 3.5, true, '#fff');
    }
  }

  // degree elevation: repeated elevation of the SAME curve pulls the net onto it.
  // Each fainter→stronger purple net is the curve at degree n+1, n+2, … (same shape).
  if (S.chkElev && S.elevK > 0) {
    for (let k = 1; k <= S.elevK; k++) strokePoly(elevate(S.pts, k), rgb(ELEV, 0.1 + 0.16 * k / S.elevK), 1.3);
    for (const p of elevate(S.pts, S.elevK)) { const [x, y] = toS(p); dot(x, y, 3, true, rgb(ELEV, .95), 'rgba(0,0,0,.5)'); }
  }

  // control points (drawn on top)
  for (let i = 0; i < S.pts.length; i++) {
    const [x, y] = toS(S.pts[i]);
    const sel = i === S.sel;
    dot(x, y, sel ? 7 : 6, true, sel ? '#fff' : 'rgba(220,232,255,.92)', sel ? 'rgba(110,231,255,.95)' : 'rgba(20,28,50,.8)');
  }

  // labels
  if (S.chkLabels) {
    g.font = `${11 * dpr}px ui-monospace, monospace`;
    for (let i = 0; i < S.pts.length; i++) {
      const [x, y] = toS(S.pts[i]);
      g.fillStyle = 'rgba(220,232,255,.85)';
      g.fillText(`P${i}`, x + 8, y - 8);
    }
    if (S.chkLevels && n >= 1) {
      const [cx, cy] = toS(curvePoint(S.t));
      g.fillStyle = '#a8ffff';
      g.fillText(`C(t)`, cx + 10, cy + 4);
    }
  }
}

/* ------------------------------ status ---------------------------------- */
function status() {
  const n = S.pts.length - 1, p = curvePoint(S.t);
  const chain = n === 0 ? '1 point' : `${S.pts.length} → ${S.pts.length - 1} → … → 1`;
  let extra = '';
  if (S.chkElev && S.elevK > 0) extra += ` &nbsp;·&nbsp; <span class="k">elevated ×${S.elevK}</span> (degree ${n + S.elevK}, same curve)`;
  $('status').innerHTML =
    `<span class="k">degree</span> ${n} &nbsp;·&nbsp; <span class="k">control pts</span> ${S.pts.length} &nbsp;·&nbsp; ` +
    `<span class="k">t</span> ${S.t.toFixed(3)} &nbsp;·&nbsp; <span class="k">de&nbsp;Casteljau</span> ${chain} &nbsp;→&nbsp; ` +
    `<span class="k">C(t)</span> = (${p[0].toFixed(3)}, ${p[1].toFixed(3)})` + extra;
}

/* ============================== INTERACTION ----------------------------- */
function pointerSp(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
function nearest(sp) {
  let best = -1, bd = 14 * (window.devicePixelRatio || 1);
  for (let i = 0; i < S.pts.length; i++) { const [x, y] = toS(S.pts[i]); const d = Math.hypot(sp[0] - x, sp[1] - y); if (d < bd) { bd = d; best = i; } }
  return best;
}
let drag = null, pan = null;
cv.addEventListener('pointerdown', e => {
  if (e.button === 1) {                          // middle button = pan the view
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    pan = { start: pointerSp(e), cx: S.view.cx, cy: S.view.cy };
    return;
  }
  cv.setPointerCapture(e.pointerId);
  const sp = pointerSp(e);
  const hit = nearest(sp);
  drag = { i: hit, start: sp, moved: false };
  if (hit >= 0) S.sel = hit;
});
cv.addEventListener('pointermove', e => {
  if (pan) {                                     // drag the view center by the pointer delta
    const sp = pointerSp(e), k = scale();
    S.view = { cx: pan.cx - (sp[0] - pan.start[0]) / k, cy: pan.cy + (sp[1] - pan.start[1]) / k, span: S.view.span };
    return;
  }
  if (!drag) return;
  const sp = pointerSp(e);
  if (Math.hypot(sp[0] - drag.start[0], sp[1] - drag.start[1]) > 4) drag.moved = true;
  if (drag.i >= 0) { S.pts[drag.i] = clampToWorld(sp[0], sp[1]); ensureVisible(S.pts[drag.i]); }
});
cv.addEventListener('pointerup', e => {
  if (pan) { pan = null; return; }
  if (!drag) return;
  // a pure click on empty space adds a control point there
  if (drag.i < 0 && !drag.moved) addPoint(pointerSp(e));
  drag = null;
});
cv.addEventListener('pointercancel', () => { drag = null; pan = null; });
cv.addEventListener('wheel', e => {              // zoom about the cursor
  e.preventDefault();
  const sp = pointerSp(e);
  zoomAt(sp[0], sp[1], Math.exp(e.deltaY * 0.0012));
}, { passive: false });

function addPoint(sp) {
  let p;
  if (sp) { p = clampToWorld(sp[0], sp[1]); }
  else if (S.pts.length) { const l = S.pts[S.pts.length - 1]; p = [clamp(l[0] + 0.12, 0, 1), clamp(l[1], 0, 1)]; }
  else p = [0.5, 0.5];
  const idx = S.sel >= 0 ? S.sel + 1 : S.pts.length;
  S.pts.splice(idx, 0, p);
  S.sel = idx;
  fitToPoints();
}
function removePoint() {
  if (S.pts.length <= 2) return;                     // keep at least a segment
  let i = S.sel >= 0 ? S.sel : S.pts.length - 1;
  S.pts.splice(i, 1);
  S.sel = clamp(i, 0, S.pts.length - 1);
  S.trail.length = 0;
  fitToPoints();
}
// replace the working curve with a new control net (used by degree-elevation);
// keeps it a single editable Bézier and re-fits the view.
function setPts(pts, note) {
  S.pts = pts.map(p => [p[0], p[1]]);
  S.sel = -1; S.trail.length = 0;
  if (note != null) $('desc').innerHTML = note;
  fitToPoints();
}

/* ============================== UI WIRING ------------------------------- */
const sel = $('sel');
for (const pr of PRESETS) { const o = document.createElement('option'); o.value = pr.id; o.textContent = pr.name; sel.appendChild(o); }

function loadPreset(pr) {
  S.preset = pr;
  S.pts = pr.pts.map(p => [p[0], p[1]]);
  S.sel = -1; S.trail.length = 0;
  $('desc').innerHTML = pr.desc;
  fitToPoints();
}
sel.addEventListener('change', () => loadPreset(PRESETS.find(p => p.id === sel.value)));
$('btnAdd').addEventListener('click', () => addPoint(null));
$('btnRemove').addEventListener('click', removePoint);
$('btnClear').addEventListener('click', () => loadPreset(S.preset));

const rngT = $('rngT'), lblT = $('lblT');
rngT.addEventListener('input', () => { S.t = +rngT.value; lblT.textContent = (+rngT.value).toFixed(3); S.trail.length = 0; });
$('rngSpeed').addEventListener('input', e => S.speed = +e.target.value);

const btnPlay = $('btnPlay');
const togglePlay = () => { S.playing = !S.playing; btnPlay.textContent = S.playing ? '⏸ pause' : '▶ play'; if (S.playing) S.trail.length = 0; };
btnPlay.addEventListener('click', togglePlay);

for (const [id, key] of [['chkNet', 'chkNet'], ['chkLevels', 'chkLevels'], ['chkCurve', 'chkCurve'], ['chkHull', 'chkHull'], ['chkTrace', 'chkTrace'], ['chkLabels', 'chkLabels'], ['chkElev', 'chkElev']])
  $(id).addEventListener('change', e => { S[key] = e.target.checked; });

const rngElev = $('rngElev'), lblElev = $('lblElev');
rngElev.addEventListener('input', e => { S.elevK = +e.target.value; lblElev.textContent = S.elevK; });
$('btnElevate').addEventListener('click', () => { if (S.pts.length < 2) return; const Q = elevateOnce(S.pts); setPts(Q, `Degree elevated to <b>${S.pts.length}</b> — <b>the same curve</b>, now with one more control point. Move them and it still matches.`); });

/* Space = play/pause, but NOT while typing in a field (keeps native behavior) */
function isFormControl(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
  if (tag === 'INPUT') return ['text', 'search', 'url', 'email', 'tel', 'password', 'number', 'range', 'checkbox', 'radio'].includes((el.type || '').toLowerCase());
  return false;
}
document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'BUTTON' || isFormControl(e.target))) return;
  if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); togglePlay(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePoint(); return; }
});

/* =============================== MAIN LOOP ------------------------------ */
let prev = null;
function frame(now) {
  if (prev === null) prev = now;
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (S.playing) {
    S.t += (1 / 4.5) * dt * S.speed;
    if (S.t >= 1) { S.t -= 1; S.trail.length = 0; }
    else { const p = curvePoint(S.t); S.trail.push(p); if (S.trail.length > 2000) S.trail.shift(); }
    rngT.value = S.t; lblT.textContent = S.t.toFixed(3);
  }
  render(); status();
  requestAnimationFrame(frame);
}

/* --- start (with deep link ?preset=…&t=…) --- */
const qGet = k => (window.location && window.location.search) ? new URLSearchParams(window.location.search).get(k) : null;
const START = PRESETS.find(p => p.id === qGet('preset')) || PRESETS[0];
sel.value = START.id;
loadPreset(START);
{ const tt = qGet('t'); if (tt !== null) { S.t = clamp(parseFloat(tt), 0, 1); rngT.value = S.t; lblT.textContent = S.t.toFixed(3); } }
frame(0);
