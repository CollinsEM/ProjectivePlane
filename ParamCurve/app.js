'use strict';
/* =========================================================================
   Projective Plane Explorer
   3D homogeneous space R^3 (x, y, w)  --project through O-->  RP^2 chart
   Chart coords:  u = x/w,  v = y/w   (the plane w = 1).
   Points with w < 0 are charted through their antipode -p (same [p]).
   ========================================================================= */

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ----------------------------- presets -------------------------------- */
// basis of a plane through the origin with given normal (for "projective line")
function planeBasis(n) {
  const t = [0, 0, 1];
  const cr = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const nrm = v => { const l = Math.hypot(...v); return [v[0]/l, v[1]/l, v[2]/l]; };
  const a = nrm(cr(n, t));
  const b = nrm(cr(n, a));
  return [a, b];
}
const [PLa, PLb] = planeBasis([0.5, -0.55, 1.0]);

const PRESETS = [
  { id: 'point', name: 'Line through O  →  a projective point',
    desc: 'A whole <b>line through the origin</b> of homogeneous space collapses to a <b>single point</b> of ℝP²: '
        + 'every sample is a scalar multiple λ·(x,y,w), i.e. the same homogeneous triple [x : y : w]. '
        + 'In the chart you see just one dot, [0.9 : 0.55 : 0.75] ↦ (1.20, 0.73).',
    t0: -1.7, t1: 1.7,
    f: t => [0.9*t, 0.55*t, 0.75*t] },

  { id: 'pline', name: 'Plane through O  →  a projective line',
    desc: 'A <b>plane through the origin</b> is a projective line. Its cone is the plane itself, which slices the chart '
        + 'plane w = 1 in an ordinary straight line. Both ends of that line run off to infinity <b>in the same direction</b> '
        + 'and return from the antipodal one — in ℝP² a line is a <b>closed loop</b> (a circle ℝP¹) meeting ℓ∞ in one point.',
    t0: 0, t1: TAU,
    f: t => PLa.map((ai, i) => ai*Math.cos(t) + PLb[i]*Math.sin(t)) },

  { id: 'circle', name: 'Circle in the plane w = 1  →  circle',
    desc: 'The unit circle sitting directly in the chart plane w = 1: the projection cone cuts the plane in exactly that '
        + 'circle. Trivial here — but a model for the tilted versions below.',
    t0: 0, t1: TAU,
    f: t => [Math.cos(t), Math.sin(t), 1] },

  { id: 'ellipse', name: 'Tilted circle →  ellipse (a conic)',
    desc: 'A circle in the plane <b>w = 1 + 0.6·y</b>. Projecting through O turns it into a <b>conic</b> in the chart: '
        + 'the cone over the circle meets w = 1 in an <b>ellipse</b>. This is the projective birth of conic sections: '
        + 'they are all just "circles seen through the origin".',
    t0: 0, t1: TAU,
    f: t => [Math.cos(t), Math.sin(t), 1 + 0.6*Math.sin(t)] },

  { id: 'parabola', name: 'Critical tilt  →  parabola',
    desc: 'Circle in the plane <b>w = 1 + y</b>, which is <b>tangent to the horizon</b> w = 0 (the plane contains one '
        + 'direction). The image conic is tangent to the line at infinity at one point: a <b>parabola</b> '
        + 'v = (1 − u²)/2. Watch the curve touch ℓ∞ exactly once.',
    t0: 0, t1: TAU,
    f: t => [Math.cos(t), Math.sin(t), 1 + Math.sin(t)] },

  { id: 'hyperbola', name: 'Cutting the horizon  →  hyperbola = closed loop in ℝP²',
    desc: 'Circle in the plane <b>w = 1 + 1.5·y</b>, which <b>dips below the horizon</b> w = 0. Part of the 3D curve has '
        + 'w &lt; 0 and is charted through its antipode −p. The image is a <b>hyperbola</b> u² + v² = (1 − 1.5v)²: its two '
        + '"branches" are really <b>one closed curve</b> in ℝP², joining at two antipodal points of ℓ∞ that are the '
        + '<em>same</em> projective point. The 2D view shows paired ◂ / ▸ arrows where the curve crosses infinity.',
    t0: 0, t1: TAU,
    f: t => [Math.cos(t), Math.sin(t), 1 + 1.5*Math.sin(t)] },

  { id: 'twist', name: 'Twisted cubic  (1, t, t²)',
    desc: 'The <b>twisted cubic</b> p(t) = (1, t, t²): a genuinely 3D curve that lies in no plane. Its cone slices the '
        + 'chart plane in the parabola <b>u = v²</b> (since u = 1/t², v = 1/t). Two projective facts at once: '
        + 'p(0) = (1, 0, 0) sits <b>on the horizon</b> w = 0 — that is the parabola\'s single point at infinity [1 : 0 : 0]; '
        + 'and as t → ±∞ the direction of p tends to ±(0, 0, 1), one projective point, so the closure in ℝP² is a loop '
        + 'that also passes through the chart origin (0, 0).',
    t0: -4, t1: 4,
    f: t => [1, t, t*t] },

  { id: 'spiral', name: 'Spherical spiral (curve on S²)',
    desc: 'A spiral running over the unit sphere of directions: polar angle φ sweeps from w ≈ +0.995 down to w ≈ −0.995 '
        + 'while making 3.5 turns around the w-axis. The half-integer number of turns makes the two endpoints exactly '
        + '<b>antipodal</b> — the <b>same</b> point of ℝP² — so the image is a <b>closed loop</b>: the charted radius '
        + 'tan φ blows up as the curve crosses the horizon w = 0, jumps through infinity, and keeps winding on the '
        + 'antipodal side (dashed in 3D, paired ◂ ○ markers in 2D).',
    t0: 0, t1: 1,
    f: t => { const phi = 0.1 + (Math.PI - 0.2) * t, th = 7 * Math.PI * t;
              return [Math.sin(phi) * Math.cos(th), Math.sin(phi) * Math.sin(th), Math.cos(phi)]; } },

  { id: 'viviani', name: "Viviani's curve on S²",
    desc: "Viviani's curve: intersection of the unit sphere with the cylinder x² + y² = x, parametrized "
        + "p(t) = (1+cos t, sin t, 2·sin(t/2))·½, t ∈ [0, 4π]. On S² it pinches at the poles ±(0,0,1) — which are "
        + "<b>antipodal</b>, hence <b>one</b> projective point: in the chart the image crosses itself there. It also meets "
        + "the horizon at t = 0, 2π, 4π (the direction (1,0,0)), so the charted curve shoots off to infinity at the same "
        + "point of ℓ∞ three times.",
    t0: 0.004, t1: TAU*2,
    f: t => [0.5*(1+Math.cos(t)), 0.5*Math.sin(t), Math.sin(t/2)] },

  { id: 'rbez', name: 'Rational Bézier curve (homogeneous control points)',
    desc: 'Rational Bézier curves are exactly what this app is about. Enter control points as <b>x y [weight]</b>; '
        + 'each lifts to the homogeneous point Ĥᵢ = (wᵢxᵢ, wᵢyᵢ, wᵢ). In homogeneous space the Bézier curve through '
        + 'those lifted points is an ordinary <b>polynomial</b> Bézier curve (amber control polygon, left); '
        + 'its projection through O onto w = 1 is the classic rational Bézier C(t) = Σ BᵢwᵢPᵢ ÷ Σ Bᵢwᵢ, drawn in the '
        + 'chart. Default: the iconic quarter <b>circle</b> — control points (1,0), (1,1), (0,1), weights 1, √2/2, 1. '
        + 'Note w(t) is itself a Bézier curve of the weights, so with <b>all weights positive it never reaches the '
        + 'horizon</b> — that is the convex-hull property, projectively. Try weight <b>−1</b>: the curve touches ℓ∞ '
        + 'exactly once (a parabolic segment, like the critical-tilt circle above); weight <b>−2</b>: it crosses '
        + 'w = 0 twice and re-enters through the antipodal point of ℓ∞. '
        + 'The <b>order</b> field chooses how many of the entered control points are used (degree = order − 1); if '
        + 'fewer points are entered than the order, all entered points are used. Weights all 1 = plain polynomial Bézier.',
    t0: 0, t1: 1,
    f: null },

  { id: 'custom', name: 'Custom curve  x(t), y(t), w(t)',
    desc: 'Type any expressions in t (sin, cos, tan, sqrt, abs, exp, log, pow, PI, TAU allowed). The curve is sampled in '
        + 'homogeneous space and projected exactly like the presets. Try e.g. w = t (a plane through O → line), '
        + 'or w = 1 + 1.2*cos(t) to play with hyperbolas.',
    t0: 0, t1: TAU,
    f: null },
];

