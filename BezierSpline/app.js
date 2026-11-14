'use strict';
/* =========================================================================
   Bezier Spline Studio
   Subdivision: splitting a Bézier at a parameter t produces TWO Bézier pieces
   (the left and right edges of the de Casteljau triangle). The split is
   COMMITTED — the two pieces become independently editable control polygons
   joined at a shared point (C0 continuity). Toggle C1 to couple the two tangent
   handles so the joint stays smooth:
     • drag the shared point (C0)  -> both pieces move;
     • drag one tangent handle     -> its partner snaps to keep C1;
     • with C1 off, every point moves freely.
   After the split the parameter t no longer changes the SHAPE — it only slides
   the two evaluation points C_L(t) and C_R(t) along the two fixed pieces.
   ========================================================================= */

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))); const r = raw / p; return p * (r >= 5 ? 5 : r >= 2 ? 2 : 1); };

/* ----------------------------- presets ---------------------------------- */
const PRESETS = [
  { id: 's', name: 'S-curve  (cubic)',
    pts: [[0.15, 0.25], [0.45, 0.85], [0.55, 0.15], [0.85, 0.75]],
    desc: 'A <b>cubic</b> you can split at any t. Set t so <b>C(t)</b> sits where you want the joint, then '
        + '<b>Split here</b> — the curve becomes two cubic pieces joined at that point. Toggle <b>C1</b> to couple '
        + 'the two tangent handles and keep the joint smooth.' },

  { id: 'arch', name: 'Arch  (quadratic)',
    pts: [[0.2, 0.2], [0.5, 0.92], [0.8, 0.2]],
    desc: 'A <b>quadratic</b> (3 points) → two quadratics after the split. Fewer handles makes the C0 vs C1 '
        + 'difference easy to read: C0 just shares the join, C1 also aligns the two incoming/outgoing tangents.' },

  { id: 'loop', name: 'Loop / cusp  (cubic)',
    pts: [[0.25, 0.5], [0.5, 0.95], [0.5, 0.05], [0.75, 0.5]],
    desc: 'A cubic whose net crosses itself. Split it at the crossing to separate the two lobes into independent '
        + 'pieces you can reshape on their own — the point of subdivision is exactly this kind of local edit.' },

  { id: 'wave', name: 'Wave  (quintic)',
    pts: [[0.1, 0.5], [0.3, 0.85], [0.45, 0.2], [0.6, 0.8], [0.75, 0.25], [0.9, 0.6]],
    desc: 'A <b>degree-5</b> curve. Each piece keeps degree 5 after the split (6 handles each), so a high-degree '
        + 'parent gives busy joints — a hint of why splines prefer many low-degree pieces over one high-degree curve.' },

  { id: 'flat', name: 'Nearly straight',
    pts: [[0.15, 0.5], [0.4, 0.56], [0.6, 0.44], [0.85, 0.5]],
    desc: 'Nearly collinear points → a gentle baseline. The simplest case for reading the split and the two '
        + 'C1 tangent handles clearly without other wiggles in the way.' },
];

