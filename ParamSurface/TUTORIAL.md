# Tensor-Product Bézier and Rational Surface Patches
### CAGD Tutorial — *Parametric Surface Explorer* (`ParamSurface/`)

**Open it:** `ParamSurface/index.html`.

---

## 1. Why surfaces, and why tensor products

Curves are functions of one parameter; surfaces are functions of **two**.
A patch is a map from a square parameter domain into space:

$$
\mathbf S : [0,1]^2 \to \mathbb{R}^3,\qquad (u,v)\mapsto \mathbf S(u,v).
$$

The cleanest way to build a 2-D basis from a 1-D basis is the **tensor
product**: take the Bézier basis in `u` and in `v` independently and
multiply. The result is a grid of `(n+1)(m+1)` control points
`Pᵢⱼ` that shape the patch the same way a polygon shapes a curve.

---

## 2. Theory

### 2.1 The tensor-product Bézier patch

$$
\boxed{\ \mathbf S(u,v) = \sum_{i=0}^{n}\sum_{j=0}^{m}
B^n_i(u)\,B^m_j(v)\,\mathbf P_{ij}\ }
\qquad (u,v)\in[0,1]^2,
$$

with the 1-D Bernstein polynomials

$$
B^n_i(t) = \binom{n}{i} t^i (1-t)^{n-i}.
$$

Special cases you should recognize instantly:

- **Bilinear** (`n = m = 1`, a quad):
  `S(u,v) = (1−u)(1−v)P₀₀ + (1−u)v P₀₁ + u(1−v)P₁₀ + uv P₁₁`.
- **Bicubic** (`n = m = 3`, 16 control points): the workhorse of
  Coons/Bézier patch sheets.

### 2.2 Inherited properties (all carry over from curves)

- **Partition of unity / affine invariance.** `Σᵢⱼ Bⁿᵢ(u)Bᵐⱼ(v) = 1`, so
  `S(u,v)` is always an affine combination of the `Pᵢⱼ`. Moving a control
  point moves the patch; the patch never "escapes" the control net.
- **Convex-hull property.** `S(u,v)` lies in the convex hull of `{Pᵢⱼ}` —
  the net bounds the surface, which is why it is useful for collision and
  bounding-box tests.
- **Endpoint / edge interpolation.** The four corners `P₀₀, P₀ₘ, Pₙ₀, Pₙₘ`
  lie on the surface, and the boundary curves are the Bézier curves along
  the net's edges (e.g. `S(u,0) = Σᵢ Bⁿᵢ(u) Pᵢ₀`).
- **Isoparametric lines.** Holding `u = u₀` gives a *v-curve*
  `S(u₀, ·)`; holding `v = v₀` gives a *u-curve*. The demo's parameter
  marker traces these; together they draw the patch's mesh.

> **Reading the demo.** The single pane renders the patch in ordinary ℝ³
> `(x, y, z)` with a resampled grid (`S.g`) drawn as a mesh, and a marker at
> the current `(u, v)`. Drag the `u`/`v` sliders (or use the deep link
> `?u=…&v=…`) to walk the marker across the domain and watch an isoparametric
> crosshair follow on the surface.

### 2.3 Rational (weighted) tensor-product patches

Give each control point a weight `wᵢⱼ > 0`:

$$
\mathbf S(u,v) =
\frac{\displaystyle\sum_{i,j} w_{ij}\,B^n_i(u)B^m_j(v)\,\mathbf P_{ij}}
     {\displaystyle\sum_{i,j} w_{ij}\,B^n_i(u)B^m_j(v)}.
$$

This is the surface analogue of §2.3 in the curve tutorial and the local
form of a **NURBS patch**. Weights let you represent exactly curved features
that polynomial patches cannot — most importantly pieces of **spheres and
cones**, which are genuinely rational.

> **Reading the demo.** Load the rational-Bézier patch preset / editor.
> Adjusting weights bends the surface without moving any control point —
> the same "weights tug the surface" intuition as for curves, now over a grid.

### 2.4 Tangent plane and normal

The surface's local geometry comes from its two partial derivatives:

$$
\mathbf S_u = \frac{\partial \mathbf S}{\partial u}
= \sum_{i,j}\bigl(B^n_i\bigr)'(u)\,B^m_j(v)\,\mathbf P_{ij},
\qquad
\bigl(B^n_i\bigr)'(t) = n\bigl(B^{n-1}_{i-1}(t) - B^{n-1}_{i}(t)\bigr),
$$

and `Sᵥ` analogously. They span the **tangent plane**, and the unit normal is

$$
\mathbf N(u,v) = \frac{\mathbf S_u \times \mathbf S_v}
                      {\lVert \mathbf S_u \times \mathbf S_v\rVert}.
$$

Where `Sᵤ × Sᵥ = 0` the patch is **singular** (the normal is undefined —
think of the pole of a sphere). This is the surface version of "the
derivative of a Bézier curve is a degree-`n−1` Bézier curve built from edge
vectors `n(Pᵢ₊₁ − Pᵢ)`."

---

## 3. Suggested in-class walk-through

1. **Bilinear first.** Start from a degree `(1,1)` patch: confirm it is a
   (possibly twisted) quad and that its four edges are straight lines.
2. **Go bicubic.** Raise to `(3,3)` and wiggle a single interior control
   point. Note the *local* bump — the convex-hull property keeps the change
   inside the net.
3. **Isoparametric tracing.** Move `u` and `v` independently; watch the two
   families of iso-curves sweep the surface and the marker ride their
   intersection.
4. **Rational sphere piece.** Load a weighted patch that approximates (or is
   exactly) a spherical cap; vary a weight and see the surface bulge toward
   a true sphere.

## 4. Exercises

1. Prove the corner `S(0,0) = P₀₀` and that the boundary `S(u,0)` is the
   Bézier curve with control points `P₀₀,…,Pₙ₀`.
2. Show `Σᵢⱼ Bⁿᵢ(u)Bᵐⱼ(v) = 1` from `Σᵢ Bⁿᵢ ≡ 1`.
3. For the bilinear patch, compute `Sᵤ`, `Sᵥ`, and `N`; show the surface is
   generally **not** planar even though it has only four control points.
4. Explain why a exact quarter-sphere needs a *rational* bicubic patch and
   cannot be a polynomial one.

## 5. Take-away

Tensor products let a whole CAD surface library be built from a single
1-D Bézier routine applied in each direction. Partition of unity, convex
hull, edge interpolation, and the `u`/`v` tangent frame all lift
straight from curves — and rational weights add exact spheres and cones.