/* ------------------------------ state --------------------------------- */
const S = {
  preset: PRESETS[0],
  f: PRESETS[0].f,
  t0: PRESETS[0].t0, t1: PRESETS[0].t1,
  N: 1400,
  ts: [], pts: [], us: [], vs: [],
  t: 0, playing: false, speed: 1,
  yaw: 0.9, pitch: 0.42, zoom3: 1, ext: 3.4,
  u0: 0, v0: 0, win: 4.4,
};

/* --------------------------- canvases ---------------------------------- */
const cv3 = $('c3'), ctx3 = cv3.getContext('2d');
const cv2 = $('c2'), ctx2 = cv2.getContext('2d');

function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  const w = Math.max(64, Math.round(r.width * dpr));
  const h = Math.max(64, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { w: cv.width, h: cv.height, dpr };
}

/* ------------------------- sampling / charting ------------------------- */
function resample() {
  const { f, t0, t1 } = S;
  S.ts.length = S.pts.length = S.us.length = S.vs.length = 0;
  let rmax = 1, rad = [];
  for (let i = 0; i <= S.N; i++) {
    const t = t0 + (t1 - t0) * i / S.N;
    let p;
    try { p = f(t); } catch (e) { p = [NaN, NaN, NaN]; }
    if (!p || !isFinite(p[0]) || !isFinite(p[1]) || !isFinite(p[2])) p = [NaN, NaN, NaN];
    S.ts.push(t); S.pts.push(p);
    const [x, y, w] = p;
    S.us.push(isFinite(w) ? x / w : NaN);
    S.vs.push(isFinite(w) ? y / w : NaN);
    rmax = Math.max(rmax, isFinite(x) ? Math.max(Math.abs(x), Math.abs(y), Math.abs(w)) : rmax);
    if (isFinite(w) && w !== 0) {
      const r = Math.hypot(x / w, y / w);
      if (isFinite(r) && r < 1e4) rad.push(r);
    }
  }
  S.ext = clamp(Math.ceil(rmax * 1.12), 3.4, 14);
  // fit the chart window to the 93rd percentile of chart radii
  rad.sort((a, b) => a - b);
  const p = rad.length ? rad[Math.floor(rad.length * 0.93)] : 3;
  S.win = clamp(p * 1.15, 2.6, 12);
  S.u0 = 0; S.v0 = 0;
}

