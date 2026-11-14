# de Casteljau, Subdivision, and Degree Elevation
### CAGD Tutorial — *Bézier Curve Studio* (`Bezier/`)

**Open it:** `Bezier/index.html`.

This is the first **CAD-focused** demo: a plain 2-D Bézier curve over a
draggable control net, with the machinery that underlies real spline
software laid bare — the intermediate polygons of **de Casteljau**,
**subdivision** into two halves, and **degree elevation**.

---

## 1. The Bézier curve

Given control points `P₀,…,Pₙ`,

$$
\mathbf C(t) = \sum_{i=0}^{n} B^n_i(t)\,\mathbf P_i,\qquad
B^n_i(t) = \binom{n}{i} t^i (1-t)^{n-i},\quad t\in[0,1].
$$

Key facts you can verify on screen: the curve interpolates the endpoints
`C(0)=P₀`, `C(1)=Pₙ`; it stays inside the convex hull of the net; and it is
tangent to the first/last net edges.

> **Reading the demo.** Drag any control point to reshape the curve; use
> **Add / Remove** to change the number of points. The net is the blue
> polygon; the curve hugs it but rarely touches interior points.

---

## 2. The de Casteljau algorithm

Evaluating `C(t)` stably — and getting everything else for free — is done by
**recursive linear interpolation**. Seed with the control points and
interpolate toward each other:

$$
\mathbf P^0_i = \mathbf P_i\ (i=0,\dots,n),\qquad
\mathbf P^r_i(t) = (1-t)\,\mathbf P^{r-1}_i + t\,\mathbf P^{r-1}_{i+1}.
$$

After `n` levels only one point remains:

$$
\mathbf C(t) = \mathbf P^n_0(t).
$$

Geometrically the intermediate points `P¹ᵢ, P²ᵢ, …` form a shrinking stack
of polygons — the **de Casteljau triangle**. The demo draws these
intermediate polygons for the current `t`, so you literally see the curve's
value being "triangulated" out of the net.

### 2.1 Derivative for free

The bottom edge of the triangle gives the tangent:

$$
\mathbf C'(t) = n\sum_{i=0}^{n-1} B^{n-1}_i(t)\,\bigl(\mathbf P_{i+1}-\mathbf P_i\bigr),
$$

i.e. the derivative is a degree-`n−1` Bézier curve built from the net's edge
vectors. `C′(t)` points along the direction the moving marker travels.

---

## 3. Subdivision

Cut the curve at parameter `t`. The de Casteljau triangle hands you **both
halves for free**, read off its two slanted edges:

- **Left half on `[0, t]`** (drawn **green**): control points down the left
  edge, `L_r = P^r_0` for `r = 0,…,n`.
- **Right half on `[t, 1]`** (drawn **magenta**): control points down the
  right edge, `R_r = P^r_{n-r}` for `r = 0,…,n`.

Both share the tip `L_n = R_n = C(t)`, the split point. Each half is a
**new Bézier curve with its own control net and its own local parameter**
`τ ∈ [0,1]`; the demo shows each half's local-`τ` evaluation point separately.

> **Reading the demo.** Set the split `t`. The green polygon + curve is the
> piece you'd get by reparametrizing `[0,t]→[0,1]`; the magenta one is `[t,1]`.
> Because the new nets are read straight off the triangle, subdivision needs
> no extra evaluation — this is how rendering engines recursively refine
> curves until each piece is "flat enough."

**Why it matters:** subdivision gives *local* control, adaptive rendering,
and the foundation of spline refinement. Repeating it (midpoint split,
`t = ½`) makes the nets converge to the curve — **Chaikin-like** refinement.

---

## 4. Degree elevation

The *same* curve can be written at a higher degree. Raising `n → n+1`, the
new control points are

$$
\mathbf Q_i = \frac{i}{n+1}\,\mathbf P_{i-1}
            + \Bigl(1-\frac{i}{n+1}\Bigr)\,\mathbf P_{i},
\qquad i = 0,\dots,n+1,
$$

with the out-of-range `P₋₁` and `Pₙ₊₁` dropped, so `Q₀ = P₀` and
`Qₙ₊₁ = Pₙ`. The geometry is unchanged; only the **net** moves — inward,
hugging the curve more tightly.

> **Reading the demo.** Apply **Degree Elevation** repeatedly. Watch the net
> tighten onto the curve: each elevation reduces how far the net can stray.
> In the limit the net *is* the curve — but you never reach it in finitely
> many steps.

**Why it matters:** degree elevation is how heterogeneous patches are made
compatible (match the highest degree in a surface network) and how you trade
point count for fidelity. The trade-off is exactly the opposite of
subdivision: elevation raises the polynomial degree globally; subdivision
keeps the degree and adds *pieces*.

---

## 5. Suggested in-class walk-through

1. **Evaluate.** Pick a `t`, read off `C(t)` where the de Casteljau triangle
   collapses to a point. Verify against the direct Bernstein formula for a
   quadratic.
2. **Subdivide.** Split at `t`; confirm the green and magenta pieces join
   smoothly at `C(t)` and that concatenating their nets reproduces the
   original curve exactly.
3. **Refine.** Subdivide repeatedly at `t = ½` and watch the nets converge.
4. **Elevate.** Apply degree elevation several times; contrast the
   "one high-degree net tightening" against "many low-degree pieces" from
   subdivision.
5. **Pause.** Press **Space** to freeze the moving `t` marker (it won't fire
   while a text field is focused, so editor typing still works).

## 6. Exercises

1. Prove `C(t) = Pⁿ₀(t)` by induction on the recursion in §2.
2. Show the left-edge points `P^r_0` are the control points of `C` restricted
   to `[0,t]` reparametrized to `[0,1]`.
3. Verify the degree-elevation formula reproduces the same curve by checking
   `Σ Bⁿ⁺¹ᵢ Qᵢ ≡ Σ Bⁿᵢ Pᵢ`.
4. Compare one midpoint **subdivision** with one **degree elevation**: which
   reduces the max distance from net to curve, and why do CAD systems use
   both?

## 7. Take-away

de Casteljau is the single algorithm that gives you evaluation, tangents,
and — by reading its two edges — subdivision into two exact sub-curves.
Subdivision adds pieces at fixed degree; degree elevation raises the degree
at fixed pieces. Together they are the core refinement toolkit behind every
modern CAD/spline kernel.