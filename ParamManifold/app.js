'use strict';
/* =========================================================================
   Projective Manifold Explorer
   A surface (u,v) -> (x,y,w) in 3D homogeneous space R^3  --project through O-->
   the 2D projective plane RP^2, drawn in the affine chart (a,b) = (x/w, y/w).
   Sign of w colours the surface:  w>0 teal (upper rep.), w<0 magenta (charted
   through the antipode -p, the SAME projective point); w=0 -> line at infinity.
   ========================================================================= */

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ----------------------------- vector math ------------------------------ */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = a => Math.hypot(a[0], a[1], a[2]);
const nrm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* ----------------------------- presets ---------------------------------- */
const PRESETS = [
  { id: 'flat', name: 'Flat patch  (w = 1)',
    desc: 'The baseline: a square grid sitting <b>directly in the chart plane w = 1</b>. Projecting through O is the '
        + 'identity here — the chart (a, b) = (x, y) is the patch itself. A model for the warped versions below: watch '
        + 'what each does to this plain square.',
    eval: (u, v) => { const s = 2 * u - 1, t = 2 * v - 1; return [s, t, 1]; } },

  { id: 'plane', name: 'Tilted plane  w = 1 + 1.4x',
    desc: 'A plane that <b>dips below the horizon</b> w = 0 along the line x = −1/1.4. On one side <span style="color:#7ee2e8">w &gt; 0</span> '
        + '(charts normally); past the line, <span style="color:#e078d0">w &lt; 0</span> and the patch is charted through its '
        + 'antipode. The w = 0 line maps to the line at infinity, so the chart region is bounded by a <b>projective line</b> — '
        + 'a straight edge of ℝP².',
    eval: (u, v) => { const s = 2 * u - 1, t = 2 * v - 1; return [s, t, 1 + 1.4 * s]; } },

  { id: 'sphere', name: 'Sphere  =  ℝP² (S²/±1)',
    desc: 'The unit sphere of directions in homogeneous ℝ³. Every line through O meets it in two <b>antipodal</b> points '
        + '±p — the <b>same</b> projective point — so ℝP² = S²/±1. Projecting through O is <b>gnomonic</b> projection: '
        + 'parallels (const w) chart to concentric circles, meridians to rays, and the equator w = 0 flies out to the line '
        + 'at infinity. Upper hemisphere is <span style="color:#7ee2e8">teal</span>, lower its <span style="color:#e078d0">magenta</span> '
        + 'antipode — and in the chart they land on <b>exactly the same grid</b>.',
    eval: (u, v) => { const phi = 0.2 + (Math.PI - 0.4) * u, lam = TAU * v;
                      return [Math.sin(phi) * Math.cos(lam), Math.sin(phi) * Math.sin(lam), Math.cos(phi)]; } },

  { id: 'disk', name: 'Bowl crossing the horizon  w = 1 − x² − y²',
    desc: 'The graph w = 1 − x² − y² over the square. Inside the unit circle <b>w &gt; 0</b> and the chart (a,b) = (x,y)/(1−r²) '
        + 'stretches the open disk out to the <b>whole</b> plane (a model of the projective disk). The circle r = 1 is where '
        + '<b>w = 0</b> — it runs off to the line at infinity. Outside the circle (the four corners) <b>w &lt; 0</b>: the patch '
        + 'flips through the antipode to the far side of the chart. One surface, all three regimes at once.',
    eval: (u, v) => { const s = 2 * u - 1, t = 2 * v - 1; return [s, t, 1 - s * s - t * t]; } },

  { id: 'custom', name: 'Custom surface  x(u,v), y(u,v), w(u,v)',
    desc: 'Type any expressions in u and v (sin, cos, tan, sqrt, abs, exp, log, pow, pi, tau, asin, atan2, sinh… allowed; '
        + 'pi = π). The default is the flat patch w = 1. Try a hemisphere via w = sqrt(max(0,1-x²-y²)), or make a surface '
        + 'cross the horizon with w = 1 − 2(x² + y²).',
    eval: null },
];