/* ------------------------------ colors --------------------------------- */
const tnOf = t => (t - S.t0) / (S.t1 - S.t0);
const colOf = (t, l = 62, s = 88) => `hsl(${Math.round((tnOf(t) * 300 + 10) % 360)} ${s}% ${l}%)`;
const GRAY = '#4a5573';

/* =========================== 3D RENDERER ================================ */
function proj3(x, y, w, W, H, k) {
  const cy_ = Math.cos(S.yaw), sy_ = Math.sin(S.yaw);
  const x1 = x * cy_ - y * sy_;
  const y1 = x * sy_ + y * cy_;
  const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
  const depth = y1 * cp - w * sp;
  const up = y1 * sp + w * cp;
  return { sx: W / 2 + x1 * k, sy: H / 2 - up * k + H * 0.09, d: depth };
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / p;
  return p * (r >= 5 ? 5 : r >= 2 ? 2 : 1);
}

function render3(now) {
  const { w: W, h: H } = fitCanvas(cv3);
  const g = ctx3;
  g.clearRect(0, 0, W, H);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const E = S.ext;
  const k = (0.36 * Math.min(W, H) / Math.max(E * 0.72, 1.5)) * S.zoom3;
  const P = (p) => proj3(p[0], p[1], p[2], W, H, k);
  const seg = (a, b, col, lw, dash) => {
    g.strokeStyle = col; g.lineWidth = lw;
    g.setLineDash(dash || []);
    const A = P(a), B = P(b);
    g.beginPath(); g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.stroke();
    g.setLineDash([]);
  };
  const poly = (pts, col, lw, dash, skipBad) => {
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); let pen = false;
    for (const q of pts) {
      if (skipBad && !isFinite(q[0])) { pen = false; continue; }
      const A = P(q);
      if (!pen) { g.moveTo(A.sx, A.sy); pen = true; } else g.lineTo(A.sx, A.sy);
    }
    g.stroke(); g.setLineDash([]);
  };

  /* ---- sphere of directions S² ---- */
  if ($('chkSphere').checked) {
    const circ = pts => poly(pts, 'rgba(140,160,220,0.10)', 1.2 * S.zoom3);
    for (const lat of [0, 0.5, -0.5, 0.866, -0.866]) {
      const r = Math.sqrt(1 - lat * lat), pts = [];
      for (let i = 0; i <= 64; i++) { const a = TAU * i / 64; pts.push([r * Math.cos(a), r * Math.sin(a), lat]); }
      circ(pts);
    }
    for (let m = 0; m < 6; m++) {
      const a = m * Math.PI / 6, pts = [];
      for (let i = 0; i <= 64; i++) { const s = TAU * i / 64;
        pts.push([Math.cos(s) * Math.cos(a), Math.cos(s) * Math.sin(a), Math.sin(s)]); }
      circ(pts);
    }
  }

  /* ---- horizon plane w = 0 ---- */
  if ($('chkHoriz').checked) {
    g.fillStyle = 'rgba(255,90,105,0.045)';
    const c = [[-E,-E,0],[E,-E,0],[E,E,0],[-E,E,0]].map(P);
    g.beginPath(); g.moveTo(c[0].sx, c[0].sy);
    for (let i = 1; i < 4; i++) g.lineTo(c[i].sx, c[i].sy);
    g.closePath(); g.fill();
    const st = niceStep(E / 5);
    for (let i = -E; i <= E + 1e-9; i += st)
      seg([i, -E, 0], [i, E, 0], 'rgba(255,110,125,0.07)', 1),
      seg([-E, i, 0], [E, i, 0], 'rgba(255,110,125,0.07)', 1);
    poly(c, 'rgba(255,110,125,0.28)', 1.4, [6, 5]);
    const lp = P([-E * 0.25, -E, 0]);
    label(g, lp.sx, lp.sy + 16, 'horizon  w = 0', 'rgba(255,140,150,.75)');
  }

  /* ---- chart plane w = 1 ---- */
  if ($('chkPlane').checked) {
    g.fillStyle = 'rgba(110,231,255,0.05)';
    const c = [[-E,-E,1],[E,-E,1],[E,E,1],[-E,E,1]].map(P);
    g.beginPath(); g.moveTo(c[0].sx, c[0].sy);
    for (let i = 1; i < 4; i++) g.lineTo(c[i].sx, c[i].sy);
    g.closePath(); g.fill();
    const st = niceStep(E / 6);
    for (let i = -E; i <= E + 1e-9; i += st)
      seg([i, -E, 1], [i, E, 1], 'rgba(110,231,255,0.10)', 1),
      seg([-E, i, 1], [E, i, 1], 'rgba(110,231,255,0.10)', 1);
    seg([0, -E, 1], [0, E, 1], 'rgba(110,231,255,0.22)', 1.4);
    seg([-E, 0, 1], [E, 0, 1], 'rgba(110,231,255,0.22)', 1.4);
    poly(c, 'rgba(110,231,255,0.35)', 1.5);
    const lp = P([-E * 0.05, -E, 1]);
    label(g, lp.sx - 30, lp.sy - 8, 'chart plane  w = 1', 'rgba(110,231,255,.8)');
  }

  /* ---- projection cone (rays O→curve) ---- */
  if ($('chkCone').checked) {
    g.strokeStyle = 'rgba(130,210,255,0.15)'; g.lineWidth = 1 * S.zoom3;
    g.beginPath();
    for (let i = 0; i <= S.N; i += Math.max(1, Math.floor(S.N / 110))) {
      const p = S.pts[i]; if (!isFinite(p[0])) continue;
      const A = P([0, 0, 0]), B = P(p);
      g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy);
    }
    g.stroke();
  }

  /* ---- axes ---- */
  const ax = E * 1.06;
  seg([-ax, 0, 0], [ax, 0, 0], 'rgba(255,107,129,0.55)', 1.4);
  seg([0, -ax, 0], [0, ax, 0], 'rgba(255,209,102,0.55)', 1.4);
  seg([0, 0, -ax], [0, 0, ax], 'rgba(110,231,255,0.55)', 1.4);
  let q;
  q = P([ax, 0, 0]); label(g, q.sx + 6, q.sy, 'x', '#ff6b81');
  q = P([0, ax, 0]); label(g, q.sx + 6, q.sy, 'y', '#ffd166');
  q = P([0, 0, ax]); label(g, q.sx + 6, q.sy, 'w', '#6ee7ff');

  /* ---- curve on S² (double cover model) ---- */
  if ($('chkSphereModel').checked) {
    const nrm = sgn => { const a = []; for (let i = 0; i <= S.N; i++) {
        const p = S.pts[i]; const L = Math.hypot(p[0], p[1], p[2]);
        a.push(L > 1e-12 ? [sgn*p[0]/L, sgn*p[1]/L, sgn*p[2]/L] : [NaN, NaN, NaN]); } return a; };
    poly(nrm(1), 'rgba(183,148,246,0.8)', 1.8 * S.zoom3, null, true);
    poly(nrm(-1), 'rgba(183,148,246,0.35)', 1.8 * S.zoom3, [4, 4], true);
  }

  /* ---- trace of the projection drawn on the plane w = 1 ---- */
  if ($('chkPlane').checked) {
    const onPlane = sgn => { const a = []; for (let i = 0; i <= S.N; i++) {
        const u = S.us[i], v = S.vs[i];
        const ok = (sgn > 0 ? S.pts[i][2] > 1e-9 : S.pts[i][2] < -1e-9) &&
                    Math.abs(u) <= E * 1.05 && Math.abs(v) <= E * 1.05;
        a.push(ok ? [u, v, 1] : [NaN, NaN, NaN]); } return a; };
    poly(onPlane(1), 'rgba(160,255,210,0.5)', 2 * S.zoom3, null, true);
    poly(onPlane(-1), 'rgba(160,255,210,0.28)', 2 * S.zoom3, [5, 4], true);
  }

  /* ---- rational Bézier: homogeneous control polygon ---- */
  if (S.preset.id === 'rbez' && RBEZ.length > 1) {
    poly(RBEZ, 'rgba(255,209,102,0.55)', 1.5 * S.zoom3, [6, 4]);
    for (let k = 0; k < RBEZ.length; k++) {
      const M = P(RBEZ[k]);
      dot(g, M.sx, M.sy, 4.5, false, 'rgba(255,209,102,0.9)');
      label(g, M.sx + 8, M.sy - 6, 'Ĥ' + k, 'rgba(255,209,102,0.85)');
    }
  }

  /* ---- the curve (gray = not yet traced, rainbow = traced) ---- */
  curveRainbow(g, P, lw => lw, true);

  /* ---- current point, antipode, ray, plane hit ---- */
  const p = currentP();
  if (p && isFinite(p[0])) {
    const O = P([0, 0, 0]), A = P(p);
    seg([0, 0, 0], p, 'rgba(255,255,255,0.5)', 1.5);
    if ($('chkAnti').checked) seg([0, 0, 0], [-p[0], -p[1], -p[2]], 'rgba(255,255,255,0.22)', 1.2, [4, 4]);
    if ($('chkAnti').checked) {
      const m = [-p[0], -p[1], -p[2]], M = P(m);
      dot(g, M.sx, M.sy, 5, false, colOf(S.t));
    }
    const pu = p[0] / p[2], pv = p[1] / p[2];   // where the ray hits the plane w = 1
    if (isFinite(pu) && isFinite(pv) && Math.abs(pu) <= E * 1.05 && Math.abs(pv) <= E * 1.05) {
      const h = P([pu, pv, 1]);
      dot(g, h.sx, h.sy, 4.5, true, '#a0ffd2');
    }
    dot(g, A.sx, A.sy, 6.5, true, colOf(S.t));
    label(g, A.sx + 10, A.sy - 8, 'p(t)', colOf(S.t, 75));
    if ($('chkAnti').checked) label(g, P([-p[0], -p[1], -p[2]]).sx + 9, P([-p[0], -p[1], -p[2]]).sy + 14, '−p(t)', 'rgba(183,148,246,.85)');
    dot(g, O.sx, O.sy, 4, true, '#ffffff');
    label(g, O.sx + 8, O.sy + 4, 'O', 'rgba(255,255,255,.75)');
  }
}

