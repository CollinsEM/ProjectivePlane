# Homogeneous Coordinates and Rational Curves
### CAGD Tutorial — *Projective Plane Explorer* (`ParamCurve/`)

**Open it:** `ParamCurve/index.html` (double-click; no server needed).

---

## 1. The problem this demo solves

In CAD we rarely want to represent only "finite" points. Lines meet at
points at infinity, circles and conics are most cleanly written with
weights, and perspective/projection is everywhere (cameras, isometric
views, projective texture mapping). The tool that unifies all of this is
the **homogeneous (projective) model** of the plane. This demo lets you
*see* the two worlds side by side:

- the **homogeneous space** ℝ³ with coordinates `(x, y, w)`, where a plane
  curve is just an ordinary (polynomial) space curve, and
- the **affine chart** ℝP² with coordinates `(u, v)`, obtained by projecting
  that space curve **through the origin**.

---

## 2. Theory

### 2.1 Homogeneous coordinates

A point of the **real projective plane** is an entire line through the
origin of ℝ³ (minus the origin itself):

$$
\mathbb{RP}^2 \;=\; \bigl(\mathbb{R}^3 \setminus \{\mathbf 0\}\bigr)\big/{\sim},
\qquad
\mathbf p \sim \lambda\,\mathbf p \ \ (\lambda \neq 0).
$$

We write the equivalence class of `(x, y, w)` as `[x : y : w]`. Every
nonzero scalar multiple is the *same* projective point.

When `w ≠ 0` we may normalize by `w` and recover ordinary affine
coordinates by **central projection through the origin**:

$$
\pi(x,y,w) \;=\; \Bigl(\frac{x}{w},\ \frac{y}{w}\Bigr) \;=\; (u,v).
$$

The set `w = 0` never reaches a finite `(u,v)`; it is the **line at
infinity** `ℓ∞`. Topologically, `ℓ∞ ≅ ℝP¹`: it is itself a projective
line, and every family of parallel affine lines meets there.

> **Reading the demo.** The `#c3` pane draws the curve in homogeneous
> ℝ³ `(x, y, w)`; the chart pane draws its projection `(u, v) = (x/w, y/w)`.
> Watch a point whose `w`-coordinate passes through `0`: in the chart it
> slides off toward `ℓ∞` and reappears on the opposite side — exactly the
> "wrap-around at infinity" that affine coordinates cannot express.

### 2.2 Rational Bézier curves

An ordinary (non-rational) Bézier curve of degree `n` with control points
`P₀,…,Pₙ` is

$$
\mathbf C(t) = \sum_{i=0}^{n} B^n_i(t)\,\mathbf P_i,\qquad
B^n_i(t) = \binom{n}{i} t^i (1-t)^{n-i},\quad t\in[0,1].
$$

A **rational** Bézier curve attaches a weight `wᵢ > 0` to each control
point:

$$
\mathbf C(t) \;=\;
\frac{\displaystyle\sum_{i=0}^{n} w_i\, B^n_i(t)\,\mathbf P_i}
     {\displaystyle\sum_{i=0}^{n} w_i\, B^n_i(t)}.
$$

### 2.3 The key trick: lift, then project

The denominator is what makes rational curves annoying to manipulate
directly. Homogeneous coordinates remove it. **Lift** each 2-D control
point into ℝ³ by appending its weight:

$$
\mathbf P_i = (x_i, y_i)
\ \longmapsto\
\widehat{\mathbf P}_i = (w_i x_i,\ w_i y_i,\ w_i)\in\mathbb{R}^3 .
$$

Now build an *ordinary* polynomial Bézier curve **in ℝ³**:

$$
\widehat{\mathbf C}(t) = \sum_{i=0}^{n} B^n_i(t)\,\widehat{\mathbf P}_i
\;=\;\bigl(\hat x(t),\ \hat y(t),\ \hat w(t)\bigr).
$$

Finally project back through the origin (§2.1):

$$
\mathbf C(t) = \pi\bigl(\widehat{\mathbf C}(t)\bigr)
= \Bigl(\tfrac{\hat x(t)}{\hat w(t)},\ \tfrac{\hat y(t)}{\hat w(t)}\Bigr).
$$

This is *exactly* the two-pane picture: the smooth space curve
`Ĉ(t)` in `(x, y, w)` and its shadow `(u, v)` in the chart. The rational
curve is nothing but a polynomial space curve seen through the origin.

> **Reading the demo.** Load a rational-Bézier preset. The space pane shows
> `Ĉ(t)` living in 3-D; the chart pane shows the rational curve you actually
> care about. Toggle/adjust the weights and observe how the *same* projection
> rule reshapes the affine curve. This is why CAD systems store NURBS control
> points as weighted 3-D/4-D points and only "divide out" `w` at display time.

### 2.4 Conics as rational quadratics

A degree-2 rational Bézier with endpoint weights `w₀ = w₂ = 1` and middle
weight `w₁` is an **exact conic**. Its type is decided by `w₁`:

| middle weight | conic |
|---|---|
| `w₁ < 1` | ellipse (includes the circle) |
| `w₁ = 1` | parabola |
| `w₁ > 1` | hyperbola |

The hyperbola branch is where `ŵ(t)` crosses zero — the curve runs off to
`ℓ∞` and returns on the other branch, something a polynomial curve can
never do.

---

## 3. Suggested in-class walk-through

1. **Start with equal weights.** Pick a preset with all `wᵢ = 1`. Confirm
   the space curve and the chart curve "look the same" up to the `w=1`
   plane — projection is trivial when `w` is constant.
2. **Vary one weight.** Increase a middle weight and watch the affine curve
   be *pulled toward* its control point (weights tug the curve toward the
   net). In the space pane the lifted curve rises in `w`; in the chart the
   division `x/w` shrinks that region.
3. **Hit the horizon.** Push a weight so the curve crosses `w = 0`. Note the
   chart point escaping to `ℓ∞` and re-entering — the visual meaning of a
   hyperbola's branches.
4. **Pause the animation.** Press **Space** to freeze the moving parameter
   marker in both panes and inspect a single `t`. (Space only pauses when a
   text field is *not* focused, so you can still type in the point editor.)

## 4. Exercises

1. Derive `π(λx, λy, λw) = π(x, y, w)` and explain geometrically why the
   whole ray projects to one point.
2. For a quadratic with `P₀=(−1,0)`, `P₂=(1,0)`, `P₁=(0,h)`, show that
   `w₁ = 1` gives a parabola and find its equation. What does increasing
   `w₁` do to the sag?
3. Prove the partition-of-unity property `Σᵢ Bⁿᵢ(t) = 1` and use it to show
   the curve lies in the convex hull of its control points.
4. Explain, using the lift `P̂ᵢ = (wᵢxᵢ, wᵢyᵢ, wᵢ)`, why scaling *all*
   weights by the same constant `λ` leaves the chart curve unchanged.

## 5. Take-away

Homogeneous coordinates trade a *rational* curve with a denominator for a
*polynomial* space curve plus a projection. All the hard parts (weights,
points at infinity, conic branches) become ordinary linear algebra in ℝ³
and a single division at the end — the exact architecture every NURBS
pipeline uses.