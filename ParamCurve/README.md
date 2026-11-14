# Projective Plane Explorer

A dependency-free HTML/CSS/JS miniapp for visualizing a core idea of projective
geometry: **the projective plane ℝP² is the set of lines through the origin of
3D homogeneous space ℝ³**, and curves in ℝ³ project through the origin into
curves in ℝP².

Open `index.html` in any browser — no build step, no internet needed.

![layout](docs/shot.png)

## What you see

| Left pane — homogeneous space ℝ³ (x, y, w) | Right pane — projective plane ℝP² |
|---|---|
| the curve p(t) = (x(t), y(t), w(t)) | its projection [p(t)] drawn in the affine chart w = 1 |
| the projection **cone**: rays from O through the curve | chart coordinates (u, v) = (x/w, y/w) |
| the **chart plane** w = 1 (the 2D view is exactly its contents) | dashed border = **line at infinity ℓ∞** (w = 0) |
| the **horizon plane** w = 0 through O | parts of the curve with w < 0 are drawn through their antipode −p |
| the sphere of directions S² (double cover of ℝP², S²/±1) | paired ◂ ○ markers = the same point of ℓ∞, where the curve leaves and returns |

A single animated point ties the views together: the dot p(t) in 3D, its ray
through O, its antipode −p(t), its hit on the plane w = 1, and the matching
point in the 2D chart (all in the same hue, which runs along the curve).

## Presets (each demonstrates one projective fact)

1. **Line through O → projective point** — a whole line [λx : λy : λw] is one point.
2. **Plane through O → projective line** — a line in the chart closes up at ℓ∞ (ℝP¹ ≅ circle).
3. **Circle in w = 1 → circle** — the trivial case.
4. **Tilted circle → ellipse**, 5. **critical tilt → parabola**, 6. **cutting the
   horizon → hyperbola**: conic sections *are* circle-cones; the hyperbola's two
   branches are one **closed loop** in ℝP².
7. **Twisted cubic (1, t, t²)** → the parabola u = v², with p(0) on the horizon.
8. **Spherical spiral** — antipodal endpoints = one projective point, closed loop.
9. **Viviani's curve** on S² — pinches at ±(0, 0, 1): a node in ℝP².
10. **Rational Bézier** — enter control points as `x y [weight]`; the homogeneous
    Bézier curve in ℝ³ projects to the classic rational Bézier C(t) = Σ BᵢwᵢPᵢ ÷ Σ Bᵢwᵢ.
    The default weights (1, √2⁄2, 1) give an exact quarter circle; a negative weight
    drives the curve through the horizon (convex-hull property, seen projectively).
11. **Custom x(t), y(t), w(t)** — type any parametrization.

## Controls

- drag / scroll-wheel: rotate & zoom the 3D view; pan & zoom the chart
- play/pause (or `Space`), speed, and a t-slider to scrub the animated point
- checkboxes: cone, chart plane w=1, horizon w=0, sphere S², the normalized
  curve p/|p| on S² (with its antipodal copy), the antipodal point −p(t)
- deep links: `index.html?preset=hyperbola&t=0.72` opens a preset directly with
  the animation parked at a given fraction of t (both optional). `pts=x y w;x y w;…`
  also pre-fills the rational Bézier control points (semicolons become newlines),
  e.g. `index.html?preset=rbez&pts=1+0+1;1+1+-2;0+1+1&t=1`

## Files

- `index.html` — layout and controls
- `styles.css` — dark theme
- `app.js` — presets, orthographic 3D renderer, chart renderer
  (Liang–Barsky clipping, antipodal re-entry markers), animation loop
