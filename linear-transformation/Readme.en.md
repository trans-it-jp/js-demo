# 2D coordinate transforms with 3×3 matrices

[日本語](Readme.md)

Teaching material for working through **2D coordinate transforms**, visualised with D3.js. The lesson list opens from [index.html](index.html).

The grid is drawn with square cells, and you can watch the transformed grid, the basis vectors and any shape you draw yourself (line, circle, rectangle, freehand) move together.

- [Linear transforms](pages/linear.html)
- [Translation](pages/translation.html)
- [Linear transform and translation](pages/affine.html)
- [Rotation about the origin](pages/rotation-origin.html)
- [Rotation about an arbitrary point](pages/rotation-pivot.html)

> This implementation uses the **column-vector** convention. For a point $v = [x, y, 1]^T$, matrices multiply from the left.
> Applying a composition $M = A \cdot B$ gives $v' = Mv = (A \cdot B)v = A(Bv)$, so the factors act **right to left** ($B \rightarrow A$).

---

## Contents

1. Matrix basics
2. Matrix operations
3. Inverse matrices
4. Linear transforms (2×2)
5. Extending linear transforms (3×3)
6. Decomposing rotation about an arbitrary point, and the general form
7. Using this site
8. Worked examples and exercises
9. Cheat sheet
10. Appendix: column vectors and row vectors

---

## Matrix basics

- **Vector**: a quantity representing a point or a direction in 2D. As a column vector,

```math
\mathbf{v} = \begin{bmatrix} x \\ y \end{bmatrix}
```

- **Matrix**: a table of numbers expressing a rule that sends one vector to another. A 2D linear transform is

```math
\mathbf{v}' = A \mathbf{v}, \quad A \in \mathbb{R}^{2\times 2}
```

- **Identity matrix** $I$: the matrix that leaves every vector unchanged.

```math
I = \begin{bmatrix}1&0\\0&1\end{bmatrix}
```

- **Homogeneous coordinates**: to handle translation with a matrix as well, extend $[x, y] \to [x, y, 1]$ and use 3×3 matrices.

---

## Matrix operations

- **Sum**: $A+B$ (same size)
- **Scalar multiple**: $\alpha A$
- **Product**: $AB$ (defined when the inner dimensions agree). In general **not commutative** ($AB \ne BA$).
- **Properties**
  - Associative: $(AB)C = A(BC)$
  - Distributive: $A(B+C) = AB + AC$
  - Commutative: does not hold in general
- **Order of composition** (column vectors)

```math
\mathbf{v}' = (A \cdot B)\,\mathbf{v} \quad\Rightarrow\quad \text{the factors act } B \rightarrow A
```

---

## Inverse matrices

- **Definition**: a matrix $A^{-1}$ with $A^{-1}A = I$ is the inverse of $A$ — it undoes the transform.
- **When it exists**: exactly when the determinant $\det(A) \ne 0$ (the matrix is non-singular). $\det(A)=0$ means information has been collapsed and the transform cannot be undone.
- **Explicit 2×2 formula**

```math
A=\begin{bmatrix}a&b\\c&d\end{bmatrix},\quad \det(A)=ad-bc\ne 0
```

```math
A^{-1}=\frac{1}{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}
```

- **Property**: $(AB)^{-1} = B^{-1}A^{-1}$ — the order reverses.
- **Geometric meaning**: $|\det(A)|$ is the factor by which area changes. If $|\det(A)|=2$, areas double.

---

## Linear transforms (2×2)

A linear transform is a geometric transform that keeps the origin fixed. The common cases and their matrices:

- **Scaling**

```math
S(s_x,s_y)=\begin{bmatrix}s_x&0\\0&s_y\end{bmatrix}
```

- **Rotation** (about the origin, by an angle $\theta$)

```math
R(\theta)=\begin{bmatrix}\cos\theta&-\sin\theta\\[2pt]\sin\theta&\cos\theta\end{bmatrix}
```

- **Shear**

```math
\mathrm{Shear}_x(k)=\begin{bmatrix}1&k\\0&1\end{bmatrix},\quad
\mathrm{Shear}_y(k)=\begin{bmatrix}1&0\\k&1\end{bmatrix}
```

- **Reflection** (in the x axis)

```math
\mathrm{Ref}_x=\begin{bmatrix}1&0\\0&-1\end{bmatrix}
```

**Circle to ellipse**: a general linear transform sends a circle to an ellipse (a rotation composed with an anisotropic scaling).

---

## Extending linear transforms (3×3)

An **affine transform**, translation included, can be written with homogeneous coordinates $[x,y,1]^T$ and a 3×3 matrix.

- **Translation**

```math
T(t_x,t_y)=
\begin{bmatrix}
  1&0&t_x\\
  0&1&t_y\\
  0&0&1
\end{bmatrix}
\quad\Rightarrow\quad T(t_x,t_y)^{-1}=T(-t_x,-t_y)
```

- **General affine transform, including its linear part**

```math
A_{\text{affine}}=
\begin{bmatrix}
  a&b&t_x\\
  c&d&t_y\\
  0&0&1
\end{bmatrix},\quad
\begin{bmatrix}x'\\y'\\1\end{bmatrix}
=
A_{\text{affine}}
\begin{bmatrix}x\\y\\1\end{bmatrix}
```

---

## Decomposing rotation about an arbitrary point, and the general form

Rotating by an angle $\theta$ about a point $c=(c_x,c_y)$ decomposes into **three steps** (column vectors):