/* ------------------------------ state ----------------------------------- */
const S = {
  preset: PRESETS[0],
  eval: PRESETS[0].eval,
  u: .5, v: .5, playing: false, speed: 1,
  yaw: 0.85, pitch: 0.5, zoom3: 1, ext: 3.2,
  a0: 0, b0: 0, win: 3,
  N: 36, s: 37,
  g: [], ga: [], gb: [],
};

/* --------------------------- canvases ----------------------------------- */
const cv3 = $('c3'), ctx3 = cv3.getContext('2d');
const cv2 = $('c2'), ctx2 = cv2.getContext('2d');
const pbox = $('pbox');

function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  const w = Math.max(64, Math.round(r.width * dpr));
  const h = Math.max(64, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { w: cv.width, h: cv.height, dpr };
}

/* --------------------------- evaluation --------------------------------- */
function surf(u, v) {
  try { const p = S.eval(u, v);
        return (p && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) ? p : [NaN, NaN, NaN]; }
  catch (e) { return [NaN, NaN, NaN]; }
}
function resample() {
  const N = S.N, s = N + 1; S.s = s;
  S.g.length = 0; S.ga.length = 0; S.gb.length = 0;
  let rmax = 1, rad = [];
  for (let i = 0; i <= N; i++) { const u = i / N;
    for (let j = 0; j <= N; j++) { const v = j / N;
      const p = surf(u, v); S.g.push(p);
      const [x, y, w] = p;
      const a = (isFinite(w) && w !== 0) ? x / w : NaN;
      const b = (isFinite(w) && w !== 0) ? y / w : NaN;
      S.ga.push(a); S.gb.push(b);
      rmax = Math.max(rmax, isFinite(x) ? Math.max(Math.abs(x), Math.abs(y), Math.abs(w)) : rmax);
      if (isFinite(a) && isFinite(b)) { const r = Math.hypot(a, b); if (r < 1e4) rad.push(r); }
    }
  }
  S.ext = clamp(Math.ceil(rmax * 1.15), 2.4, 16);
  rad.sort((a, b) => a - b);
  const q = rad.length ? rad[Math.floor(rad.length * 0.88)] : 3;   // 88th pct of chart radii
  S.win = clamp(q * 1.25, 2.4, 24);
  S.a0 = 0; S.b0 = 0;
}
function chartA() { const p = surf(S.u, S.v); return (p && isFinite(p[0]) && p[2] !== 0) ? p[0] / p[2] : NaN; }
function chartB() { const p = surf(S.u, S.v); return (p && isFinite(p[1]) && p[2] !== 0) ? p[1] / p[2] : NaN; }
function setUV(u, v) { S.u = clamp(u, 0, 1); S.v = clamp(v, 0, 1); }

