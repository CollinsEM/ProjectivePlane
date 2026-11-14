# Projective Surfaces in ℝP²
### CAGD Tutorial — *Projective Manifold Explorer* (`ParamManifold/`)

**Open it:** `ParamManifold/index.html`.

---

## 1. What is new here

This is `ParamCurve`'s idea promoted from curves to **surfaces**, and it is
the most "projective-geometry" of the four demos. A surface is defined in
**homogeneous ℝ³** with coordinates `(x, y, w)`, and every point is
projected through the origin onto the **affine chart**

$$
(a,b) = \Bigl(\frac{x}{w},\ \frac{y}{w}\Bigr).
$$

Because a projective point is a whole ray, the *same* surface in ℝP² can be
drawn from two representatives, and the demo makes that identification
visible.

---

## 2. Theory

### 2.1 The model again, for surfaces

$$
\mathbb{RP}^2 = \bigl(\mathbb{R}^3\setminus\{\mathbf 0\}\bigr)/{\sim},
\qquad \mathbf p \sim \lambda\mathbf p .
$$

A **projective surface / manifold** is a map into homogeneous space,

$$
\mathbf X(u,v) = \bigl(x(u,v),\ y(u,v),\ w(u,v)\bigr)\in\mathbb{R}^3,
$$

viewed in the chart via `π(x,y,w) = (x/w, y/w)`. Two parameter values whose
images are antipodal, `X` and `−X`, are the **same** projective point.

> **Reading the demo.** Two panes are animated together:
> `#c3` draws `X(u,v)` in homogeneous ℝ³ `(x, y, w)`;
> `#c2` draws its chart image `(a,b) = (x/w, y/w)`.
> A single `resample()` feeds both, so moving the `(u,v)` marker walks both
> panes in lock-step.

### 2.2 The antipode and sign(w) colouring

Because `p ~ −p`, every projective point has two representatives in the
ball `|X| = const`: one with `w ≥ 0` (the "upper" hemisphere side) and its
antipode with `w < 0`. The demo encodes this by colour:

- **teal** where `w ≥ 0` — the upper representative,
- **magenta** where `w < 0` — the antipode `−p`, which is the *same*
  projective point.

The `w < 0` iso-net in the chart is drawn **dashed** for the same reason:
it is the antipodal copy, overdrawn on top of the real chart.

> **Why this matters.** ℝP² is *non-orientable* and cannot be embedded in
> ℝ³ without self-intersection. The two-colour picture is a concrete way to
> see that the model "closes up": the teal region and the magenta region are
> two charts gluing into one surface.

### 2.3 The line at infinity ℓ∞

The chart breaks down exactly where `w = 0`. The demo draws the chart window
border **dashed**, and that border *is* the line at infinity `ℓ∞ = {w = 0}`.
Any part of the surface with `w → 0` flies off to the border; anything
crossing `w = 0` re-enters from the opposite side.

> **Reading the demo.** Watch the iso-net as `w` changes sign: the mesh
> crosses the dashed frame (`ℓ∞`), disappears, and returns — the surface's
> "points at infinity" made literal.

### 2.4 Preset 1 — the sphere is ℝP²

The sphere preset is the statement

$$
\mathbb{RP}^2 \;\cong\; S^2 / {\pm},
$$

i.e. the 2-sphere with antipodal points identified. Great circles (the
"straight lines" of the spherical model) project to **projective lines** in
the chart — straight `a,b` lines, possibly wrapped through `ℓ∞`. A
projective line in ℝP² is a closed loop: it goes out through infinity and
comes back the other way, which the two-pane view shows beautifully.

### 2.5 Preset 2 — a bowl crossing the horizon

The second preset is the surface

$$
w = 1 - x^2 - y^2 ,
$$

a paraboloid-style **bowl** that intersects the horizon `w = 0` on the unit
circle `x² + y² = 1`. Inside the circle `w > 0` (teal, finite in the chart);
outside, `w < 0` (magenta, the antipodal chart). The unit circle is exactly
where the chart image runs off to `ℓ∞`. This is the surface analogue of the
hyperbola crossing infinity in the curve demo.

---

## 3. Suggested in-class walk-through

1. **Sphere.** Load the sphere. Confirm teal = upper hemisphere, magenta =
   lower, and that antipodal points share a projective identity. Trace a
   great circle and watch it become a straight (wrapped) line in the chart.
2. **Bowl.** Load `w = 1 − x² − y²`. Find the unit circle where `w = 0`;
   note the teal interior mapping to a finite disk and the magenta exterior
   mapping through `ℓ∞`.
3. **Cross the horizon.** Move the `(u,v)` marker until the surface point
   hits `w = 0`; watch it exit the dashed frame and re-enter opposite.
4. **Freeze.** Press **Space** to pause both panes at one `(u,v)`.

## 4. Exercises

1. Show that if `X(u,v)` lies on the sphere then `−X(u,v)` is its antipode
   and both satisfy `π(X) = π(−X)`.
2. For the bowl, prove the horizon `w = 0` is the unit circle and determine
   which side is finite in the chart.
3. Explain why a projective line (image of a great circle) is topologically
   a circle, not an open line, using the `ℓ∞` wrap-around.
4. Why can't ℝP² be embedded in ℝ³ without self-intersection, and how does
   the two-colour (teal/magenta) model sidestep that?

## 5. Take-away

A projective surface is just a surface in homogeneous ℝ³ seen through the
origin — the same lift-and-project recipe as the curve demo, now in two
parameters. The sign(`w`) colouring and the dashed `ℓ∞` frame turn the
abstract identifications of ℝP² (antipodes equal, points at infinity) into
something you can literally watch on screen.