1. **Move the chosen point to the origin** (the inverse translation)
```math
T(-c_x,-c_y)
```
2. **Rotate about the origin**
```math
R(\theta)=
\begin{bmatrix}
  \cos\theta&-\sin\theta&0\\
  \sin\theta& \cos\theta&0\\
  0&0&1
\end{bmatrix}
```
3. **Put the point back where it was**
```math
T(c_x,c_y)
```

So the **combined matrix** is

```math
M = T(c_x,c_y)\, R(\theta)\, T(-c_x,-c_y)
```

(acting right to left: first $T(-c)$, then $R$, and finally $T(c)$).

Expanding the product gives the **general 3×3 form** of $M$:

```math
M=
\begin{bmatrix}
\cos\theta & -\sin\theta & c_x(1-\cos\theta)+c_y\sin\theta \\
\sin\theta & \cos\theta  & -c_x\sin\theta + c_y(1-\cos\theta) \\
0          & 0           & 1
\end{bmatrix}.
```

The equivalent **coordinate form** is

```math
\begin{aligned}
x' &= c_x + (x-c_x)\cos\theta - (y-c_y)\sin\theta,\\
y' &= c_y + (x-c_x)\sin\theta + (y-c_y)\cos\theta.
\end{aligned}
```

> On [rotation about an arbitrary point](pages/rotation-pivot.html), the tables show all **three matrices** $T(c)$, $R(\theta)$ and $T(-c)$ next to the combined matrix $M$. Moving $c_x$, $c_y$ and $\theta$ lets you watch the decomposition and the composition correspond.

---

## Using this site

1. **Adjust the parameters** in the panel beside the figure. Every value has both a slider and a number field.
2. **Add shapes** with the drawing tools (line, circle, rectangle, freehand).
   - Line: two clicks for the start and end
   - Circle: click the centre, then click a point on the edge
   - Rectangle: click two opposite corners
   - Freehand: drag, and release to commit
   - Clear: removes the shapes you added
3. **Read the geometric effect** from the transformed grid and the basis vectors.
4. **Check the entries and the order of composition** in the matrix tables below the figure.
   Following the column-vector convention, the factors act **right to left**.

---

## Worked examples and exercises

1. **Seeing a shear**
   In [linear.html](pages/linear.html) set $s_x=s_y=1$ and $\mathrm{Shear}_x=1$. Confirm that a square becomes a parallelogram, and read off how the basis vectors changed.
2. **Circle to ellipse**
   In [linear.html](pages/linear.html) scale by $s_x=2, s_y=1$ and draw a circle. It becomes an ellipse; check that its major and minor axes match the scaling.
3. **Order of composition with a translation**
   In [affine.html](pages/affine.html) the linear transform $L$ is composed with a translation $T$ as `combined = T·L`. Observe what differs when the order is swapped.
4. **Rotation about a point**
   In [rotation-pivot.html](pages/rotation-pivot.html) rotate while moving the centre $(c_x,c_y)$. Compare the decomposition $T(c)\,R\,T(-c)$ with the combined matrix $M$.
5. **Undoing with an inverse**
   In [linear.html](pages/linear.html) set some linear transform $A$, then build $A^{-1}$ and compose the two (take reciprocals of the scale factors, negate the rotation angle). Check experimentally that the composition is the identity.

---

## Cheat sheet

- Rotation (about the origin, angle $\theta$)

```math
R(\theta)=\begin{bmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{bmatrix}
```

- Scaling

```math
S(s_x,s_y)=\begin{bmatrix}s_x&0\\0&s_y\end{bmatrix}
```

- Shear

```math
\mathrm{Shear}_x(k)=\begin{bmatrix}1&k\\0&1\end{bmatrix},\quad
\mathrm{Shear}_y(k)=\begin{bmatrix}1&0\\k&1\end{bmatrix}
```

- Reflection (in the x and y axes)

```math
\mathrm{Ref}_x=\begin{bmatrix}1&0\\0&-1\end{bmatrix},\quad
\mathrm{Ref}_y=\begin{bmatrix}-1&0\\0&1\end{bmatrix}
```

- Translation (homogeneous coordinates)

```math
T(t_x,t_y)=
\begin{bmatrix}
  1&0&t_x\\
  0&1&t_y\\
  0&0&1
\end{bmatrix}
```

- Affine composition (column vectors)

```math
\mathbf{v}'=(T \cdot L)\,\mathbf{v} \quad\Rightarrow\quad \text{acting}:~ L \rightarrow T
```

- 2×2 inverse

```math
A^{-1}=\frac{1}{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}\quad(\det(A)\ne 0)
```

---

## Appendix: column vectors and row vectors

- This project uses **column vectors**, so compositions act right to left ($v' = (A\cdot B)v$ means $B \rightarrow A$).
- In the convention where a row vector $[x, y]$ multiplies from the left, the formulas and the order of composition are reversed. When comparing against a textbook or any outside source, check which convention it uses.

---

### Implementation and dependencies

- The matrix arithmetic lives in [`js/linear-algebra/matrix3.js`](../js/linear-algebra/matrix3.js) and the drawing in [`js/viz/plane.js`](../js/viz/plane.js). Each folder documents how to use it.
- D3.js v7 is loaded from a CDN, pinned to an exact version.
- The terms for reuse (the licence) are not decided yet. Until they are, please do not treat redistribution or commercial use of this code as settled either way.
- Corrections are welcome.
