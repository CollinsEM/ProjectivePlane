'use strict';
/* =========================================================================
   Parametric Surface Explorer
   A surface patch  S(u, v),  (u, v) ∈ [0,1]²  →  ℝ³.
   A draggable box renders the parameter domain; moving the point (u, v) in it
   moves the corresponding point on the surface, with its iso-curves, tangent
   plane and normal.  Bézier / rational tensor-product patches included.
   ========================================================================= */

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = a => Math.hypot(a[0], a[1], a[2]);
const nrm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/* --------------------------- surface presets ---------------------------- */
/* Each preset provides eval(u,v) -> [x,y,z]; a Bézier preset also gives a
   control net `grid` (flat, index = i*(degV+1)+j, i = u-index, j = v-index),
   each node [x, y, z, w].  Analytic presets have grid = null. */

/* tensor-product Bézier (de Casteljau in homogeneous 4-D, then project) */
function bezierSurf(grid, nu, nv, u, v) {
  const s = nv + 1;
  const a = grid.map(p => [p[0] * p[3], p[1] * p[3], p[2] * p[3], p[3]]);
  for (let r = 1; r <= nu; r++)
    for (let i = 0; i <= nu - r; i++)
      for (let j = 0; j <= nv; j++) {
        const A = a[i * s + j], B = a[(i + 1) * s + j], t = u;
        a[i * s + j] = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t,
                        A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t];
      }
  for (let r = 1; r <= nv; r++)
    for (let j = 0; j <= nv - r; j++) {
      const A = a[j], B = a[j + 1], t = v;
      a[j] = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t,
              A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t];
    }
  const q = a[0], w = q[3] || 1e-12;
  return [q[0] / w, q[1] / w, q[2] / w];
}

/* dome: bicubic Bézier, control net lifted into a rounded cap */
const domeGrid = (() => {
  const g = [], z = [[0, .6, .6, 0], [.6, 1.4, 1.4, .6], [.6, 1.4, 1.4, .6], [0, .6, .6, 0]];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
    g.push([-1 + 2 * i / 3, -1 + 2 * j / 3, z[i][j], 1]);
  return g;
})();

/* rational quarter-cylinder: tensor of a rational quadratic circle × a line */
const cylGrid = [
  [1, 0, 0, 1], [1, 0, 1, 1],
  [0, 1, 0, .70710678], [0, 1, 1, .70710678],
  [-1, 0, 0, 1], [-1, 0, 1, 1],
];   // degU = 2, degV = 1  (index = i*2 + j)