function curveRainbow(g, P, lwf, grayBase) {
  // gray pass
  if (grayBase) {
    g.strokeStyle = GRAY; g.lineWidth = lwf(2);
    g.beginPath(); let pen = false;
    for (let i = 0; i <= S.N; i++) {
      const p = S.pts[i];
      if (!isFinite(p[0]) || S.ts[i] <= S.t) { pen = false; continue; }
      const A = P(p);
      if (!pen) { g.moveTo(A.sx, A.sy); pen = true; } else g.lineTo(A.sx, A.sy);
    }
    g.stroke();
  }
  // rainbow pass (traced portion)
  g.lineWidth = lwf(2.8);
  for (let i = 1; i <= S.N; i++) {
    if (S.ts[i] > S.t) break;
    const a = S.pts[i - 1], b = S.pts[i];
    if (!isFinite(a[0]) || !isFinite(b[0])) continue;
    const A = P(a), B = P(b);
    g.strokeStyle = colOf(S.ts[i]);
    g.beginPath(); g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.stroke();
  }
}

function dot(g, x, y, r, fill, col) {
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  if (fill) { g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); }
  else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }
}
function label(g, x, y, txt, col) {
  const dpr = window.devicePixelRatio || 1;
  g.font = `${12 * dpr}px ui-monospace, monospace`;
  g.fillStyle = col; g.fillText(txt, x, y);
}