/* ------------------------------ colors ---------------------------------- */
const colLerp = (a, b, t) => `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;

/* =========================== 3D RENDERER ================================ */
function proj3(x, y, w, W, H, k) {
  const cy_ = Math.cos(S.yaw), sy_ = Math.sin(S.yaw);
  const x1 = x * cy_ - y * sy_, y1 = x * sy_ + y * cy_;
  const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
  const depth = y1 * cp - w * sp, up = y1 * sp + w * cp;
  return { sx: W / 2 + x1 * k, sy: H / 2 - up * k + H * 0.09, d: depth };
}
function forwardVec() {
  const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
  return [Math.sin(S.yaw) * cp, Math.cos(S.yaw) * cp, -sp];
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / p;
  return p * (r >= 5 ? 5 : r >= 2 ? 2 : 1);
}

function render3(now) {
  const { w: W, h: H } = fitCanvas(cv3);
  const g = ctx3; g.clearRect(0, 0, W, H);
  g.lineJoin = g.lineCap = 'round';
  const E = S.ext;
  const k = (0.36 * Math.min(W, H) / Math.max(E * .72, 1.5)) * S.zoom3;
  const P = p => proj3(p[0], p[1], p[2], W, H, k);
  const seg = (a, b, col, lw, dash) => {
    const A = P(a), B = P(b); g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.stroke(); g.setLineDash([]);
  };
  const poly3 = (pts, col, lw, dash, skipBad) => {
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); let pen = false;
    for (const q of pts) {
      if (skipBad && (!isFinite(q[0]) || !isFinite(q[1]) || !isFinite(q[2]))) { pen = false; continue; }
      const A = P(q); if (!pen) { g.moveTo(A.sx, A.sy); pen = true; } else g.lineTo(A.sx, A.sy);
    }
    g.stroke(); g.setLineDash([]);
  };
  const quad3 = (a, b, c, d, col) => {
    const A = P(a), B = P(b), C = P(c), D = P(d);
    g.fillStyle = col; g.beginPath();
    g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.lineTo(C.sx, C.sy); g.lineTo(D.sx, D.sy);
    g.closePath(); g.fill();
  };
  const dot3p = (o, r, fill, col) => {
    const Q = P(o); g.beginPath(); g.arc(Q.sx, Q.sy, r, 0, TAU);
    if (fill) { g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; g.stroke(); }
    else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }
  };
  const label = (o, txt, col) => { const Q = P(o); g.font = `${12 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`; g.fillStyle = col; g.fillText(txt, Q.sx + 7, Q.sy - 7); };

  /* sphere of directions S² */
  if ($('chkSphere').checked) {
    const circ = pts => poly3(pts, 'rgba(140,160,220,.10)', 1.2 * S.zoom3);
    for (const lat of [0, .5, -.5, .866, -.866]) { const r = Math.sqrt(1 - lat * lat), pts = [];
      for (let i = 0; i <= 64; i++) { const a = TAU * i / 64; pts.push([r * Math.cos(a), r * Math.sin(a), lat]); } circ(pts); }
    for (let m = 0; m < 6; m++) { const a = m * Math.PI / 6, pts = [];
      for (let i = 0; i <= 64; i++) { const s = TAU * i / 64; pts.push([Math.cos(s) * Math.cos(a), Math.cos(s) * Math.sin(a), Math.sin(s)]); } circ(pts); }
  }

  /* horizon plane w = 0 */
  if ($('chkHoriz').checked) {
    g.fillStyle = 'rgba(255,90,105,.045)';
    const c = [[-E, -E, 0], [E, -E, 0], [E, E, 0], [-E, E, 0]].map(P);
    g.beginPath(); g.moveTo(c[0].sx, c[0].sy); for (let i = 1; i < 4; i++) g.lineTo(c[i].sx, c[i].sy); g.closePath(); g.fill();
    const st = niceStep(E / 5);
    for (let i = -E; i <= E + 1e-9; i += st) { seg([i, -E, 0], [i, E, 0], 'rgba(255,110,125,.07)', 1); seg([-E, i, 0], [E, i, 0], 'rgba(255,110,125,.07)', 1); }
    poly3(c, 'rgba(255,110,125,.28)', 1.4, [6, 5]);
    label([-E * .25, -E, 0], 'horizon  w = 0', 'rgba(255,140,150,.75)');
  }

  /* chart plane w = 1 */
  if ($('chkPlane').checked) {
    g.fillStyle = 'rgba(110,231,255,.05)';
    const c = [[-E, -E, 1], [E, -E, 1], [E, E, 1], [-E, E, 1]].map(P);
    g.beginPath(); g.moveTo(c[0].sx, c[0].sy); for (let i = 1; i < 4; i++) g.lineTo(c[i].sx, c[i].sy); g.closePath(); g.fill();
    const st = niceStep(E / 6);
    for (let i = -E; i <= E + 1e-9; i += st) { seg([i, -E, 1], [i, E, 1], 'rgba(110,231,255,.10)', 1); seg([-E, i, 1], [E, i, 1], 'rgba(110,231,255,.10)', 1); }
    seg([0, -E, 1], [0, E, 1], 'rgba(110,231,255,.22)', 1.4); seg([-E, 0, 1], [E, 0, 1], 'rgba(110,231,255,.22)', 1.4);
    poly3(c, 'rgba(110,231,255,.35)', 1.5);
    label([-E * .05, -E, 1], 'chart plane  w = 1', 'rgba(110,231,255,.8)');
  }

  /* projection rays O -> surface samples */
  if ($('chkCone').checked) {
    g.strokeStyle = 'rgba(130,210,255,.13)'; g.lineWidth = 1 * S.zoom3; g.beginPath();
    for (let a = 0; a < S.g.length; a += Math.max(1, Math.floor(S.g.length / 120))) {
      const p = S.g[a]; if (!isFinite(p[0])) continue;
      const O = P([0, 0, 0]), B = P(p); g.moveTo(O.sx, O.sy); g.lineTo(B.sx, B.sy);
    }
    g.stroke();
  }

  /* axes */
  const ax = E * 1.06;
  seg([-ax, 0, 0], [ax, 0, 0], 'rgba(255,107,129,.55)', 1.4);
  seg([0, -ax, 0], [0, ax, 0], 'rgba(255,209,102,.55)', 1.4);
  seg([0, 0, -ax], [0, 0, ax], 'rgba(110,231,255,.55)', 1.4);
  label([ax, 0, 0], 'x', '#ff6b81'); label([0, ax, 0], 'y', '#ffd166'); label([0, 0, ax], 'w', '#6ee7ff');

  const N = S.N, s = N + 1, f = forwardVec();

  /* filled surface: painter's algorithm, coloured by sign(w) */
  if ($('chkSurf').checked) {
    const faces = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const a = i * s + j;
      const p00 = S.g[a], p10 = S.g[a + 1], p01 = S.g[a + s], p11 = S.g[a + s + 1];
      if (!isFinite(p00[2]) || !isFinite(p11[2])) continue;
      const c = [(p00[0] + p10[0] + p01[0] + p11[0]) / 4, (p00[1] + p10[1] + p01[1] + p11[1]) / 4, (p00[2] + p10[2] + p01[2] + p11[2]) / 4];
      faces.push({ q: [p00, p10, p11, p01], z: dot3(c, f), w: (p00[2] + p11[2]) / 2 });
    }
    faces.sort((A, B) => B.z - A.z);                 // far first
    for (const fc of faces) {
      const depth = clamp(fc.z / (E * 2), 0, 1);
      const base = fc.w >= 0 ? [110, 231, 255] : [224, 120, 208];
      const a = (fc.w >= 0 ? .88 : .78) - .18 * depth;
      quad3(fc.q[0], fc.q[1], fc.q[2], fc.q[3], `rgba(${base[0]},${base[1]},${base[2]},${a})`);
    }
  }

  /* wireframe iso-net */
  if ($('chkWire').checked) {
    for (let i = 0; i <= N; i++) { const pts = []; for (let j = 0; j <= N; j++) pts.push(S.g[i * s + j]); poly3(pts, 'rgba(120,170,215,.18)', 1, null, true); }
    for (let j = 0; j <= N; j++) { const pts = []; for (let i = 0; i <= N; i++) pts.push(S.g[i * s + j]); poly3(pts, 'rgba(120,170,215,.18)', 1, null, true); }
  }

  /* current point: ray O->p, antipode, chart-plane hit, dot */
  const p = surf(S.u, S.v);
  if (p && isFinite(p[0])) {
    const O = P([0, 0, 0]);
    seg([0, 0, 0], p, 'rgba(255,255,255,.45)', 1.5);
    if ($('chkAnti').checked) {
      const ap = [-p[0], -p[1], -p[2]];
      seg([0, 0, 0], ap, 'rgba(224,120,208,.3)', 1.2, [4, 4]);
      dot3p(ap, 5, false, 'rgba(224,120,208,.85)');
      label(ap, '−p', 'rgba(224,120,208,.85)');
    }
    const a = p[0] / p[2], b = p[1] / p[2];
    if (isFinite(a) && isFinite(b) && Math.abs(a) <= E * 1.05 && Math.abs(b) <= E * 1.05) dot3p([a, b, 1], 4.5, true, '#a0ffd2');
    dot3p(p, 6.5, true, 'rgba(255,255,255,.95)');
    label(p, `[u=${S.u.toFixed(2)}, v=${S.v.toFixed(2)}]`, 'rgba(220,235,255,.9)');
    dot3p(O, 4, true, '#fff'); label([0, 0, 0], 'O', 'rgba(255,255,255,.75)');
  }

  renderPBox();
}

/* =========================== 2D RENDERER ================================ */
function dot(g, x, y, r, fill, col) {
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  if (fill) { g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke(); }
  else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }
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

function render2(now) {
  const { w: W, h: H } = fitCanvas(cv2);
  const g = ctx2; g.clearRect(0, 0, W, H);
  const m = 12 * (W / 600);
  const sc = (Math.min(W, H) - 2 * m) / (2 * S.win) * (W > H ? Math.min(1.9, W / H) : 1);
  const sa = u => W / 2 + (u - S.a0) * sc;
  const sb = v => H / 2 - (v - S.b0) * sc;
  const winX = (W / 2 - m) / sc, winY = (H / 2 - m) / sc;
  const L = S.a0 - winX, R = S.a0 + winX, B = S.b0 - winY, T = S.b0 + winY;
  const inBox = (u, v) => u >= L && u <= R && v >= B && v <= T;

  /* grid */
  const st = niceStep(Math.max(winX, winY) / 8);
  for (let u = Math.ceil(L / st) * st; u <= R; u += st) {
    g.strokeStyle = Math.abs(u) < st / 2 ? 'rgba(140,160,210,.35)' : 'rgba(140,160,210,.10)';
    g.lineWidth = Math.abs(u) < st / 2 ? 1.4 : 1;
    g.beginPath(); g.moveTo(sa(u), m); g.lineTo(sa(u), H - m); g.stroke();
  }
  for (let v = Math.ceil(B / st) * st; v <= T; v += st) {
    g.strokeStyle = Math.abs(v) < st / 2 ? 'rgba(140,160,210,.35)' : 'rgba(140,160,210,.10)';
    g.lineWidth = Math.abs(v) < st / 2 ? 1.4 : 1;
    g.beginPath(); g.moveTo(m, sb(v)); g.lineTo(W - m, sb(v)); g.stroke();
  }
  g.font = `${11 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(150,170,210,.5)';
  for (let u = Math.ceil(L / st) * st; u <= R; u += st) if (Math.abs(u) > st / 2) g.fillText(fmt(u), sa(u) + 3, clamp(sb(0) + 13, m + 12, H - m - 2));
  for (let v = Math.ceil(B / st) * st; v <= T; v += st) if (Math.abs(v) > st / 2) g.fillText(fmt(v), clamp(sa(0) + 4, m + 2, W - m - 30), sb(v) - 3);

  /* surface mesh in the chart, clipped, coloured by sign(w) */
  g.save(); g.beginPath(); g.rect(m, m, W - 2 * m, H - 2 * m); g.clip();
  const cell = (i, j) => { const a = i * S.s + j; return { a: S.ga[a], b: S.gb[a], w: S.g[a][2] }; };
  const netPass = (sign, col, dash) => {
    g.strokeStyle = col; g.lineWidth = 1.4; g.setLineDash(dash || []);
    const run = get => { let drawing = false; const flush = () => { if (drawing) g.stroke(); drawing = false; };
      for (let k = 0; k <= S.N; k++) { const q = get(k);
        // route by sign(w) only; DON'T drop off-viewport points — the canvas
        // clip rect (set below) already trims them, so every edge draws fully
        // and is only cut at the window border, never hidden by an off-screen node.
        const ok = q && isFinite(q.a) && isFinite(q.b) && Math.sign(q.w) === sign;
        if (!ok) { flush(); continue; }
        if (!drawing) { g.beginPath(); g.moveTo(sa(q.a), sb(q.b)); drawing = true; } else g.lineTo(sa(q.a), sb(q.b)); }
      flush(); };
    for (let i = 0; i <= S.N; i++) { const i0 = i; run(k => cell(i0, k)); }
    for (let j = 0; j <= S.N; j++) { const j0 = j; run(k => cell(k, j0)); }
  };
  netPass(1, 'rgba(110,231,255,.9)', null);         // w >= 0  solid teal
  netPass(-1, 'rgba(224,120,208,.72)', [5, 4]);     // w < 0   dashed magenta (antipode)
  g.setLineDash([]);
  const a = chartA(), b = chartB();
  if (isFinite(a) && isFinite(b) && inBox(a, b)) {
    dot(g, sa(a), sb(b), 5.5, true, 'rgba(255,255,255,.95)');
    g.font = `${12 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`;
    g.fillStyle = 'rgba(220,235,255,.9)';
    g.fillText(`[p] = (${fmt(a)}, ${fmt(b)})`, sa(a) + 9, sb(b) - 9);
  }
  g.restore();

  /* line at infinity = window border */
  g.setLineDash([7, 5]); g.strokeStyle = 'rgba(255,120,135,.8)'; g.lineWidth = 2; g.strokeRect(m, m, W - 2 * m, H - 2 * m); g.setLineDash([]);
  const dpr = window.devicePixelRatio || 1;
  g.font = `${12.5 * dpr}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(255,140,150,.9)'; g.fillText('line at infinity  ℓ∞ : w = 0', m + 8, m + 18 * dpr);
  g.fillStyle = 'rgba(110,231,255,.75)'; g.fillText('a →', W - m - 42, clamp(sb(0) - 6, m + 14, H - m));
  g.fillStyle = 'rgba(110,231,255,.75)'; g.fillText('↑ b', clamp(sa(0) + 6, m, W - m - 24), m + 30);

  renderPBox();
}

/* ==================== parameter-domain box (on c2) ====================== */
const PB = { padL: 30, padT: 14, padR: 10, padB: 22, cap: false };
function boxGeom() {
  const W = pbox.width, H = pbox.height;
  const L = Math.min(W - PB.padL - PB.padR, H - PB.padT - PB.padB);
  return { W, H, L, px: u => PB.padL + u * L, py: v => PB.padT + L - v * L };
}
function renderPBox() {
  if (!$('chkBox').checked) return;
  fitCanvas(pbox);
  const geo = boxGeom(), { W, H, px, py } = geo;
  const dpr = window.devicePixelRatio || 1;
  const cb = cv2.getBoundingClientRect(), pb = pbox.getBoundingClientRect();
  if (!cb.width || !cb.height) return;
  const ox = Math.round((pb.left - cb.left) / cb.width * cv2.width);
  const oy = Math.round((pb.top - cb.top) / cb.height * cv2.height);
  const g = ctx2; g.save(); g.translate(ox, oy); g.setLineDash([]);
  g.beginPath(); g.rect(0, 0, W, H); g.clip();

  g.fillStyle = '#0d1220'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,170,215,.55)'; g.lineWidth = 1.4; g.strokeRect(PB.padL, PB.padT, geo.L, geo.L);
  g.font = `${10 * dpr}px ui-monospace, monospace`; g.fillStyle = 'rgba(150,175,210,.55)';
  for (let t = .25; t < 1; t += .25) { g.strokeStyle = 'rgba(120,170,215,.10)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(px(t), py(0)); g.lineTo(px(t), py(1)); g.stroke();
    g.beginPath(); g.moveTo(px(0), py(t)); g.lineTo(px(1), py(t)); g.stroke(); }
  g.fillStyle = 'rgba(150,175,210,.55)';
  g.fillText('0', PB.padL - 9, py(0) + 12); g.fillText('1', PB.padL + geo.L - 4, py(0) + 12);
  g.fillText('0', PB.padL - 10, py(1) + 4); g.fillText('1', PB.padL - 10, py(0) - 5);
  g.fillStyle = 'rgba(255,150,90,.85)'; g.fillText('u →', PB.padL + geo.L + 2, py(0) + 12);
  g.save(); g.translate(11 * dpr, PB.padT + geo.L - geo.L / 2); g.rotate(-Math.PI / 2);
  g.fillStyle = 'rgba(120,230,160,.85)'; g.fillText('v →', -14, 0); g.restore();
  g.fillStyle = 'rgba(200,220,245,.8)'; g.font = `${10.5 * dpr}px ui-monospace, monospace`; g.fillText('domain', PB.padL + 3, PB.padT - 4);

  const du = px(S.u), dv = py(S.v);
  g.strokeStyle = 'rgba(180,205,240,.35)'; g.lineWidth = 1; g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(du, py(0)); g.lineTo(du, dv); g.lineTo(px(0), dv); g.stroke(); g.setLineDash([]);
  const tick = (x, y, ang, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.strokeStyle = col; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(-4, 6); g.lineTo(4, 6); g.lineTo(0, 12); g.closePath(); g.fill(); g.restore(); };
  tick(du, py(0), 0, 'rgba(255,150,90,.95)'); tick(px(0), dv, -Math.PI / 2, 'rgba(120,230,160,.95)');
  g.beginPath(); g.arc(du, dv, 6, 0, TAU); g.fillStyle = 'rgba(120,235,255,.95)'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(210,225,245,.9)'; g.font = `${11 * dpr}px ui-monospace, monospace`;
  g.fillText(`u=${S.u.toFixed(2)}  v=${S.v.toFixed(2)}`, PB.padL + 2, H - 5);
  g.restore();
}

/* ============================ status bar ================================ */
function status() {
  const p = surf(S.u, S.v);
  if (!p || !isFinite(p[0])) { $('status').innerHTML = '<span class="k">surface undefined at this (u,v)</span>'; return; }
  const [x, y, w] = p, a = chartA(), b = chartB();
  const wc = w >= 0 ? 'pos' : 'neg';
  const tag = Math.abs(w) < 1e-3
    ? '<span class="neg">w ≈ 0 → point is ON the line at infinity ℓ∞</span>'
    : w < 0
      ? '<span class="neg">w &lt; 0 → charted via antipode −p (same projective point)</span>'
      : '<span class="pos">w &gt; 0 → upper chart representative</span>';
  $('status').innerHTML =
    `<span class="k">(u, v) =</span> (${S.u.toFixed(3)}, ${S.v.toFixed(3)}) &nbsp; <span class="k">p =</span> ` +
    `(${fmt(x)}, ${fmt(y)}, <span class="${wc}">${fmt(w)}</span>) &nbsp; <span class="k">→</span> [p] = ` +
    `[${fmt(x / w)} : ${fmt(y / w)} : ${fmt(1)}] &nbsp; <span class="k">↦</span> (a, b) = ` +
    `(${isFinite(a) ? fmt(a) : '∞'}, ${isFinite(b) ? fmt(b) : '∞'}) &nbsp;·&nbsp; ${tag}`;
}

/* ============================== UI wiring =============================== */
const sel = $('sel');
for (const pr of PRESETS) { const o = document.createElement('option'); o.value = pr.id; o.textContent = pr.name; sel.appendChild(o); }

function loadPreset(pr) {
  S.preset = pr;
  $('lblCustom').classList.toggle('show', pr.id === 'custom');
  if (pr.id === 'custom') { if (!applyCustom()) return; }
  else { S.eval = pr.eval; $('desc').classList.remove('err'); $('desc').innerHTML = pr.desc; }
  resample(); setUV(.5, .5);
}

function applyCustom() {
  const mk = (src, name) => {
    const body = `"use strict";const {sin,cos,tan,asin,acos,atan2,sinh,cosh,tanh,sqrt,abs,exp,log,pow,sign,floor,min,max}=Math,pi=Math.PI,tau=Math.PI*2;return (${src});`;
    const fn = new Function('u', 'v', body);
    try { fn(.3, .7); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    return fn;
  };
  try {
    const fx = mk($('cx').value, 'x'), fy = mk($('cy').value, 'y'), fw = mk($('cw').value, 'w');
    S.eval = (u, v) => [fx(u, v), fy(u, v), fw(u, v)];
    $('desc').classList.remove('err'); $('desc').innerHTML = PRESETS.find(p => p.id === 'custom').desc;
    return true;
  } catch (e) {
    $('desc').classList.add('err'); $('desc').textContent = 'Custom expression error: ' + e.message;
    return false;
  }
}

const selChange = () => loadPreset(PRESETS.find(p => p.id === sel.value));
sel.addEventListener('change', selChange);
$('btnApply').addEventListener('click', () => loadPreset(PRESETS.find(p => p.id === 'custom')));
$('rngSpeed').addEventListener('input', e => S.speed = +e.target.value);

const btnPlay = $('btnPlay');
const togglePlay = () => { S.playing = !S.playing; btnPlay.textContent = S.playing ? '⏸ pause' : '▶ play'; };
btnPlay.addEventListener('click', togglePlay);

/* Space = play/pause, but only when NOT editing a text field: a global
   space handler would swallow spaces typed into the custom-surface editor, so
   let form controls keep their native behavior. */
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
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  if (isFormControl(e.target)) return;   // typing in a field: don't hijack space
  e.preventDefault();                    // no page scroll / native space step
  togglePlay();
});

/* --- 3D interaction (rotate / zoom) --- */
function drag(cv, onMove) {
  let last = null;
  cv.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!last) return; onMove(e.clientX - last[0], e.clientY - last[1], e); last = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', () => last = null);
  cv.addEventListener('pointercancel', () => last = null);
}
drag(cv3, (dx, dy) => { S.yaw += dx * 0.008; S.pitch = clamp(S.pitch + dy * 0.006, -1.45, 1.45); });
cv3.addEventListener('wheel', e => { e.preventDefault(); S.zoom3 = clamp(S.zoom3 * Math.exp(-e.deltaY * 0.001), 0.25, 5); }, { passive: false });

/* --- 2D interaction (pan / zoom the chart) --- */
drag(cv2, (dx, dy) => {
  const r = cv2.getBoundingClientRect();
  const m = 12 * (r.width / 600);
  const sc = (Math.min(r.width, r.height) - 2 * m) / (2 * S.win) * (r.width > r.height ? Math.min(1.9, r.width / r.height) : 1);
  S.a0 -= dx / sc; S.b0 += dy / sc;
});
cv2.addEventListener('wheel', e => { e.preventDefault(); S.win = clamp(S.win * Math.exp(e.deltaY * 0.001), 0.4, 60); }, { passive: false });

/* --- param box: drag the (u,v) point --- */
function pboxUV(ev) {
  const geo = boxGeom(), r = pbox.getBoundingClientRect();
  const px = (ev.clientX - r.left) * pbox.width / r.width;
  const py = (ev.clientY - r.top) * pbox.height / r.height;
  return { u: clamp((px - PB.padL) / geo.L, 0, 1), v: clamp((geo.L - (py - PB.padT)) / geo.L, 0, 1) };
}
pbox.addEventListener('pointerdown', ev => { const { u, v } = pboxUV(ev); setUV(u, v); PB.cap = true; pbox.setPointerCapture(ev.pointerId); });
pbox.addEventListener('pointermove', ev => { if (!PB.cap) return; const { u, v } = pboxUV(ev); setUV(u, v); });
pbox.addEventListener('pointerup', () => PB.cap = false);
pbox.addEventListener('pointercancel', () => PB.cap = false);

/* ============================== main loop =============================== */
let prev = null;
function frame(now) {
  if (prev === null) prev = now;
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  if (S.playing) { const ph = now / 1000;
    setUV(.5 + .44 * Math.sin(TAU * ph * .19), .5 + .44 * Math.sin(TAU * ph * .31 + 1.1)); }
  render3(now); render2(now); status();
  requestAnimationFrame(frame);
}

/* --- start (with deep links ?preset=…&u=…&v=…) --- */
const qGet = k => (window.location && window.location.search) ? new URLSearchParams(window.location.search).get(k) : null;
const START = PRESETS.find(p => p.id === qGet('preset')) || PRESETS[0];
sel.value = START.id;
loadPreset(START);
{ const uu = qGet('u'), vv = qGet('v'); if (uu !== null || vv !== null) setUV(uu !== null ? parseFloat(uu) : .5, vv !== null ? parseFloat(vv) : .5); }
frame(0);