const PRESETS = [
  { id: 'bilinear', name: 'Bilinear patch (2×2 net → saddle)',
    desc: 'The simplest patch: four corner control points, degree 1 in both directions. A bilinear (u, v) blend of the '
        + 'corners makes a <b>hyperbolic paraboloid</b> — a saddle. Note the <b>u- and v-iso-lines are straight lines</b>: '
        + 'this is a <b>ruled</b> surface, one whole family of coordinate curves are rulings.',
    grid: [-1, -1, .5, 1, 1, -1, -.5, 1, -1, 1, -.5, 1, 1, 1, .5, 1], degU: 1, degV: 1,
    eval: (u, v) => bezierSurf([[-1,-1,.5,1],[1,-1,-.5,1],[-1,1,-.5,1],[1,1,.5,1]], 1, 1, u, v) },

  { id: 'dome', name: 'Bicubic Bézier patch (dome)',
    desc: 'A 4×4 control <b>net</b> whose interior points are lifted higher than the edges; the tensor-product Bézier '
        + 'surface bulges into a smooth <b>cap</b>. The surface stays inside the net’s convex hull and touches it only at '
        + 'the four corners — the same hull / endpoint-interpolation behaviour you saw for Bézier <i>curves</i>, now in 2-D.',
    grid: domeGrid, degU: 3, degV: 3,
    eval: (u, v) => bezierSurf(domeGrid, 3, 3, u, v) },

  { id: 'saddle', name: 'Hyperbolic paraboloid  z = k·x·y',
    desc: 'The analytic saddle S(u,v) = (x, y, 1.1·x·y) with x, y ∈ [−1,1]. Saddle point at the centre: the u-iso-line is a '
        + 'cup, the v-iso-line a cap. Watch the <b>tangent plane</b> flip its tilt as the point crosses the saddle — the '
        + 'normal sweeps through every horizontal direction.',
    grid: null,
    eval: (u, v) => { const x = -1 + 2 * u, y = -1 + 2 * v; return [x, y, 1.1 * x * y]; } },

  { id: 'monkey', name: 'Monkey saddle  z = x³ − 3xy²',
    desc: 'S(u,v) = (x, y, x³ − 3xy²). Threefold symmetry: <b>three</b> valleys meet at the origin, so the tangent-plane '
        + 'normal makes a full turn as you walk once around the centre. A classic test of how a patch handles a degenerate '
        + '(flat) critical point.',
    grid: null,
    eval: (u, v) => { const x = -1 + 2 * u, y = -1 + 2 * v; return [x, y, .9 * (x * x * x - 3 * x * y * y)]; } },

  { id: 'sphere', name: 'Sphere patch (spherical coords)',
    desc: 'A rectangular chunk of the unit sphere: polar angle ∝ u, azimuth ∝ v. The iso-net is a patch of <b>meridians and '
        + 'parallels</b>. The surface bulges toward you on one side and away on the other — uncheck “back faces” to see it is '
        + 'single-sided here (fills are culled), exactly as a real 2-D sheet has two faces.',
    grid: null,
    eval: (u, v) => {
      const φ = .2 + .75 * Math.PI * u, λ = .3 + (TAU - .6) * v;
      return [Math.sin(φ) * Math.cos(λ), Math.sin(φ) * Math.sin(λ), Math.cos(φ)]; } },

  { id: 'torus', name: 'Torus patch',
    desc: 'A plate wrapped around a circle: the v-iso-lines are circles around the tube, the u-iso-lines are circles around '
        + 'the hole. Curvature is <b>not constant</b> — the outside of the ring is saddle-shaped (negative curvature) and the '
        + 'inside is dome-shaped (positive), so the tangent plane twists noticeably as (u, v) walks around.',
    grid: null,
    eval: (u, v) => {
      const R = 1, r = .45, φ = .3 + 2.5 * u, λ = .3 + (TAU - .6) * v;
      return [(R + r * Math.cos(φ)) * Math.cos(λ), (R + r * Math.cos(φ)) * Math.sin(λ), r * Math.sin(φ)]; } },

  { id: 'cone', name: 'Cone patch (ruled / developable)',
    desc: 'S(u,v) = ((1−v)cos θ, (1−v)sin θ, v), θ = 1.6π·u. The <b>v-lines are straight rulings</b> running to the apex — '
        + 'a cone is <b>developable</b>: its Gaussian curvature is zero, so it can be unrolled flat. Turn on the tangent plane '
        + 'and notice it contains the ruling direction everywhere.',
    grid: null,
    eval: (u, v) => { const th = 1.6 * Math.PI * u, m = 1 - v; return [m * Math.cos(th), m * Math.sin(th), v]; } },

  { id: 'rational', name: 'Rational patch — exact quarter cylinder',
    desc: 'A tensor product of the <b>exact quarter-circle rational Bézier</b> (weights 1, √2⁄2, 1 — the same as the quarter '
        + 'circle in the Projective-Plane demo) with a straight line in z. The control net is drawn with its weights; the '
        + 'surface is the projection of the polynomial net in homogeneous ℝ⁴. Try editing a weight in the box above and '
        + '“apply”: pull it and watch the rational surface lean toward that node.',
    grid: cylGrid, degU: 2, degV: 1,
    eval: (u, v) => bezierSurf(cylGrid, 2, 1, u, v) },

  { id: 'custom', name: 'Custom patch  x(u,v), y(u,v), z(u,v)',
    desc: 'Type any expressions in u and v (sin, cos, tan, sqrt, abs, exp, log, pow, pi, tau, asin, atan2, sinh… allowed). '
        + 'The default is a Spiro / “spiral-of-spirals” tube. Try a surface of revolution: '
        + 'x = (1+.4cos(3v))cos(2πu), y = (1+.4cos(3v))sin(2πu), z = .6 sin(3v).',
    grid: null,
    eval: null },
];