/* =========================== 2D RENDERER ================================ */
function render2(now) {
  const { w: W, h: H } = fitCanvas(cv2);
  const g = ctx2;
  g.clearRect(0, 0, W, H);
  const m = 12 * (W / 600);
  const s = (Math.min(W, H) - 2 * m) / (2 * S.win) * (W > H ? Math.min(1.9, W / H) : 1);
  const sx = u => W / 2 + (u - S.u0) * s;
  const sy = v => H / 2 - (v - S.v0) * s;
  const winX = (W / 2 - m) / s, winY = (H / 2 - m) / s;   // chart half-extents of the window
  const L = S.u0 - winX, R_ = S.u0 + winX, B = S.v0 - winY, T = S.v0 + winY;

  const inBox = (u, v) => u >= L && u <= R_ && v >= B && v <= T;

  /* grid */
  const st = niceStep(Math.max(winX, winY) / 8);
  for (let u = Math.ceil(L / st) * st; u <= R_; u += st) {
    g.strokeStyle = Math.abs(u) < st / 2 ? 'rgba(140,160,210,0.35)' : 'rgba(140,160,210,0.10)';
    g.lineWidth = Math.abs(u) < st / 2 ? 1.4 : 1;
    g.beginPath(); g.moveTo(sx(u), m); g.lineTo(sx(u), H - m); g.stroke();
  }
  for (let v = Math.ceil(B / st) * st; v <= T; v += st) {
    g.strokeStyle = Math.abs(v) < st / 2 ? 'rgba(140,160,210,0.35)' : 'rgba(140,160,210,0.10)';
    g.lineWidth = Math.abs(v) < st / 2 ? 1.4 : 1;
    g.beginPath(); g.moveTo(m, sy(v)); g.lineTo(W - m, sy(v)); g.stroke();
  }
  // grid labels along the axes (skip every other line when space gets tight)
  g.font = `${11 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(150,170,210,0.55)';
  let ls = st; while (ls * s < 46) ls += st;
  for (let u = Math.ceil(L / ls) * ls; u <= R_; u += ls)
    if (Math.abs(u) > ls / 2) g.fillText(fmt(u), sx(u) + 3, clamp(sy(0) + 13, m + 12, H - m - 2));
  for (let v = Math.ceil(B / ls) * ls; v <= T; v += ls)
    if (Math.abs(v) > ls / 2) g.fillText(fmt(v), clamp(sx(0) + 4, m + 2, W - m - 30), sy(v) - 3);

  /* the curve, clipped to the window */
  g.save();
  g.beginPath(); g.rect(m, m, W - 2 * m, H - 2 * m); g.clip();

  // rational Bézier: control polygon and poles in the chart
  if (S.preset.id === 'rbez' && RBEZ.length > 1) {
    g.setLineDash([6, 4]); g.strokeStyle = 'rgba(255,209,102,0.45)'; g.lineWidth = 1.5;
    g.beginPath(); let penP = false;
    for (const H of RBEZ) {
      if (Math.abs(H[2]) < 1e-12) { penP = false; continue; }   // pole at infinity
      const px = sx(H[0] / H[2]), py = sy(H[1] / H[2]);
      if (!penP) { g.moveTo(px, py); penP = true; } else g.lineTo(px, py);
    }
    g.stroke(); g.setLineDash([]);
    g.font = `${11 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
    RBEZ.forEach((H, k) => {
      if (Math.abs(H[2]) < 1e-12) return;
      const px = sx(H[0] / H[2]), py = sy(H[1] / H[2]);
      g.beginPath(); g.arc(px, py, 4, 0, TAU);
      g.strokeStyle = 'rgba(255,209,102,0.85)'; g.lineWidth = 1.8; g.stroke();
      g.fillStyle = 'rgba(255,209,102,0.85)';
      g.fillText('P' + k, px + 7, py - 6);
    });
  }

  // gray (untraced)
  g.strokeStyle = GRAY; g.lineWidth = 2;
  g.beginPath(); let pen = false;
  for (let i = 0; i <= S.N; i++) {
    const ok = isFinite(S.us[i]) && S.ts[i] > S.t && inBox(S.us[i], S.vs[i]) && !(i > 0 && isJump(i));
    if (!ok) { pen = false; continue; }
    if (!pen) { g.moveTo(sx(S.us[i]), sy(S.vs[i])); pen = true; }
    else g.lineTo(sx(S.us[i]), sy(S.vs[i]));
  }
  g.stroke();

  // rainbow (traced), clipped to the window; crossings of ℓ∞ get paired arrows
  g.lineWidth = 2.6;
  const far = Math.hypot(winX, winY) * 1.2;
  const marks = [];
  for (let i = 1; i <= S.N; i++) {
    if (S.ts[i] > S.t) break;
    const ua = S.us[i - 1], va = S.vs[i - 1], ub = S.us[i], vb = S.vs[i];
    if (!isFinite(ua) || !isFinite(ub)) continue;
    const jump = isJump(i) &&
        (Math.hypot(ua - S.u0, va - S.v0) > far || Math.hypot(ub - S.u0, vb - S.v0) > far);
    const cl = clipSeg(ua, va, ub, vb, L, R_, B, T);
    if (!cl) continue;
    const pa = [ua + (ub - ua) * cl[0], va + (vb - va) * cl[0]];
    const pb = [ua + (ub - ua) * cl[1], va + (vb - va) * cl[1]];
    g.strokeStyle = colOf(S.ts[i]);
    // skip corner-cutting chords whose both ends are off-screen (unless the curve
    // really passed through infinity here — then the chord hints at the transit)
    if (cl[1] > cl[0] + 1e-9 && (jump || cl[0] <= 1e-9 || cl[1] >= 1 - 1e-9)) {
      g.beginPath(); g.moveTo(sx(pa[0]), sy(pa[1])); g.lineTo(sx(pb[0]), sy(pb[1])); g.stroke();
    }
    if (!jump) continue;
    // the curve passed through w = 0 between these samples: remember the exit
    // (clipped boundary point) and the direction toward the far (off-screen) sample
    const far2 = Math.hypot(ua - S.u0, va - S.v0) > Math.hypot(ub - S.u0, vb - S.v0)
        ? { e: [ua, va], c: pa } : { e: [ub, vb], c: pb };
    marks.push({ E: far2.c, D: far2.e, col: colOf(S.ts[i], 68) });
  }
  // current point (and, for degenerate "single projective point" curves, a big pulsing target)
  const u = chartU(), v = chartV();
  if (isFinite(u) && isFinite(v)) {
    const x = sx(u), y = sy(v), pr = 8 + 3 * Math.sin(now / 240);
    if (S.preset.id === 'point') {
      g.beginPath(); g.arc(x, y, pr + 9, 0, TAU);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = 'rgba(230,240,255,0.9)';
      g.font = `bold ${13 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
      const txt = 'the whole 3D line → this one point';
      if (x > W * 0.5) { g.textAlign = 'right'; g.fillText(txt, x - 14, y - 16); g.textAlign = 'left'; }
      else g.fillText(txt, x + 14, y - 16);
    }
    g.beginPath(); g.arc(x, y, pr + 3, 0, TAU);
    g.strokeStyle = colOf(S.t, 70); g.lineWidth = 1.6; g.stroke();
    dot(g, x, y, 5.5, true, colOf(S.t));
    if (S.preset.id !== 'point') {
      g.font = `${12 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
      g.fillStyle = colOf(S.t, 78);
      g.fillText(`[p(t)] = (${fmt(u)}, ${fmt(v)})`, x + 11, y - 9);
    }
  }
  g.restore();

  /* line at infinity = window border */
  g.setLineDash([7, 5]);
  g.strokeStyle = 'rgba(255,120,135,0.8)'; g.lineWidth = 2;
  g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.setLineDash([]);

  /* ℓ∞-crossing markers, drawn outside the clip so the arrowheads stick out */
  for (const M of marks) infMark(g, M.E, M.D, { L, R: R_, B, T }, sx, sy, M.col);
  const dpr = window.devicePixelRatio || 1;
  g.font = `${12.5 * dpr}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(255,140,150,0.9)';
  g.fillText('line at infinity  ℓ∞ : w = 0', m + 8, m + 18 * dpr);
  g.fillStyle = 'rgba(110,231,255,0.75)';
  g.fillText('u →', W - m - 42, clamp(sy(0) - 6, m + 14, H - m));
  g.fillText('↑ v', clamp(sx(0) + 6, m, W - m - 24), m + 30);
  g.fillStyle = 'rgba(150,170,210,0.6)';
  g.fillText('antipodal boundary points are the same projective point', m + 8, H - m - 8);
}

/* the curve passes through the horizon w = 0 between samples i-1 and i */
function isJump(i) {
  return S.pts[i - 1][2] * S.pts[i][2] < 0;
}

/* Liang–Barsky clip of segment (u0,v0)-(u1,v1) to the box; returns [t0,t1] or null */
function clipSeg(u0, v0, u1, v1, L, R, B, T) {
  let t0 = 0, t1 = 1;
  const du = u1 - u0, dv = v1 - v0;
  const p = [-du, du, -dv, dv];
  const q = [u0 - L, R - u0, v0 - B, T - v0];
  for (let k = 0; k < 4; k++) {
    if (Math.abs(p[k]) < 1e-12) { if (q[k] < 0) return null; continue; }
    const r = q[k] / p[k];
    if (p[k] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else          { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}

/* Mark a crossing of ℓ∞: an arrow at the boundary point E and an open circle at the
   diametric point E' = 2c − E — the SAME projective point of the line at infinity,
   where the curve comes back in. */
function infMark(g, E, dirPt, box, sx, sy, col) {
  let dx = dirPt[0] - S.u0, dy = dirPt[1] - S.v0;
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const ex = sx(E[0]), ey = sy(E[1]);
  const nx = dx, ny = -dy, px = -ny, py = nx;   // screen-space normal & perpendicular
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(ex + nx * 11, ey + ny * 11);
  g.lineTo(ex - nx * 3 + px * 5.5, ey - ny * 3 + py * 5.5);
  g.lineTo(ex - nx * 3 - px * 5.5, ey - ny * 3 - py * 5.5);
  g.closePath(); g.fill();
  const ax = clamp(2 * S.u0 - E[0], box.L, box.R);
  const ay = clamp(2 * S.v0 - E[1], box.B, box.T);
  g.beginPath(); g.arc(sx(ax), sy(ay), 5, 0, TAU);
  g.strokeStyle = col; g.lineWidth = 2; g.stroke();
}

function fmt(x) {
  if (!isFinite(x)) return '∞';
  const a = Math.abs(x);
  if (a >= 1000) return x.toExponential(1);
  if (a >= 100) return x.toFixed(0);
  if (a >= 10) return x.toFixed(1).replace(/\.0$/, '');
  let r = x.toFixed(2).replace(/\.?0+$/, '');
  return r === '-0' || r === '' ? '0' : r;
}

/* ============================ status bar ================================ */
function status() {
  const p = currentP();
  if (!p || !isFinite(p[0])) { $('status').innerHTML = '<span class="k">curve undefined at this t</span>'; return; }
  const [x, y, w] = p;
  const u = chartU(), v = chartV();
  const wc = w >= 0 ? 'pos' : 'neg';
  const tag = Math.abs(w) < 1e-3
    ? '<span class="neg">w ≈ 0 → point is ON the line at infinity ℓ∞</span>'
    : w < 0
      ? '<span class="neg">w &lt; 0 → charted via antipode −p (same projective point)</span>'
      : '<span class="pos">w &gt; 0 → upper chart representative</span>';
  $('status').innerHTML =
    `<span class="k">t =</span> ${S.t.toFixed(3)} &nbsp; <span class="k">p(t) =</span> (${fmt(x)}, ${fmt(y)}, ` +
    `<span class="${wc}">${fmt(w)}</span>) &nbsp; <span class="k">→</span> [p] = ` +
    `[${fmt(x / w)} : ${fmt(y / w)} : ${fmt(1)}] &nbsp; <span class="k">↦</span> (u, v) = ` +
    `(${isFinite(u) ? fmt(u) : '∞'}, ${isFinite(v) ? fmt(v) : '∞'}) &nbsp;·&nbsp; ${tag}`;
}

/* ============================ sampling helpers =========================== */
function sampleAt(t) {
  const i = clamp(Math.round((t - S.t0) / (S.t1 - S.t0) * S.N), 0, S.N);
  return S.pts[i];
}
function currentP() { return sampleAt(S.t); }
function chartU() { const p = currentP(); return p ? x_(p) : NaN; }
function chartV() { const p = currentP(); return p ? y_(p) : NaN; }
const x_ = p => p[2] !== 0 ? p[0] / p[2] : NaN;
const y_ = p => p[2] !== 0 ? p[1] / p[2] : NaN;

/* ============================== UI wiring ================================ */
const sel = $('sel');
for (const pr of PRESETS) {
  const o = document.createElement('option');
  o.value = pr.id; o.textContent = pr.name;
  sel.appendChild(o);
}

function loadPreset(pr) {
  S.preset = pr;
  // toggle input panels first, so they stay editable even if parsing fails
  $('lblCustom').classList.toggle('show', pr.id === 'custom');
  $('lblRbez').classList.toggle('show', pr.id === 'rbez');
  if (pr.id === 'custom') {
    if (!applyCustom()) return;
  } else if (pr.id === 'rbez') {
    if (!applyRBezier()) return;
  } else {
    S.f = pr.f; S.t0 = pr.t0; S.t1 = pr.t1;
    $('desc').classList.remove('err');
    $('desc').innerHTML = pr.desc;
  }
  resample();
  S.t = S.t0;
  $('rngT').value = 0;
}

let RBEZ = [];   // homogeneous control points for the rbez preset: (w·x, w·y, w)

function parseRBezier(src) {
  const rows = String(src).split(/[;\n]+/).map(s => s.trim()).filter(s => s.length);
  if (rows.length < 2) throw new Error('enter at least 2 control points, one per line');
  if (rows.length > 12) throw new Error('keep it to 12 control points');
  return rows.map((r, k) => {
    const n = (r.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
    if (n.length < 2) throw new Error(`point ${k + 1}: expected "x y [weight]"`);
    if (n.length > 3) throw new Error(`point ${k + 1}: too many numbers`);
    if (!n.every(isFinite)) throw new Error(`point ${k + 1}: value not finite`);
    const w = n.length === 3 ? n[2] : 1;
    return [w * n[0], w * n[1], w];          // lift to homogeneous (w·x, w·y, w)
  });
}

/* de Casteljau on homogeneous control points — an ordinary polynomial Bézier in ℝ³ */
function bezierH(cp, t) {
  const a = cp.map(p => p.slice());
  for (let r = 1; r < a.length; r++)
    for (let i = 0; i < a.length - r; i++)
      for (let c = 0; c < 3; c++)
        a[i][c] = (1 - t) * a[i][c] + t * a[i + 1][c];
  return a[0];
}

function applyRBezier() {
  try {
    const cp = parseRBezier($('rbezPts').value);
    // order = number of control points actually used (degree = order − 1);
    // if order < number of entered points, only the leading `order` points are used
    const order = Math.max(2, Math.min(parseInt($('rbezOrder').value, 10) || 2, cp.length));
    cp.length = order;                       // truncate to the requested order
    RBEZ = cp;
    S.f = t => bezierH(RBEZ, clamp(t, 0, 1));
    S.t0 = 0; S.t1 = 1;
    $('desc').classList.remove('err');
    $('desc').innerHTML = PRESETS.find(p => p.id === 'rbez').desc;
    return true;
  } catch (e) {
    $('desc').classList.add('err');
    $('desc').textContent = 'Rational Bézier input error: ' + e.message;
    return false;
  }
}

function applyCustom() {
  const mk = (src, name) => {
    const body = `"use strict";const {sin,cos,tan,asin,acos,atan2,sinh,cosh,tanh,sqrt,abs,exp,log,pow,sign,floor,min,max}=Math,PI=Math.PI,TAU=Math.PI*2;return (${src});`;
    const fn = new Function('t', body);
    try { fn(0.7); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    return fn;
  };
  try {
    const fx = mk($('cx').value, 'x(t)'), fy = mk($('cy').value, 'y(t)'), fw = mk($('cw').value, 'w(t)');
    const t0 = parseFloat($('ct0').value) || 0, t1 = parseFloat($('ct1').value) || TAU;
    S.f = t => [fx(t), fy(t), fw(t)];
    S.t0 = t0; S.t1 = Math.max(t1, t0 + 1e-6);
    $('desc').classList.remove('err');
    $('desc').innerHTML = PRESETS.find(p => p.id === 'custom').desc;
    return true;
  } catch (e) {
    $('desc').classList.add('err');
    $('desc').textContent = 'Custom expression error: ' + e.message;
    return false;
  }
}

const qp = (window.location && window.location.search)
    ? new URLSearchParams(window.location.search).get('preset') : null;
const START = PRESETS.find(p => p.id === qp) || PRESETS[0];
sel.value = START.id;
sel.addEventListener('change', () => loadPreset(PRESETS.find(p => p.id === sel.value)));
$('btnApply').addEventListener('click', () => { loadPreset(PRESETS.find(p => p.id === 'custom')); });
$('btnRbez').addEventListener('click', () => { loadPreset(PRESETS.find(p => p.id === 'rbez')); });

const btnPlay = $('btnPlay');
const togglePlay = () => {
  S.playing = !S.playing;
  btnPlay.textContent = S.playing ? '⏸ pause' : '▶ play';
};
btnPlay.addEventListener('click', togglePlay);

/* Space = play/pause, but only when NOT editing a text field: a global
   space handler would swallow spaces typed into the rational Bézier / custom
   curve editors, so let form controls keep their native behavior. */
function isFormControl(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
  if (tag === 'INPUT') {
    const type = (el.type || '').toLowerCase();
    return ['text', 'search', 'url', 'email', 'tel', 'password', 'number',
            'range', 'checkbox', 'radio'].includes(type);
  }
  return false;
}
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  if (isFormControl(e.target)) return;   // typing in a field: don't hijack space
  e.preventDefault();                    // no page scroll / native space step
  togglePlay();
});
$('rngSpeed').addEventListener('input', e => S.speed = +e.target.value);
$('rngT').addEventListener('input', e => {
  S.playing = false; btnPlay.textContent = '▶ play';
  S.t = S.t0 + (S.t1 - S.t0) * +e.target.value;
});
/* --- 3D interaction --- */
function drag(cv, onMove) {
  let last = null;
  cv.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!last) return;
    onMove(e.clientX - last[0], e.clientY - last[1], e);
    last = [e.clientX, e.clientY];
  });
  cv.addEventListener('pointerup', () => last = null);
  cv.addEventListener('pointercancel', () => last = null);
}
drag(cv3, (dx, dy) => {
  S.yaw += dx * 0.008;
  S.pitch = clamp(S.pitch + dy * 0.006, -1.45, 1.45);
});
cv3.addEventListener('wheel', e => { e.preventDefault(); S.zoom3 = clamp(S.zoom3 * Math.exp(-e.deltaY * 0.001), 0.25, 5); }, { passive: false });

/* --- 2D interaction --- */
drag(cv2, (dx, dy, e) => {
  const r = cv2.getBoundingClientRect();
  const s = chartScale(r.width, r.height);
  S.u0 -= dx / s; S.v0 += dy / s;
});
cv2.addEventListener('wheel', e => {
  e.preventDefault();
  S.win = clamp(S.win * Math.exp(e.deltaY * 0.001), 0.4, 60);
}, { passive: false });
function chartScale(W, H) {
  const m = 12 * (W / 600);
  return (Math.min(W, H) - 2 * m) / (2 * S.win) * (W > H ? Math.min(1.9, W / H) : 1);
}

/* ============================== main loop ================================ */
let prev = null;
function frame(now) {
  if (prev === null) prev = now;
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  if (S.playing) {
    S.t += dt * S.speed * (S.t1 - S.t0) / 7;
    if (S.t > S.t1) S.t = S.t0;
    $('rngT').value = (S.t - S.t0) / (S.t1 - S.t0);
  }
  $('tval').textContent = S.t.toFixed(2);
  render3(now);
  render2(now);
  status();
  requestAnimationFrame(frame);
}

loadPreset(START);
const qGet = k => (window.location && window.location.search)
    ? new URLSearchParams(window.location.search).get(k) : null;
const pq = qGet('pts');
if (pq) {
  $('rbezPts').value = pq.replace(/;/g, '\n');
  loadPreset(PRESETS.find(p => p.id === 'rbez'));
}
const tq = qGet('t');
if (tq !== null) {
  const fr = parseFloat(tq);
  if (isFinite(fr)) { S.t = S.t0 + (S.t1 - S.t0) * clamp(fr, 0, 1); S.playing = false; btnPlay.textContent = '▶ play'; }
}
frame(0); // first paint synchronously; frame() schedules the rAF loop itself