/* ------------------------------ state ----------------------------------- */
const S = {
  preset: PRESETS[0],
  pts: PRESETS[0].pts.map(p => [p[0], p[1]]),
  t: 0.5, speed: 1, playing: false, sel: -1,
  chkNet: true, chkCurve: true, chkHull: false, chkTrace: true, chkLabels: true, chkC1: false,
  split: -1,                                   // index of the shared join point when subdivided; -1 = single curve
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

/* --------------------------- evaluation --------------------------------- */
// de Casteljau nested polygons: levels[0] = net, levels[n] = [[C(t)]]
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

// evaluate / sample ANY control net at parameter u (de Casteljau) — used to
// evaluate the two committed pieces independently of one another.
function bezPt(P, u) {
  let c = P.map(p => [p[0], p[1]]);
  while (c.length > 1) {
    const nx = [];
    for (let i = 0; i < c.length - 1; i++) nx.push([(1 - u) * c[i][0] + u * c[i + 1][0], (1 - u) * c[i][1] + u * c[i + 1][1]]);
    c = nx;
  }
  return c[0];
}
function sampleBez(P, M) { const o = []; for (let i = 0; i <= M; i++) o.push(bezPt(P, i / M)); return o; }

/* ----------------------------- convex hull ------------------------------ */
// Andrew's monotone chain — the true convex hull (CCW), the region a Bézier is
// guaranteed to stay inside.
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
function drawHull(pts, col) {
  if (pts.length < 3) return;
  const ch = convexHull(pts);
  if (ch.length < 3) return;                                  // collinear -> no area
  polyPath(ch); g.closePath(); g.fillStyle = rgb(col, .10); g.fill();
  g.strokeStyle = rgb(col, .45); g.setLineDash([5, 4]); g.lineWidth = 1.3; g.stroke(); g.setLineDash([]);
}

/* -------------------- subdivision & C0 / C1 continuity ------------------ */
// The two de Casteljau edges at t: left piece P0..C(t), right piece C(t)..Pn.
function subdivide(t) {
  const lv = levels(t), n = S.pts.length - 1;
  const left = [], right = [];
  for (let k = 0; k <= n; k++) left.push(lv[k][0]);                       // left edge   P0..C(t)
  for (let k = n; k >= 0; k--) right.push(lv[k][lv[k].length - 1]);       // right edge  C(t)..Pn
  return { left, right };
}
// COMMIT the split at the current t: replace the single curve by the two pieces,
// stored as one array with the join shared at index S.split. Afterwards the
// split is FIXED — moving t only slides the two evaluation points.
function commitSubdivide() {
  if (S.split >= 0 || S.pts.length < 2) return;
  const deg = S.pts.length - 1;
  const { left, right } = subdivide(S.t);
  S.pts = left.concat(right.slice(1));        // share the join point (left[n] === right[0])
  S.split = deg;                              // left = pts[0..split], right = pts[split..end]
  S.sel = -1; S.trail.length = 0;
  fitToPoints(); syncSubUI();
}
// Reverse the split: treat all points as one (higher-degree) curve.
function mergeCurves() {
  if (S.split < 0) return;
  S.split = -1; S.sel = -1; S.trail.length = 0;
  fitToPoints(); syncSubUI();
}
const subdivided = () => S.split >= 0;
function leftCurve() { return S.pts.slice(0, S.split + 1); }
function rightCurve() { return S.pts.slice(S.split); }
function degLeft() { return S.split; }
function degRight() { return S.pts.length - 1 - S.split; }
// C1 coupling is meaningful only when both pieces share the join AND have equal
// degree (true right after a split; may differ after asymmetric edits).
function c1OK() { return subdivided() && S.chkC1 && degLeft() === degRight() && degLeft() >= 1; }

// Enforce continuity constraints after dragging point i of a subdivided curve.
//   • C0 (join, index S.split) is ALWAYS shared — moving it updates both pieces.
//   • Under C1 the two points either side of the join are mirror images across
//     it, so dragging one snaps the other; dragging the join translates both.
//   • With C1 off, the adjacent points move freely.
function applyConstraint(i) {
  if (!subdivided()) return;
  const s = S.split;
  if (i === s) {                                        // shared C0 point
    if (c1OK() && drag && drag.old) {
      const dx = S.pts[s][0] - drag.old[0], dy = S.pts[s][1] - drag.old[1];
      S.pts[s - 1][0] += dx; S.pts[s - 1][1] += dy;
      S.pts[s + 1][0] += dx; S.pts[s + 1][1] += dy;
      drag.old = [S.pts[s][0], S.pts[s][1]];
    }
    return;
  }
  if (!c1OK()) return;
  if (i === s - 1) { S.pts[s + 1][0] = 2 * S.pts[s][0] - S.pts[s - 1][0]; S.pts[s + 1][1] = 2 * S.pts[s][1] - S.pts[s - 1][1]; }
  else if (i === s + 1) { S.pts[s - 1][0] = 2 * S.pts[s][0] - S.pts[s + 1][0]; S.pts[s - 1][1] = 2 * S.pts[s][1] - S.pts[s + 1][1]; }
}

/* ------------------------------ colors ---------------------------------- */
const CURVE = [110, 231, 255], NET = [96, 128, 196];
const SUB_L = [56, 214, 122], SUB_R = [247, 92, 168], JOIN = [255, 224, 138];

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

function render() {
  const { w, h, dpr } = fitCanvas();
  g.clearRect(0, 0, w, h);
  g.lineJoin = g.lineCap = 'round';
  drawGrid();
  const sub = subdivided();

  // trace of C(t) as t sweeps (single-curve mode only)
  if (!sub && S.chkTrace && S.trail.length > 1) {
    g.setLineDash([]);
    for (let i = 1; i < S.trail.length; i++) {
      const A = toS(S.trail[i - 1]), B = toS(S.trail[i]);
      g.strokeStyle = 'rgba(110,231,255,.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    }
  }

  // curve: two committed pieces (green / magenta) once split, else the single curve
  if (S.chkCurve) {
    if (sub) {
      strokePoly(sampleBez(leftCurve(), 200), rgb(SUB_L, .95), 2.6);
      strokePoly(sampleBez(rightCurve(), 200), rgb(SUB_R, .95), 2.6);
    } else {
      strokePoly(sampleCurve(200), rgb(CURVE, .95), 2.6);
    }
  }

  // convex hull (per piece when split, one hull otherwise)
  if (S.chkHull) {
    if (sub) { drawHull(leftCurve(), SUB_L); drawHull(rightCurve(), SUB_R); }
    else drawHull(S.pts, [183, 148, 246]);
  }

  // control nets
  if (S.chkNet) {
    if (sub) { strokePoly(leftCurve(), rgb(SUB_L, .4), 1.3); strokePoly(rightCurve(), rgb(SUB_R, .4), 1.3); }
    else strokePoly(S.pts, rgb(NET, .55), 1.6);
  }

  // evaluation points
  if (sub) {
    // each piece's own evaluation of t — these slide along the FIXED pieces; the
    // join point itself does not move when t changes.
    const [lx, ly] = toS(bezPt(leftCurve(), S.t));
    const [rx, ry] = toS(bezPt(rightCurve(), S.t));
    dot(lx, ly, 6, true, rgb(SUB_L, 1), 'rgba(255,255,255,.9)');
    dot(rx, ry, 6, true, rgb(SUB_R, 1), 'rgba(255,255,255,.9)');
  } else {
    // pre-split: the point where the split will occur
    const [cx, cy] = toS(curvePoint(S.t));
    dot(cx, cy, 6, true, rgb(CURVE, 1), 'rgba(255,255,255,.8)');
  }

  // control points (drawn on top). When split, the shared join (C0) is drawn
  // larger with a ring so it is clear it belongs to BOTH pieces.
  for (let i = 0; i < S.pts.length; i++) {
    const [x, y] = toS(S.pts[i]);
    const sel = i === S.sel;
    const shared = sub && i === S.split;
    const r = shared ? 8 : (sel ? 7 : 6);
    const fill = shared ? rgb(JOIN, 1) : (sel ? '#fff' : 'rgba(220,232,255,.92)');
    const ring = shared ? 'rgba(255,224,138,.95)' : (sel ? 'rgba(110,231,255,.95)' : 'rgba(20,28,50,.8)');
    dot(x, y, r, true, fill, ring);
  }

  // labels
  if (S.chkLabels) {
    g.font = `${11 * dpr}px ui-monospace, monospace`;
    for (let i = 0; i < S.pts.length; i++) {
      const [x, y] = toS(S.pts[i]);
      if (sub && i === S.split) { g.fillStyle = rgb(JOIN, 1); g.fillText('C0 (shared)', x + 9, y - 9); continue; }
      g.fillStyle = 'rgba(220,232,255,.85)';
      g.fillText(`P${i}`, x + 8, y - 8);
    }
    if (sub) {
      const [lx, ly] = toS(bezPt(leftCurve(), S.t));
      const [rx, ry] = toS(bezPt(rightCurve(), S.t));
      g.fillStyle = rgb(SUB_L, 1); g.fillText('C_L(t)', lx + 9, ly + 13);
      g.fillStyle = rgb(SUB_R, 1); g.fillText('C_R(t)', rx + 9, ry + 13);
    } else {
      const [cx, cy] = toS(curvePoint(S.t));
      g.fillStyle = rgb(CURVE, 1); g.fillText('join →', cx + 9, cy + 13);
    }
  }
}

/* ------------------------------ status ---------------------------------- */
function status() {
  const n = S.pts.length - 1;
  let body, extra = '';
  if (subdivided()) {
    const dl = degLeft(), dr = degRight();
    const pl = bezPt(leftCurve(), S.t), pr = bezPt(rightCurve(), S.t);
    body = `<span class="k">2 pieces</span> · <span class="k">left</span> deg ${dl} · <span class="k">right</span> deg ${dr} &nbsp;·&nbsp; ` +
           `<span class="k">t</span> ${S.t.toFixed(3)} (slides eval pts only) &nbsp;·&nbsp; ` +
           `<span style="color:${rgb(SUB_L, 1)}">C_L=(${pl[0].toFixed(2)}, ${pl[1].toFixed(2)})</span> · ` +
           `<span style="color:${rgb(SUB_R, 1)}">C_R=(${pr[0].toFixed(2)}, ${pr[1].toFixed(2)})</span>`;
    extra = ` &nbsp;·&nbsp; <span class="k">C0</span> shared join = (${S.pts[S.split][0].toFixed(2)}, ${S.pts[S.split][1].toFixed(2)}) · <span class="k">C1</span> ${S.chkC1 ? 'ON (tangent-coupled)' : 'off (free)'}`;
  } else {
    const p = curvePoint(S.t);
    body = `<span class="k">degree</span> ${n} &nbsp;·&nbsp; <span class="k">control pts</span> ${S.pts.length} &nbsp;·&nbsp; ` +
           `<span class="k">t</span> ${S.t.toFixed(3)} — set it, then <b>Split here</b> at <span class="k">C(t)</span> = (${p[0].toFixed(2)}, ${p[1].toFixed(2)})`;
  }
  $('status').innerHTML = body + extra;
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
  drag = { i: hit, start: sp, moved: false, old: hit >= 0 ? S.pts[hit].slice() : null };
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
  if (drag.i >= 0) {
    S.pts[drag.i] = clampToWorld(sp[0], sp[1]);
    applyConstraint(drag.i);
    ensureVisible(S.pts[drag.i]);
    if (c1OK()) {                                     // keep any coupled neighbour on screen
      const s = S.split;
      if (drag.i === s) { ensureVisible(S.pts[s - 1]); ensureVisible(S.pts[s + 1]); }
      else if (drag.i === s - 1) ensureVisible(S.pts[s + 1]);
      else if (drag.i === s + 1) ensureVisible(S.pts[s - 1]);
    }
  }
});
cv.addEventListener('pointerup', e => {
  if (pan) { pan = null; return; }
  if (!drag) return;
  if (drag.i < 0 && !drag.moved) addPoint(pointerSp(e));   // click empty space to add a point
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
  const wasSub = subdivided();
  S.pts.splice(idx, 0, p);
  if (wasSub && idx <= S.split) S.split++;        // inserting before the join shifts it
  S.sel = idx; S.trail.length = 0;
  fitToPoints(); syncSubUI();
}
function removePoint() {
  if (S.pts.length <= 2) return;
  let i = S.sel >= 0 ? S.sel : S.pts.length - 1;
  const wasSub = subdivided();
  if (wasSub && i === S.split) return;            // never remove the shared join point
  if (wasSub) {                                   // each piece must keep >= 2 control points
    const newSplit = i < S.split ? S.split - 1 : S.split;
    if (newSplit + 1 < 2 || (S.pts.length - 1) - newSplit < 2) return;
  }
  S.pts.splice(i, 1);
  if (wasSub && i < S.split) S.split--;
  S.sel = clamp(i, 0, S.pts.length - 1);
  S.trail.length = 0;
  fitToPoints(); syncSubUI();
}

/* ============================== UI WIRING ------------------------------- */
const sel = $('sel');
for (const pr of PRESETS) { const o = document.createElement('option'); o.value = pr.id; o.textContent = pr.name; sel.appendChild(o); }

function loadPreset(pr) {
  S.preset = pr;
  S.pts = pr.pts.map(p => [p[0], p[1]]);
  S.sel = -1; S.trail.length = 0;
  S.split = -1; S.chkC1 = false;
  $('desc').innerHTML = pr.desc;
  fitToPoints(); syncSubUI();
}
sel.addEventListener('change', () => loadPreset(PRESETS.find(p => p.id === sel.value)));
// display toggles: bind each checkbox to its S.* flag
for (const [id, key] of [['chkNet', 'chkNet'], ['chkCurve', 'chkCurve'], ['chkHull', 'chkHull'], ['chkTrace', 'chkTrace'], ['chkLabels', 'chkLabels']])
  $(id).addEventListener('change', e => { S[key] = e.target.checked; });
$('btnAdd').addEventListener('click', () => addPoint(null));
$('btnRemove').addEventListener('click', removePoint);
$('btnClear').addEventListener('click', () => loadPreset(S.preset));

const rngT = $('rngT'), lblT = $('lblT');
rngT.addEventListener('input', () => { S.t = +rngT.value; lblT.textContent = (+rngT.value).toFixed(3); if (!subdivided()) S.trail.length = 0; });
$('rngSpeed').addEventListener('input', e => S.speed = +e.target.value);

const btnPlay = $('btnPlay');
const togglePlay = () => { S.playing = !S.playing; btnPlay.textContent = S.playing ? '⏸ pause' : '▶ play'; if (S.playing) S.trail.length = 0; };
btnPlay.addEventListener('click', togglePlay);

/* Subdivision commit / merge */
$('btnSubdivide').addEventListener('click', () => commitSubdivide());
$('btnMerge').addEventListener('click', () => mergeCurves());

/* C1 toggle: when switched on, snap the right tangent handle to the mirror of
   the left so the joint is immediately C1. */
$('chkC1').addEventListener('change', e => {
  S.chkC1 = e.target.checked;
  if (S.chkC1 && subdivided() && degLeft() === degRight() && degLeft() >= 1) {
    const s = S.split;
    S.pts[s + 1] = [2 * S.pts[s][0] - S.pts[s - 1][0], 2 * S.pts[s][1] - S.pts[s - 1][1]];
    ensureVisible(S.pts[s + 1]);
  }
});

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

/* Enable/disable the split-only controls; C1 / Merge live only once subdivided. */
function syncSubUI() {
  const sub = subdivided();
  $('chkC1').disabled = !sub;
  $('chkC1').checked = sub && S.chkC1;
  $('btnMerge').disabled = !sub;
  $('btnSubdivide').disabled = sub;
  if (!sub) S.chkC1 = false;
}

/* =============================== MAIN LOOP ------------------------------ */
let prev = null;
function frame(now) {
  if (prev === null) prev = now;
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (S.playing) {
    S.t += (1 / 4.5) * dt * S.speed;
    if (S.t >= 1) { S.t -= 1; S.trail.length = 0; }
    else if (!subdivided()) { const p = curvePoint(S.t); S.trail.push(p); if (S.trail.length > 2000) S.trail.shift(); }
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