/* ------------------------------ state --------------------------------- */
const S = {
  preset: PRESETS[0],
  eval: PRESETS[0].eval,
  grid: null, degU: 0, degV: 0,
  u: .5, v: .5, playing: false, speed: 1,
  yaw: .85, pitch: .5, zoom3: 1, ext: 3.2,
  zmin: -1, zmax: 1,
  N: 40, g: [],
};

/* --------------------------- sampling --------------------------------- */
function surf(u, v) {
  try { const p = S.eval(u, v);
        return (p && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) ? p : [NaN, NaN, NaN]; }
  catch (e) { return [NaN, NaN, NaN]; }
}
function resample() {
  const N = S.N, s = N + 1;
  S.g.length = 0;
  let zmin = Infinity, zmax = -Infinity, ext = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    for (let j = 0; j <= N; j++) {
      const p = surf(u, j / N);
      S.g.push(p);
      if (isFinite(p[2])) { zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); }
      if (isFinite(p[0])) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    }
  }
  S.zmin = zmin; S.zmax = zmax;
  S.ext = clamp(Math.ceil(ext * 1.18), 2.4, 16);
}
function partials(u, v) {
  const h = 1e-4;
  return { Su: scl(sub(surf(u + h, v), surf(u - h, v)), .5 / h),
           Sv: scl(sub(surf(u, v + h), surf(u, v - h)), .5 / h) };
}

/* ------------------------------ colors -------------------------------- */
const colLerp = (a, b, t) => `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;

/* ----------------------------- canvases ------------------------------- */
const cv3 = $('c3'), g3 = cv3.getContext('2d');
const pbox = $('pbox');

function fitCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const r = cv.getBoundingClientRect();
  const w = Math.max(64, Math.round(r.width * dpr));
  const h = Math.max(64, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { w: cv.width, h: cv.height };
}

/* ============================== 3-D renderer =========================== */
function proj3(x, y, z, W, H, k) {
  const cy_ = Math.cos(S.yaw), sy_ = Math.sin(S.yaw);
  const x1 = x * cy_ - y * sy_, y1 = x * sy_ + y * cy_;
  const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
  const depth = y1 * cp - z * sp, up = y1 * sp + z * cp;
  return { sx: W / 2 + x1 * k, sy: H / 2 - up * k + H * 0.08, d: depth };
}
/* world-space view-forward (into screen) — used for culling */
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
  const g = g3;
  g.clearRect(0, 0, W, H);
  g.lineJoin = g.lineCap = 'round';
  const E = S.ext;
  const k = (0.36 * Math.min(W, H) / Math.max(E * .72, 1.5)) * S.zoom3;
  const P = p => proj3(p[0], p[1], p[2], W, H, k);

  const seg = (a, b, col, lw, dash) => {
    const A = P(a), B = P(b);
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.stroke(); g.setLineDash([]);
  };
  const vec = (o, d, col, lw, dash) => {          // arrow from o along d
    const O = P(o), T = P(add(o, d));
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); g.moveTo(O.sx, O.sy); g.lineTo(T.sx, T.sy); g.stroke(); g.setLineDash([]);
    const s = 7 * S.zoom3;
    const ang = Math.atan2(T.sy - O.sy, T.sx - O.sx);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(T.sx, T.sy);
    g.lineTo(T.sx - s * Math.cos(ang - .4), T.sy - s * Math.sin(ang - .4));
    g.lineTo(T.sx - s * Math.cos(ang + .4), T.sy - s * Math.sin(ang + .4));
    g.closePath(); g.fill();
  };
  const poly3 = (pts, col, lw, dash, skipBad) => {
    g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []);
    g.beginPath(); let pen = false;
    for (const q of pts) {
      if (skipBad && (!isFinite(q[0]) || !isFinite(q[1]) || !isFinite(q[2]))) { pen = false; continue; }
      const A = P(q);
      if (!pen) { g.moveTo(A.sx, A.sy); pen = true; } else g.lineTo(A.sx, A.sy);
    }
    g.stroke(); g.setLineDash([]);
  };
  const dot3p = (o, r, fill, col) => {
    const Q = P(o);
    g.beginPath(); g.arc(Q.sx, Q.sy, r, 0, TAU);
    if (fill) { g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; g.stroke(); }
    else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }
  };
  const quad3 = (a, b, c, d, col) => {
    const A = P(a), B = P(b), C = P(c), D = P(d);
    g.fillStyle = col; g.beginPath();
    g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.lineTo(C.sx, C.sy); g.lineTo(D.sx, D.sy);
    g.closePath(); g.fill();
  };
  const label = (o, txt, col) => { const Q = P(o); g.font = `${12 * (window.devicePixelRatio || 1)}px ui-monospace, monospace`; g.fillStyle = col; g.fillText(txt, Q.sx + 7, Q.sy - 7); };

  /* axes */
  const ax = E * 1.02;
  seg([-ax, 0, 0], [ax, 0, 0], 'rgba(255,107,129,.5)', 1.3);
  seg([0, -ax, 0], [0, ax, 0], 'rgba(255,209,102,.5)', 1.3);
  seg([0, 0, -ax], [0, 0, ax], 'rgba(110,231,255,.5)', 1.3);
  label([ax, 0, 0], 'x', '#ff6b81'); label([0, ax, 0], 'y', '#ffd166'); label([0, 0, ax], 'z', '#6ee7ff');

  const N = S.N, s = N + 1;
  const f = forwardVec();
  const L = nrm([.45, .55, .8]);          // light direction (toward camera-ish)
  const lo = [58, 104, 148], hi = [150, 212, 236];

  /* ---- filled surface, painter’s algorithm + back-face cull ---- */
  if ($('chkSurf').checked) {
    const faces = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const a = i * s + j;
      const p00 = S.g[a], p10 = S.g[a + 1], p01 = S.g[a + s], p11 = S.g[a + s + 1];
      if (!isFinite(p00[2]) || !isFinite(p11[2])) continue;
      const e1 = sub(p10, p00), e2 = sub(p01, p00);
      const Nrm = nrm(cross(e1, e2));
      const c = [ (p00[0]+p10[0]+p01[0]+p11[0]) / 4,
                  (p00[1]+p10[1]+p01[1]+p11[1]) / 4,
                  (p00[2]+p10[2]+p01[2]+p11[2]) / 4 ];
      faces.push({ q: [p00, p10, p11, p01], N: Nrm, d: dot3(c, f), z: c[2] });
    }
    faces.sort((A, B) => B.d - A.d);                 // far first
    const showBack = $('chkBack').checked;
    const span = (S.zmax - S.zmin) || 1;
    for (const fc of faces) {
      const front = dot3(fc.N, f) < 0;
      if (!front && !showBack) continue;
      const lam = Math.max(0, dot3(fc.N, L));
      const inten = front ? .42 + .58 * lam : .22 + .22 * lam;
      const t = (fc.z - S.zmin) / span;
      quad3(fc.q[0], fc.q[1], fc.q[2], fc.q[3], colLerp(lo, hi, t * inten).replace('rgb', 'rgba').replace(')', `,${front ? .92 : .32})`));
    }
  }

  /* ---- wireframe iso-net ---- */
  if ($('chkWire').checked) {
    for (let i = 0; i <= N; i++) { const pts = []; for (let j = 0; j <= N; j++) pts.push(S.g[i * s + j]); poly3(pts, 'rgba(120,170,215,.14)', 1, null, true); }
    for (let j = 0; j <= N; j++) { const pts = []; for (let i = 0; i <= N; i++) pts.push(S.g[i * s + j]); poly3(pts, 'rgba(120,170,215,.14)', 1, null, true); }
  }

  /* ---- Bézier control net ---- */
  if ($('chkNet').checked && S.grid) {
    const s2 = S.degV + 1;
    const col = 'rgba(255,209,102,.7)';
    for (let i = 0; i <= S.degU; i++) { const pts = []; for (let j = 0; j <= S.degV; j++) pts.push([S.grid[i * s2 + j][0], S.grid[i * s2 + j][1], S.grid[i * s2 + j][2]]); poly3(pts, col, 1.4, [5, 4]); }
    for (let j = 0; j <= S.degV; j++) { const pts = []; for (let i = 0; i <= S.degU; i++) pts.push([S.grid[i * s2 + j][0], S.grid[i * s2 + j][1], S.grid[i * s2 + j][2]]); poly3(pts, col, 1.4, [5, 4]); }
    for (let i = 0; i <= S.degU; i++) for (let j = 0; j <= S.degV; j++) {
      const q = P([S.grid[i * s2 + j][0], S.grid[i * s2 + j][1], S.grid[i * s2 + j][2]]);
      g.beginPath(); g.arc(q.sx, q.sy, 3.4, 0, TAU); g.fillStyle = 'rgba(255,209,102,.9)'; g.fill();
    }
  }

  /* ---- iso-curves through the current point ---- */
  if ($('chkIso').checked) {
    const cu = [], cv = [];
    for (let i = 0; i <= N; i++) { cu.push(surf(S.u, i / N)); cv.push(surf(i / N, S.v)); }
    poly3(cu, 'rgba(255,150,90,.9)', 2.2);      // u-iso (fixed u, vary v) — orange
    poly3(cv, 'rgba(120,230,160,.9)', 2.2);      // v-iso (fixed v, vary u) — green
  }

  /* ---- tangent plane + normal ---- */
  if ($('chkTan').checked || $('chkNorm').checked) {
    const p = surf(S.u, S.v);
    if (isFinite(p[0])) {
      const { Su, Sv } = partials(S.u, S.v);
      const hu = vlen(Su) > 1e-9 ? .16 * E / vlen(Su) : 0;
      const hv = vlen(Sv) > 1e-9 ? .16 * E / vlen(Sv) : 0;
      const a = scl(Su, hu), b = scl(Sv, hv);
      const c00 = add(add(p, a), b), c10 = add(sub(p, a), b), c11 = sub(sub(p, a), b), c01 = sub(add(p, a), b);
      if ($('chkTan').checked) quad3(c00, c10, c11, c01, 'rgba(110,231,255,.16)');
      if ($('chkNorm').checked) {
        const Nn = nrm(cross(Su, Sv));
        vec(p, scl(Nn, .26 * E), 'rgba(255,120,140,.95)', 2);
      }
    }
  }

  /* ---- current point ---- */
  const p = surf(S.u, S.v);
  if (isFinite(p[0])) {
    dot3p(p, 6.5, true, 'rgba(120,235,255,.95)');
    label(p, `[u=${S.u.toFixed(2)}, v=${S.v.toFixed(2)}]`, 'rgba(190,235,255,.9)');
  }

  renderPBox();
}

/* ========================= parameter-domain box ======================== */
const PB = { padL: 34, padT: 16, padR: 12, padB: 26, cap: null };

function boxGeom() {
  const W = pbox.width, H = pbox.height;
  const L = Math.min(W - PB.padL - PB.padR, H - PB.padT - PB.padB);
  return {
    W, H, L,
    px: u => PB.padL + u * L,
    py: v => PB.padT + L - v * L,      // v up
  };
}
function renderPBox() {
  if (!$('chkBox').checked) return;
  fitCanvas(pbox);                          // size the transparent overlay canvas
  const geo = boxGeom(), { W, H, px, py } = geo;
  const dpr = window.devicePixelRatio || 1;
  const cb = cv3.getBoundingClientRect();
  const pb = pbox.getBoundingClientRect();
  if (!cb.width || !cb.height) return;
  const ox = Math.round((pb.left - cb.left) / cb.width  * cv3.width);
  const oy = Math.round((pb.top  - cb.top)  / cb.height * cv3.height);
  const g = g3;                             // draw the box onto the 3-D canvas...
  g.save();
  g.translate(ox, oy);
  g.setLineDash([]);                        // render3 may leave a dash pattern set
  g.beginPath(); g.rect(0, 0, W, H); g.clip();   // ...clipped to the box area

  /* panel + plot frame */
  g.fillStyle = '#0d1220'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,170,215,.55)'; g.lineWidth = 1.4;
  g.strokeRect(PB.padL, PB.padT, geo.L, geo.L);
  g.font = `${10 * dpr}px ui-monospace, monospace`;
  g.fillStyle = 'rgba(150,175,210,.55)';
  for (let t = .25; t < 1; t += .25) {                 // light grid
    g.strokeStyle = 'rgba(120,170,215,.10)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(px(t), py(0)); g.lineTo(px(t), py(1)); g.stroke();
    g.beginPath(); g.moveTo(px(0), py(t)); g.lineTo(px(1), py(t)); g.stroke();
  }
  g.fillStyle = 'rgba(150,175,210,.55)';
  g.fillText('0', PB.padL - 9, py(0) + 12);
  g.fillText('1', PB.padL + geo.L - 4, py(0) + 12);
  g.fillText('0', PB.padL - 10, py(1) + 4);
  g.fillText('1', PB.padL - 10, py(0) - 5);
  g.fillStyle = 'rgba(255,150,90,.85)'; g.fillText('u →', PB.padL + geo.L + 2, py(0) + 12);
  g.save(); g.translate(11 * dpr, PB.padT + geo.L - geo.L / 2); g.rotate(-Math.PI / 2);
  g.fillStyle = 'rgba(120,230,160,.85)'; g.fillText('v →', -14, 0); g.restore();
  g.fillStyle = 'rgba(200,220,245,.8)'; g.font = `${10.5 * dpr}px ui-monospace, monospace`;
  g.fillText('param domain', PB.padL + 3, PB.padT - 4);

  /* crosshair from the dot to both axes */
  const du = px(S.u), dv = py(S.v);
  g.strokeStyle = 'rgba(180,205,240,.35)'; g.lineWidth = 1; g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(du, py(0)); g.lineTo(du, dv); g.lineTo(px(0), dv); g.stroke();
  g.setLineDash([]);

  /* u-tick (bottom edge) and v-tick (left edge) */
  const tick = (x, y, ang, col) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.strokeStyle = col; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(-4, 6); g.lineTo(4, 6); g.lineTo(0, 12); g.closePath(); g.fill();
    g.restore();
  };
  tick(du, py(0), 0, 'rgba(255,150,90,.95)');          // u handle on bottom edge
  tick(px(0), dv, -Math.PI / 2, 'rgba(120,230,160,.95)'); // v handle on left edge

  /* combined dot */
  g.beginPath(); g.arc(du, dv, 6, 0, TAU);
  g.fillStyle = 'rgba(120,235,255,.95)'; g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.4; g.stroke();

  /* readout */
  g.fillStyle = 'rgba(210,225,245,.9)'; g.font = `${11 * dpr}px ui-monospace, monospace`;
  g.fillText(`u=${S.u.toFixed(2)}  v=${S.v.toFixed(2)}`, PB.padL + 2, H - 5);
  g.restore();
}

/* ============================== status -------------------------------- */
function status() {
  const p = surf(S.u, S.v);
  if (!isFinite(p[0])) { $('status').innerHTML = '<span class="k">surface undefined at this (u, v)</span>'; return; }
  const { Su, Sv } = partials(S.u, S.v);
  const Nn = nrm(cross(Su, Sv));
  $('status').innerHTML =
    `<span class="k">u =</span> ${S.u.toFixed(3)} &nbsp; <span class="k">v =</span> ${S.v.toFixed(3)} &nbsp; <span class="k">→</span> `
    + `S(u,v) = (<span class="pos">${p[0].toFixed(2)}</span>, ${p[1].toFixed(2)}, <span class="pos">${p[2].toFixed(2)}</span>) `
    + `&nbsp;·&nbsp; <span class="k">normal</span> (${Nn[0].toFixed(2)}, ${Nn[1].toFixed(2)}, ${Nn[2].toFixed(2)})`;
}

/* ============================ UI wiring ------------------------------- */
const sel = $('sel');
for (const pr of PRESETS) {
  const o = document.createElement('option');
  o.value = pr.id; o.textContent = pr.name; sel.appendChild(o);
}

function setUV(u, v) {
  S.u = clamp(u, 0, 1); S.v = clamp(v, 0, 1);
  $('ru').value = S.u; $('rv').value = S.v;
  $('uvval').textContent = `u = ${S.u.toFixed(2)} · v = ${S.v.toFixed(2)}`;
}

function loadPreset(pr) {
  S.preset = pr;
  $('lblCustom').classList.toggle('show', pr.id === 'custom');
  const showNet = pr.id === 'rbez' || pr.id === 'rational';
  $('lblRbez').classList.toggle('show', showNet);
  if (pr.id === 'custom') { if (!applyCustom()) return; }
  else if (pr.grid) {
    S.eval = pr.eval; S.grid = pr.grid; S.degU = pr.degU; S.degV = pr.degV;
    $('desc').classList.remove('err'); $('desc').innerHTML = pr.desc;
    if (showNet) fillRBezEditor();   // keep the net editor in sync with the preset
  }
  else { S.eval = pr.eval; S.grid = null; $('desc').classList.remove('err'); $('desc').innerHTML = pr.desc; }
  resample();
  setUV(.5, .5);
}

/* mirror the current net into the editor, so the degree inputs and the
   control-net box match what is drawn (and Apply round-trips) when a Bézier /
   rational preset is chosen instead of showing stale HTML defaults */
function fillRBezEditor() {
  $('degU').value = S.degU;
  $('degV').value = S.degV;
  $('rbezGrid').value = S.grid.map(p => p.map(x => +x.toFixed(8)).join(' ')).join('\n');
}

/* ---- rational / Bézier control-net editor ---- */
let RGRID = [];
function parseGrid(src, degU, degV) {
  const rows = String(src).split(/[;\n]+/).map(s => s.trim()).filter(s => s.length);
  const need = (degU + 1) * (degV + 1);
  if (rows.length < 2) throw new Error('enter at least 2 control points, one per line');
  if (rows.length !== need) throw new Error(`grid needs ${(degU + 1)}×${(degV + 1)} = ${need} points for degree (${degU}, ${degV}); you gave ${rows.length}`);
  const g = rows.map((r, k) => {
    const n = (r.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
    if (n.length < 3) throw new Error(`point ${k + 1}: expected "x y z [weight]"`);
    if (n.length > 4) throw new Error(`point ${k + 1}: too many numbers`);
    if (!n.every(isFinite)) throw new Error(`point ${k + 1}: value not finite`);
    return [n[0], n[1], n[2], n.length === 4 ? n[3] : 1];
  });
  return g;
}
function applyRBezier() {
  try {
    const degU = clamp(parseInt($('degU').value, 10) || 1, 1, 8);
    const degV = clamp(parseInt($('degV').value, 10) || 1, 1, 8);
    RGRID = parseGrid($('rbezGrid').value, degU, degV);
    S.eval = (u, v) => bezierSurf(RGRID, degU, degV, u, v);
    S.grid = RGRID; S.degU = degU; S.degV = degV;
    S.preset = { id: 'rbez', desc: PRESETS.find(p => p.id === 'rational').desc };
    $('desc').classList.remove('err'); $('desc').innerHTML = S.preset.desc;
    resample(); setUV(S.u, S.v);
    return true;
  } catch (e) {
    $('desc').classList.add('err'); $('desc').textContent = 'Control-net error: ' + e.message;
    return false;
  }
}

/* ---- custom analytic patch ---- */
function applyCustom() {
  const mk = (src, name) => {
    const body = `"use strict";const {sin,cos,tan,asin,acos,atan2,sinh,cosh,tanh,sqrt,abs,exp,log,pow,sign,floor,min,max}=Math,pi=Math.PI,tau=Math.PI*2;return (${src});`;
    const fn = new Function('u', 'v', body);
    try { fn(.3, .7); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    return fn;
  };
  try {
    const fx = mk($('cx').value, 'x'), fy = mk($('cy').value, 'y'), fz = mk($('cz').value, 'z');
    S.eval = (u, v) => [fx(u, v), fy(u, v), fz(u, v)];
    S.grid = null;
    S.preset = { id: 'custom', desc: PRESETS.find(p => p.id === 'custom').desc };
    $('desc').classList.remove('err'); $('desc').innerHTML = S.preset.desc;
    resample(); setUV(S.u, S.v);
    return true;
  } catch (e) {
    $('desc').classList.add('err'); $('desc').textContent = 'Custom expression error: ' + e.message;
    return false;
  }
}

/* ---- events ---- */
sel.addEventListener('change', () => loadPreset(PRESETS.find(p => p.id === sel.value)));
$('btnApply').addEventListener('click', () => { if (applyCustom()) loadPreset(S.preset); });
$('btnRbez').addEventListener('click', applyRBezier);
$('ru').addEventListener('input', e => setUV(+e.target.value, S.v));
$('rv').addEventListener('input', e => setUV(S.u, +e.target.value));
$('rngSpeed').addEventListener('input', e => S.speed = +e.target.value);

const btnPlay = $('btnPlay');
const togglePlay = () => { S.playing = !S.playing; btnPlay.textContent = S.playing ? '⏸ pause' : '▶ play'; };
btnPlay.addEventListener('click', togglePlay);

/* Space = play/pause, but only when NOT editing a text field: a global
   space handler would swallow spaces typed into the control-net / custom
   patch editors, so let form controls keep their native behavior. */
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

/* --- 3-D view interaction --- */
function drag(cv, onMove) {
  let last = null;
  cv.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!last) return; onMove(e.clientX - last[0], e.clientY - last[1]); last = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', () => last = null);
  cv.addEventListener('pointercancel', () => last = null);
}
drag(cv3, (dx, dy) => {
  S.yaw += dx * .008;
  S.pitch = clamp(S.pitch + dy * .006, -1.45, 1.45);
});
cv3.addEventListener('wheel', e => { e.preventDefault(); S.zoom3 = clamp(S.zoom3 * Math.exp(-e.deltaY * .001), .25, 5); }, { passive: false });

/* --- parameter-box interaction (dot / u-tick / v-tick) --- */
function pboxUV(ev) {
  const r = pbox.getBoundingClientRect();
  const sx = pbox.width / r.width, sy = pbox.height / r.height;
  const X = (ev.clientX - r.left) * sx, Y = (ev.clientY - r.top) * sy;
  const geo = boxGeom(), { px, py } = geo;
  const u = clamp((X - PB.padL) / geo.L, 0, 1);
  const v = clamp((PB.padT + geo.L - Y) / geo.L, 0, 1);
  return { X, Y, u, v, px, py };
}
pbox.addEventListener('pointerdown', ev => {
  const { X, Y, u, v, px, py } = pboxUV(ev);
  const nearV = Math.abs(X - px(0)) < 11;                 // left edge  → v handle
  const nearU = Math.abs(Y - py(0)) < 11;                 // bottom edge → u handle
  const dDot = Math.hypot(X - px(u), Y - py(v));
  if (nearV && Math.abs(v - S.v) < .5 && !(nearU && Math.abs(u - S.u) < .5)) PB.cap = 'v';
  else if (nearU && Math.abs(u - S.u) < .5) PB.cap = 'u';
  else PB.cap = 'dot';
  setUV(u, v);
  pbox.setPointerCapture(ev.pointerId);
});
pbox.addEventListener('pointermove', ev => {
  if (!PB.cap) return;
  const { u, v } = pboxUV(ev);
  if (PB.cap === 'u') setUV(u, S.v);
  else if (PB.cap === 'v') setUV(S.u, v);
  else setUV(u, v);
});
pbox.addEventListener('pointerup', () => PB.cap = null);
pbox.addEventListener('pointercancel', () => PB.cap = null);

/* ============================== main loop ============================== */
let prev = null;
function frame(now) {
  if (prev === null) prev = now;
  const dt = Math.min(.05, (now - prev) / 1000);
  prev = now;
  if (S.playing) {
    const ph = now / 1000;
    setUV(.5 + .46 * Math.sin(TAU * ph * .19), .5 + .46 * Math.sin(TAU * ph * .31 + 1.1));
  }
  render3(now);
  status();
  requestAnimationFrame(frame);
}

/* ---- deep links: ?preset=…&u=…&v=… ---- */
const q = k => (window.location && window.location.search) ? new URLSearchParams(window.location.search).get(k) : null;
const start = PRESETS.find(p => p.id === q('preset')) || PRESETS[0];
sel.value = start.id;
loadPreset(start);
{
  const uu = q('u'), vv = q('v');
  if (uu !== null || vv !== null) setUV(uu !== null ? parseFloat(uu) : .5, vv !== null ? parseFloat(vv) : .5);
}
frame(0);
