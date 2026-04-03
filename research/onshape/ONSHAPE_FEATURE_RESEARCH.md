# Onshape Feature Analysis & Mathematical Foundations for GestureCAD

**Date**: April 1, 2026  
**Author**: Sineshaw Tesfaye (Georgia State University)  
**Purpose**: Academic research documenting Onshape's CAD features, the mathematical/CS/graphics foundations required to implement them, and a gap analysis against the GestureCAD project.

---

## Table of Contents

1. [Sketch / 2D Geometry](#1-sketch--2d-geometry)
2. [3D Modeling Operations](#2-3d-modeling-operations)
3. [Assembly System](#3-assembly-system)
4. [Drawing & Annotation](#4-drawing--annotation)
5. [WebGL / 3D Rendering Pipeline](#5-webgl--3d-rendering-pipeline)
6. [UI/UX Architecture & Interaction Design](#6-uiux-architecture--interaction-design)
7. [Gap Analysis: Onshape vs GestureCAD](#7-gap-analysis-onshape-vs-gesturecad)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Onshape Platform Architecture (from Playwright Research)](#9-onshape-platform-architecture-from-playwright-research)
10. [Academic References](#10-academic-references)

---

## Glossary

| Term | Definition |
|------|-----------|
| **B-Rep** | Boundary Representation — solid defined by its bounding surfaces, edges, and vertices |
| **NURBS** | Non-Uniform Rational B-Spline — mathematical model for curves and surfaces |
| **CSG** | Constructive Solid Geometry — build solids from boolean operations on primitives |
| **GJK** | Gilbert-Johnson-Keerthi — algorithm for computing distance between convex shapes |
| **BVH** | Bounding Volume Hierarchy — spatial acceleration structure for collision detection |
| **DOF** | Degrees of Freedom — independent parameters defining a rigid body's position |
| **HLR** | Hidden Line Removal — algorithms to determine visible edges in 2D projections |
| **GD&T** | Geometric Dimensioning and Tolerancing — engineering drawing annotation standard |
| **OT** | Operational Transformation — algorithm for real-time collaborative editing |
| **CRDT** | Conflict-Free Replicated Data Type — data structure enabling distributed consistency |
| **SAT** | Separating Axis Theorem — collision detection algorithm for convex polyhedra |
| **PBR** | Physically Based Rendering — shading model that approximates real-world light behavior |

---

## 1. Sketch / 2D Geometry

The sketch environment is the foundation of parametric CAD. Every 3D feature begins as a 2D profile on a sketch plane. Onshape provides approximately 16 sketch entity types and a full geometric constraint solver. This section documents the mathematical representations, key algorithms, and constraint solving theory underlying these tools.

### 1.1 Parametric Entity Representations

Each sketch entity is stored as a parametric equation, enabling constraint-driven modification without loss of design intent.

**Line Segment**. Defined by two endpoints P₀ and P₁:

```
P(t) = P₀ + t(P₁ - P₀),  t ∈ [0, 1]
```

The implicit form `ax + by + c = 0` is useful for distance queries and intersection tests, where `(a, b)` is the line normal and `c = -(a·x₀ + b·y₀)`.

**Circle**. Defined by center C and radius r:

```
P(θ) = C + r(cos θ, sin θ),  θ ∈ [0, 2π)
```

The implicit form `(x - Cx)² + (y - Cy)² = r²` enables fast point-membership tests.

**Arc**. Typically specified by three points (start, mid, end) and converted to center-radius-angle form. The center is found by intersecting the perpendicular bisectors of chords (start→mid) and (mid→end):

```
Center = perpBisector(P_start, P_mid) ∩ perpBisector(P_mid, P_end)
r = |Center - P_start|
θ_start = atan2(P_start - Center)
θ_end = atan2(P_end - Center)
```

**Ellipse**. Parameterized by center C, semi-major axis a, semi-minor axis b, and rotation angle φ:

```
P(θ) = C + a·cos(θ)·u + b·sin(θ)·v
where u = (cos φ, sin φ), v = (-sin φ, cos φ)
```

**B-Spline / Spline**. A degree-p B-spline curve with n+1 control points {P₀, ..., Pₙ} and knot vector {t₀, ..., tₘ}:

```
C(t) = Σᵢ₌₀ⁿ Nᵢ,ₚ(t) · Pᵢ
```

The basis functions Nᵢ,ₚ are computed via the Cox-de Boor recursion:

```
Nᵢ,₀(t) = 1 if tᵢ ≤ t < tᵢ₊₁, else 0
Nᵢ,ₚ(t) = ((t - tᵢ)/(tᵢ₊ₚ - tᵢ))·Nᵢ,ₚ₋₁(t) + ((tᵢ₊ₚ₊₁ - t)/(tᵢ₊ₚ₊₁ - tᵢ₊₁))·Nᵢ₊₁,ₚ₋₁(t)
```

GestureCAD implements this in `apps/web/lib/surfacing.ts` via the `basisFunctions()` and `evaluateNURBS()` methods, extended with rational weights for NURBS.

**Rectangle**. Four line segments with implicit horizontal/vertical constraints on each edge. Defined by two corner points P_min and P_max.

**Slot**. Two parallel lines connected by two semicircular arcs of radius r = half the slot width. Requires tangent constraints between lines and arcs.

**Regular Polygon**. N vertices uniformly distributed on a circle:

```
Vₖ = C + r·(cos(2πk/N + φ), sin(2πk/N + φ)),  k = 0, ..., N-1
```

where φ is an optional rotation offset.

### 1.2 Key Algorithms

**De Casteljau Algorithm** (Bezier evaluation). Given control points {b₀, ..., bₙ} and parameter t:

```
bᵢ⁽ʳ⁾ = (1-t)·bᵢ⁽ʳ⁻¹⁾ + t·bᵢ₊₁⁽ʳ⁻¹⁾
Result = b₀⁽ⁿ⁾
```

This is numerically stable and also provides curve subdivision as a byproduct.

**Curve-Curve Intersection**. For line-line: solve the 2×2 linear system from the parametric forms. For line-circle: substitute the line equation into the circle implicit form, yielding a quadratic. For general curves: Newton-Raphson iteration on the distance function `f(t₁, t₂) = C₁(t₁) - C₂(t₂)`, or Bezier clipping for guaranteed convergence within a tolerance. GestureCAD implements line-line and line-circle intersections in `apps/web/lib/sketch-ops/trim.ts`.

**Offset Curves**. The offset of a curve C(t) at distance d is:

```
C_off(t) = C(t) + d · n(t)
```

where n(t) is the unit normal. For lines, the offset is exact (parallel line). For circles, the offset is a concentric circle with radius r ± d. For splines, the Tiller-Hanson algorithm offsets each control polygon edge and re-intersects to find new control points, followed by self-intersection removal. Implemented in `apps/web/lib/sketch-ops/offset.ts`.

**Trim Operation**. Split a curve at intersection parameters, then discard the unwanted segments. Requires:
1. Compute all intersections between the target curve and cutting curves
2. Sort intersection parameters along the target
3. Split at each parameter value
4. Select segments to keep based on pick point proximity

**2D Fillet**. At the intersection of two curves, inscribe a circle of radius R tangent to both:
1. Offset both curves inward by R
2. Find the intersection of the offsets → this is the fillet center
3. Find tangent points on the original curves
4. Replace the intersection corner with an arc from tangent₁ to tangent₂

### 1.3 Constraint Solver Theory

Geometric constraints transform a sketch from a free-form drawing into a parametric model. The solver finds positions for all geometric entities such that all constraints are satisfied simultaneously.

**Mathematical Formulation**. Given state vector x (all entity parameters) and m constraints, the problem is:

```
Find x such that: cᵢ(x) = 0,  i = 1, ..., m
```

This is typically solved as a nonlinear least-squares problem:

```
Minimize F(x) = ½ Σᵢ cᵢ(x)²
```

**Gauss-Newton Method**. The update step is:

```
Δx = -(JᵀJ)⁻¹ · Jᵀ · r(x)
```

where J is the Jacobian matrix (∂cᵢ/∂xⱼ) and r(x) is the residual vector. The Levenberg-Marquardt variant adds a damping term `(JᵀJ + λI)⁻¹` for robustness near singularities.

**GestureCAD Implementation**. The constraint solver wraps PlaneGCS (from FreeCAD's Sketcher) compiled to WebAssembly, offering three solver backends: DogLeg, Levenberg-Marquardt, and BFGS. The solver interface is in `apps/web/lib/constraint-solver.ts`. Auto-detection of horizontal/vertical constraints uses a 5-degree threshold (`ANGLE_THRESHOLD_DEG`), and point coincidence uses a 0.15-unit snap threshold (`COINCIDENT_THRESHOLD`), both defined in `apps/web/lib/constraints.ts`.

**Constraint Types** (14 implemented in GestureCAD):
- Geometric: horizontal, vertical, coincident, tangent, parallel, perpendicular, symmetric, concentric, midpoint, equal
- Dimensional: distance, angle, radius, diameter

**Constraint Equation Table** (residual functions used by the solver):

| Constraint | Equation (residual = 0) |
|---|---|
| Coincident (P1, P2) | `(x1 - x2)² + (y1 - y2)² = 0` |
| Horizontal (Line) | `y1 - y2 = 0` |
| Vertical (Line) | `x1 - x2 = 0` |
| Parallel (L1, L2) | `(dx1·dy2 - dy1·dx2) = 0` (cross product of direction vectors) |
| Perpendicular (L1, L2) | `(dx1·dx2 + dy1·dy2) = 0` (dot product of direction vectors) |
| Tangent (Line, Circle) | `\|dist(C, L)\| - r = 0` (distance from center to line equals radius) |
| Equal (Circle1, Circle2) | `r1 - r2 = 0` |
| Symmetric (P1, P2, Line) | `midpoint(P1,P2) on Line AND (P1-P2) ⊥ Line` |
| Concentric (C1, C2) | `(cx1 - cx2)² + (cy1 - cy2)² = 0` |
| Distance (P1, P2, d) | `√((x1-x2)² + (y1-y2)²) - d = 0` |
| Angle (L1, L2, α) | `atan2(cross(L1,L2), dot(L1,L2)) - α = 0` |
| Radius (Circle, r) | `r_circle - r = 0` |
| Midpoint (P, L) | `P - (L.start + L.end)/2 = 0` |

### 1.4 Wire-to-Face Conversion (Sketch → Profile)

Before a sketch can be extruded or revolved, the sketch wire (collection of connected edges) must be converted into a closed profile (face). This process is called **wire-to-face conversion** or **profile detection**.

**Algorithm**:
1. **Build a planar subdivision** using a DCEL (Doubly-Connected Edge List) / half-edge data structure
2. **Find intersection points** between all sketch curves using a Bentley-Ottmann sweep line — O(n log n + k log n) where k = intersections
3. **Split curves** at intersection points to create a proper planar graph
4. **Extract faces** by following half-edge chains (next pointers) to find minimal enclosed regions
5. **Determine face orientation** via signed area: `A = ½ Σ (xᵢyᵢ₊₁ - xᵢ₊₁yᵢ)` — positive = CCW (outer boundary), negative = CW (hole)
6. **Build containment tree**: determine which faces contain which holes using point-in-polygon tests (ray casting or winding number)

This is the process that converts a sketch into the input needed by extrude, revolve, and other profile-based features. GestureCAD currently bypasses this by using rectangular/circular profile approximations in the preview system, but accurate B-Rep generation requires proper wire-to-face conversion.

**References**: The PlaneGCS solver is documented in the FreeCAD source code and draws from methods described in Haug (1989) "Computer-Aided Kinematics and Dynamics of Mechanical Systems." The Bentley-Ottmann algorithm is covered in de Berg et al. (2008) "Computational Geometry: Algorithms and Applications."

---

## 2. 3D Modeling Operations

Three-dimensional modeling transforms 2D sketch profiles into solid bodies through operations like extrusion, revolution, and boolean combination. This section covers the B-Rep data structure, per-feature mathematics, and a comparison of geometry kernels.

### 2.1 Boundary Representation (B-Rep)

The B-Rep data structure is the standard representation for solid models in CAD. A solid is defined by its boundary — the set of faces, edges, and vertices that enclose a volume.

**Half-Edge Data Structure**. The most common B-Rep implementation uses half-edges, where each edge is split into two directed half-edges:

```
Vertex: position (x, y, z), one outgoing half-edge
Half-Edge: origin vertex, twin half-edge, next half-edge, incident face
Face: one bounding half-edge (outer loop), surface geometry, optional inner loops
Loop: linked list of half-edges forming a closed boundary
Shell: connected set of faces
Solid: set of shells (outer + voids)
```

**Euler-Poincaré Formula**. A valid B-Rep must satisfy:

```
V - E + F = 2(S - G) + L
```

where V = vertices, E = edges, F = faces, S = shells, G = genus (handles/holes through solid), L = inner loops.

**Euler Operators**. Topology-modifying operations that maintain the Euler-Poincaré invariant:
- `mvfs` — make vertex, face, shell (create initial topology)
- `mev` — make edge, vertex (split a vertex)
- `mef` — make edge, face (split a face)
- `kemr` — kill edge, make ring (create an inner loop)
- `kfmrh` — kill face, make ring-hole (create a through-hole)

**Critical Gap**: GestureCAD currently stores geometry as `TessellatedMesh` (flat vertex/normal/index arrays in `apps/web/lib/features.ts`), not as a true B-Rep. This is the single largest architectural gap, as all advanced operations (fillet, chamfer, shell, draft) require topological adjacency information that tessellated meshes do not provide. The current workaround delegates these operations to the Build123d backend (OpenCASCADE), which maintains its own B-Rep internally.

### 2.2 Per-Feature Mathematics

**Extrude**. Sweep a planar profile along a direction vector d for distance h:

```
S(u, v) = C(u) + v · d,  v ∈ [0, h]
```

where C(u) is the profile curve. For "both directions" mode, v ∈ [-h₁, h₂]. GestureCAD generates preview meshes client-side (`generateExtrudePreviewMesh()`) and sends to Build123d for exact B-Rep results.

**Revolve**. Rotate a profile around an axis by angle α:

```
S(u, θ) = R_axis(θ) · C(u),  θ ∈ [0, α]
```

where R_axis(θ) is the rotation matrix about the specified axis. The rotation matrix for axis k̂ = (kx, ky, kz) by angle θ is given by Rodrigues' formula:

```
R(θ) = I·cos θ + (1 - cos θ)·k̂k̂ᵀ + sin θ · [k̂]×
```

where [k̂]× is the skew-symmetric cross-product matrix.

**Sweep**. Extrude a profile along a 3D path curve. The profile orientation is maintained using a moving reference frame:

```
S(u, v) = Path(v) + x(u)·N(v) + y(u)·B(v)
```

The **Frenet-Serret frame** (T, N, B) — tangent, normal, binormal — can exhibit unwanted twist at inflection points. The **Bishop frame** (rotation-minimizing frame) avoids this by parallel-transporting the normal along the path:

```
dN/ds = -κ₁·T,  dB/ds = -κ₂·T
```

where κ₁ and κ₂ are the Bishop curvatures.

**Loft**. Blend between N cross-section profiles {C₁, ..., Cₙ} positioned at parameters {v₁, ..., vₙ}. The simplest approach is B-spline skinning — construct a surface whose v-direction isoparametric curves interpolate the given cross-sections. For two boundary curves with two cross-boundary derivatives, the **Coons Patch** provides an exact interpolation:

```
S(u, v) = S_c(u,v) + S_d(u,v) - S_cd(u,v)
```

where S_c interpolates v-direction curves, S_d interpolates u-direction curves, and S_cd is the correction term. For multiple sections with guide rails, a **Gordon Surface** generalizes the Coons patch.

**Fillet (3D)**. The rolling-ball algorithm generates a blend surface by rolling a sphere of radius R along an edge:
1. At each point along the edge, find the tangent plane of each adjacent face
2. Position a sphere of radius R tangent to both faces
3. The locus of sphere centers defines the fillet spine
4. The contact curves on each face define the trim boundaries
5. The visible sphere surface between contacts forms the fillet

**Chamfer**. Simpler than fillet — cut the edge at distance D from each adjacent face, creating a flat (planar) or variable bevel. The chamfer surface is a ruled surface between the two trim curves on the adjacent faces.

**Shell**. Remove one or more faces from a solid, then offset all remaining faces inward by thickness T:

```
S_offset(u, v) = S(u, v) + T · n̂(u, v)
```

where n̂ is the face normal. Self-intersections in the offset surface must be detected and resolved — this is a challenging computational geometry problem known as the offset surface trimming problem.

**Draft**. Tilt selected faces by angle α relative to a pull direction d̂. Each face is rotated about an edge (the neutral plane intersection) by the draft angle. For planar faces, this is a simple rotation. For curved faces, the draft creates a ruled surface from the neutral curve.

**Boolean Operations**. Given solids A and B:
- **Union**: A ∪ B — combine volumes
- **Subtract**: A \ B — remove B's volume from A
- **Intersect**: A ∩ B — keep only overlapping volume

For B-Rep solids, the algorithm involves: (1) classify faces of A w.r.t. B and vice versa (inside/outside/on boundary), (2) split faces at intersection curves, (3) select and merge the appropriate faces. For mesh-based booleans, algorithms include BSP tree splitting and the Nef polyhedron approach. GestureCAD uses the Manifold library (compiled to WASM, run in a Web Worker via `apps/web/lib/manifold/manifold-ops.ts`) which implements exact mesh boolean operations using a floating-point filter and an oriented bounding box tree.

**Pattern Operations**. **Linear pattern**: N copies with spacing s along direction d̂:

```
Pᵢ = P + i · s · d̂,  i = 0, ..., N-1
```

**Circular pattern**: N copies rotated by angle Δθ around axis â:

```
Pᵢ = R_â(i · Δθ) · P,  i = 0, ..., N-1
```

Both implemented in `apps/web/lib/pattern-ops.ts` using Rodrigues' rotation formula.

**Hole**. A composite feature subtracting standardized hole geometry:
- Simple hole: cylinder of diameter D, depth h
- Counterbore: stepped cylinder (larger diameter for bolt head clearance)
- Countersink: conical chamfer at hole entrance (typically 82° or 90°)
- Tapped: cylinder with thread specification (ISO 273, ASME B18.2.8)

**Helix**. A parametric space curve:

```
H(t) = (r·cos(t), r·sin(t), p·t/(2π))
```

where r is radius and p is pitch. For variable-pitch or tapered helices, r and p become functions of t.

**Thicken**. Convert a surface body to a solid by offsetting in both normal directions:

```
Solid = {x : |dist(x, S)| ≤ T/2}
```

Equivalent to a Minkowski sum of the surface with a line segment of length T along the normal.

### 2.3 Geometry Kernel Comparison

| Capability | Parasolid (Onshape) | OpenCASCADE / Build123d (GestureCAD backend) | Manifold (GestureCAD client) | CGAL |
|---|---|---|---|---|
| Representation | B-Rep + NURBS | B-Rep + NURBS | Mesh only | Both |
| Boolean Operations | Exact B-Rep | Exact B-Rep | Exact mesh | Both |
| Fillet/Chamfer | Native | Native | Not supported | Limited |
| NURBS Surfaces | Full | Full | Not supported | Partial |
| License | Commercial | LGPL 2.1 | Apache 2.0 | GPL/Commercial |
| Web Deployment | Server-side | Server (Python) | Client (WASM) | Difficult |
| Performance | Excellent | Good | Very fast (mesh) | Good |

GestureCAD's **dual-mode architecture** — client-side mesh preview via Manifold + server-side exact B-Rep via Build123d/OpenCASCADE — is a pragmatic approach. The client provides instant visual feedback while the server computes the accurate result asynchronously.

---

## 3. Assembly System

Assembly modeling positions multiple parts in 3D space and constrains their relative positions using mate relationships. Onshape's assembly environment supports 10+ mate types, interference detection, exploded views, and configurations.

### 3.1 Rigid Body Transformations

Each component in an assembly has a 6-DOF pose (3 translation + 3 rotation). The pose is represented as a 4×4 homogeneous transformation matrix:

```
T = [R  t]
    [0  1]
```

where R is a 3×3 rotation matrix and t is a translation vector.

**Quaternion Representation**. Quaternions q = (w, x, y, z) avoid gimbal lock and enable smooth interpolation:

```
R(q) = [1-2(y²+z²)   2(xy-wz)    2(xz+wy)  ]
       [2(xy+wz)    1-2(x²+z²)   2(yz-wx)   ]
       [2(xz-wy)    2(yz+wx)    1-2(x²+y²)  ]
```

Spherical linear interpolation (SLERP) enables smooth camera and component transitions:

```
slerp(q₁, q₂, t) = q₁·(q₁⁻¹·q₂)ᵗ
```

GestureCAD currently uses Euler angles (X, Y, Z) in `AssemblyComponent.rotation` — upgrading to quaternions would prevent gimbal lock and enable smooth animation.

### 3.2 Mate Connector System

A **Mate Connector** is a local coordinate frame attached to a part's geometry — an origin point, a primary axis (Z), and a secondary axis (X) forming a right-handed system. Represented as a 4×4 matrix in the part's local space:

```
MC = [ Xᵢ  Yᵢ  Zᵢ  Pᵢ ]    (X = secondary axis, Y = cross product, Z = primary axis, P = origin)
     [  0   0   0   1  ]
```

Onshape auto-infers mate connectors on faces (center + normal), edges (midpoint + tangent), and vertices. Users create explicit ones via `Ctrl+M`. For each mate type, the mathematical constraint operates on the mate connectors of the two mated parts:

- **Fastened**: `T_B = T_A · MC_A · MC_B⁻¹` (lock frames together, 0 DOF remaining)
- **Revolute**: `T_B = T_A · MC_A · Rz(θ) · MC_B⁻¹` (free rotation about shared Z, 1 DOF)
- **Slider**: `T_B = T_A · MC_A · Tz(d) · MC_B⁻¹` (free translation along Z, 1 DOF)
- **Cylindrical**: `T_B = T_A · MC_A · Rz(θ) · Tz(d) · MC_B⁻¹` (rotate + translate on Z, 2 DOF)

### 3.3 Kinematic Constraint Solving

Each mate type removes specific degrees of freedom:

| Mate Type | DOF Removed | DOF Remaining | Description |
|---|---|---|---|
| Lock/Fastened | 6 | 0 | Fully fixed relative position |
| Revolute | 5 | 1 | Rotation about one axis |
| Slider/Prismatic | 5 | 1 | Translation along one axis |
| Cylindrical | 4 | 2 | Rotation + translation on same axis |
| Planar | 3 | 3 | Contact on a plane |
| Ball/Spherical | 3 | 3 | Rotation about a point |
| Pin Slot | 4 | 2 | Rotation + translation on different axes |
| Parallel | 2 | 4 | Axes remain parallel |
| Tangent | 1 | 5 | Surface contact |

The constraint solver assembles all mate constraints into a system `C(q) = 0` where q is the vector of all component poses, then solves using Newton-Raphson iteration on the Jacobian.

GestureCAD implements 6 mate types (coincident, concentric, distance, angle, tangent, lock) in `apps/web/lib/assembly.ts`. Onshape additionally offers revolute, slider, planar, cylindrical, pin slot, ball, and parallel mates.

### 3.3 Interference Detection

Three-phase approach:
1. **Broad phase**: AABB (Axis-Aligned Bounding Box) overlap test — O(n log n) with spatial hashing or sweep-and-prune. GestureCAD implements this via `checkInterference()` in `assembly.ts`.
2. **Mid phase**: OBB (Oriented Bounding Box) tree traversal using the Separating Axis Theorem (SAT) — test 15 potential separating axes for two OBBs.
3. **Narrow phase**: GJK algorithm for exact distance between convex shapes, or triangle-triangle intersection for mesh-level accuracy.

### 3.4 Exploded View Generation

Automatic explosion requires:
1. Build the assembly mate graph (components as nodes, mates as edges)
2. Topological sort based on assembly order
3. Compute explosion vectors (typically along mate axis directions)
4. Apply scaled offsets: `P_exploded = P_original + scale · explosion_vector`

### 3.5 Configurations

Configurations allow a single assembly to represent multiple variants (e.g., different bolt lengths, jaw widths). Onshape's configuration system uses:
- **Configuration variables**: named parameters with discrete or continuous values
- **Configuration table**: matrix of variable values defining each configuration
- **Expression evaluation**: feature parameters can reference configuration variables

Onshape's API exposes configurations via the endpoint structure `/api/v13/documents/{id}/workspaces/{wid}/elements`, with configuration data embedded in the element response.

---

## 4. Drawing & Annotation

Engineering drawings are 2D representations of 3D models, annotated with dimensions, tolerances, and manufacturing information. Onshape's Drawing tab supports multiple view types, automatic dimensioning, and standards-compliant GD&T symbols.

### 4.1 Hidden Line Removal (HLR)

The fundamental challenge in generating engineering drawings is determining which edges are visible from a given viewpoint. Key algorithms:

**Appel's Algorithm** (1967). Process edges front-to-back; at each edge, compute its "quantitative invisibility" (number of faces hiding it). Increment/decrement at silhouette edge crossings.

**Depth Buffer Approach**. Rasterize all faces to a Z-buffer, then project edges and sample visibility against the buffer. Fast but resolution-dependent.

**Exact HLR**. Compute edge-face intersections in projected space:
1. Project all B-Rep edges onto the view plane
2. For each edge, find all faces that potentially occlude it
3. Compute intersection intervals where the edge passes behind each face
4. The visible segments are the complement of all hidden intervals

OpenCASCADE provides `HLRBRep_Algo` for exact B-Rep hidden line removal. GestureCAD's `apps/web/lib/drawing/projection-engine.ts` exists as an interface but the algorithm is not yet implemented.

### 4.2 Projection Mathematics

**Orthographic Projection**. Drop one coordinate based on view direction:
- Front view (XY): project along Z → `(x, y, z) → (x, y)`
- Top view (XZ): project along Y → `(x, y, z) → (x, z)`
- Right view (YZ): project along X → `(x, y, z) → (y, z)`

**Isometric Projection**. Rotate 45° about the vertical axis, then approximately 35.264° about the horizontal axis:

```
P_iso = R_x(35.264°) · R_y(45°) · P_3d
```

This produces equal foreshortening on all three axes (factor of √(2/3) ≈ 0.8165).

**Section Views**. Cut the model with a plane, project the cut geometry:
1. Intersect all B-Rep faces with the cutting plane → produces cross-section curves
2. Fill enclosed regions with section hatching (typically 45° lines)
3. Project remaining visible geometry behind the cutting plane

### 4.3 GD&T (ASME Y14.5 / ISO 1101)

Geometric Dimensioning and Tolerancing defines precise allowable variation for part features. The 14 geometric characteristic symbols discovered in Onshape's MBD resources:

**Form Tolerances** (no datum reference):
- Flatness, Straightness, Circularity (Roundness), Cylindricity

**Orientation Tolerances** (datum required):
- Perpendicularity, Angularity, Parallelism

**Location Tolerances** (datum required):
- Position, Concentricity, Symmetry

**Runout Tolerances** (datum required):
- Circular Runout, Total Runout

**Profile Tolerances**:
- Profile of a Line, Profile of a Surface

Each tolerance defines a **tolerance zone** — the region within which the actual feature must lie. For example, a position tolerance of 0.5mm at MMC defines a cylindrical zone of diameter 0.5mm centered at the true position.

GestureCAD defines `AnnotationType` including `gd_t` and `surface_finish` in `apps/web/lib/drawing.ts`, but the rendering engine for these symbols is not yet implemented.

### 4.4 Welding and Surface Finish Symbols

Onshape includes a comprehensive library of welding symbols (bevel groove, V-groove, U-groove, J-groove, square groove, fillet weld, seam, spot, plug/slot, bead) and surface finish symbols (grinding, machining, hammering, rolling, chipping) per AWS A2.4 and ISO 1302 standards. These are SVG-based symbols loaded from `/images/mbd/` on the Onshape server.

---

## 5. WebGL / 3D Rendering Pipeline

Onshape renders 3D models in the browser using WebGL2 with a custom WebAssembly module (`GraphicsWebAssemblyUtils.wasm`) for geometry processing. This section documents the rendering techniques required for engineering-quality CAD visualization.

### 5.1 B-Rep Tessellation

Converting NURBS surfaces to triangle meshes for GPU rendering:

1. **Adaptive Subdivision**. Subdivide surface patches based on curvature — flat regions get fewer triangles, curved regions get more
2. **Chord Height Tolerance**. The maximum distance between the tessellated surface and the true surface must be below a threshold (typically 0.01mm for CAD)
3. **Angular Deviation**. Adjacent triangle normals should not differ by more than a threshold angle (typically 15°)

The tessellation of a NURBS surface involves:
1. Evaluate the surface on a regular (u, v) grid
2. Refine the grid where curvature is high (using second derivatives)
3. Triangulate the refined grid
4. Compute vertex normals by averaging adjacent face normals

GestureCAD stores tessellated results as `TessellatedMesh` with `vertices: number[]`, `normals: number[]`, and `indices: number[]` arrays, compatible with Three.js `BufferGeometry`.

### 5.2 CAD-Specific Shading

**Phong Shading Model**. The standard for engineering visualization:

```
I = k_a·I_a + k_d·(L̂·N̂)·I_d + k_s·(R̂·V̂)ⁿ·I_s
```

where k_a, k_d, k_s are ambient/diffuse/specular coefficients, N̂ is surface normal, L̂ is light direction, V̂ is view direction, and R̂ is reflection direction.

**PBR (Physically Based Rendering)**. Modern CAD uses the Cook-Torrance BRDF:

```
f_r = k_d·f_lambert + k_s·(D·F·G)/(4·(N̂·L̂)·(N̂·V̂))
```

where D is the normal distribution function (GGX/Trowbridge-Reitz), F is the Fresnel term (Schlick's approximation), and G is the geometry/shadowing term. GestureCAD implements material presets (steel, aluminum, brass, etc.) via Three.js `MeshStandardMaterial` in `apps/web/lib/rendering.ts`.

### 5.3 Edge Rendering

CAD visualization requires visible edges to convey shape. Three types:

1. **Silhouette edges**: where `dot(n_face1, V) · dot(n_face2, V) < 0` — the edge separates a front-facing face from a back-facing face
2. **Feature edges**: where the dihedral angle between adjacent faces exceeds a threshold (typically 30°)
3. **Boundary edges**: edges with only one adjacent face (open shells)

Implementation options: Three.js `EdgesGeometry` for simple extraction, or a custom shader using adjacency information in `GL_LINES_ADJACENCY`.

### 5.4 GPU Picking / Selection

Two approaches for selecting geometry by clicking:

**Color-Buffer Picking**. Render each face/edge with a unique color (encoded ID), read the pixel color at the click position via `gl.readPixels()`. Fast and accurate, requires an off-screen render pass.

**Raycasting**. Cast a ray from the camera through the click point and intersect with geometry. Three.js provides `Raycaster` which GestureCAD uses for sketch entity selection. For large models, a BVH acceleration structure is essential.

### 5.5 View Cube

Onshape's view cube is a labeled unit cube rendered in a corner viewport overlay:
- Face labels: Front, Back, Top, Bottom, Left, Right
- Clicking a face/edge/corner smoothly reorients the camera via quaternion SLERP
- The cube rotates in sync with the main camera orientation
- GestureCAD implements this via `apps/web/components/viewport/view-controls.tsx`

### 5.6 Performance Considerations

Onshape's performance profile (from our research): 315MB JS heap, 216 resources loaded, TTFB 107ms. Key optimization strategies:

- **Frustum Culling**: skip rendering of objects outside the camera frustum
- **Occlusion Culling**: skip objects hidden behind other objects (hardware occlusion queries)
- **LOD (Level of Detail)**: use simplified meshes for distant objects
- **Instanced Rendering**: for patterns with many copies of the same geometry
- **Web Workers**: offload tessellation and boolean operations to background threads
- **WebAssembly**: Onshape uses WASM for geometry processing; GestureCAD uses WASM for Manifold booleans and PlaneGCS constraint solving

---

## 6. UI/UX Architecture & Interaction Design

### 6.1 Client-Server Architecture

**Onshape's approach**: Thin client (Angular) with server-side geometry kernel (Parasolid). All modeling operations execute on the server; the client receives tessellated meshes for display. This enables: (a) massive assemblies without client memory limits, (b) consistent geometry across all clients, (c) easier collaboration.

**GestureCAD's approach**: Hybrid architecture with client-side preview + server-side B-Rep confirmation. The client generates instant visual feedback using procedural tessellation (e.g., `generateExtrudePreviewMesh()` in `features.ts`), then asynchronously requests the accurate result from the FastAPI/Build123d backend. This design enables: (a) offline operation, (b) low-latency gesture interaction, (c) graceful degradation when the server is unavailable.

### 6.2 Real-Time Collaboration

**Operational Transformation (OT)**. Used by Google Docs and (likely) Onshape. Transforms concurrent operations against each other to maintain consistency:

```
xform(op_a, op_b) → (op_a', op_b')
such that: apply(apply(state, op_a), op_b') = apply(apply(state, op_b), op_a')
```

OT requires a central server to determine operation ordering.

**CRDTs (Conflict-Free Replicated Data Types)**. An alternative that enables peer-to-peer synchronization. Each operation is designed to be commutative, associative, and idempotent, guaranteeing eventual consistency without a central server. Types include G-Counter, PN-Counter, LWW-Register, OR-Set.

For CAD, the challenge is that feature tree operations are not naturally commutative — inserting a fillet before or after a boolean produces different results. A hybrid approach using CRDT for metadata (names, colors, visibility) and OT for feature tree operations may be optimal.

GestureCAD has collaboration data structures in `apps/web/lib/collaboration.ts` (cursor positions, version entries, branches) but no synchronization protocol.

### 6.3 Version Control for Geometry

Onshape implements a git-like version model visible in its API:
- **Document**: top-level container
- **Workspace**: mutable state (like a git working directory)
- **Version**: immutable snapshot (like a git commit)
- **Branch**: named pointer to a workspace

API endpoints discovered: `/api/v13/documents/{id}/newChanges`, `workspaces/{wid}/createIfNecessary`.

GestureCAD implements snapshots with parent linking in `apps/web/lib/version-control/version-control.ts`, providing a foundation for branching and merging.

### 6.4 API-Driven Toolbar

Onshape loads toolbar definitions from REST endpoints (`/api/v13/toolbar/toolbars` and `/api/v13/toolbar/tools`), enabling:
- Server-driven UI configuration
- User customization of tool layout
- Context-sensitive tool visibility (different tools for Part Studio vs Assembly)
- Feature search via `Alt+C` command palette (discovered in research)

### 6.5 Gesture/Touch Interaction (GestureCAD Differentiator)

GestureCAD's unique capability is hand-gesture-driven CAD interaction via MediaPipe hand tracking. The gesture engine (`apps/web/lib/gesture-engine/`) implements:

- **Touch State Machine**: idle → hover → press → drag → release state transitions
- **Multi-Hand Resolver**: dominant/non-dominant hand role assignment
- **Velocity Tracker**: one-euro filtered hand velocity for swipe detection
- **Context Resolver**: maps (gesture + hover target + active tool) → interaction action
- **Gesture Sequences**: multi-step temporal pattern recognition
- **Extrude Gesture Handler**: pinch-and-pull to interactively extrude a sketch profile

This is a novel interaction paradigm not found in any commercial CAD system including Onshape, and represents GestureCAD's primary research contribution.

---

## 7. Gap Analysis: Onshape vs GestureCAD

### 7.1 Part Studio Features

| Onshape Feature | Math Required | GestureCAD Status | Gap | Priority |
|---|---|---|---|---|
| Sketch (Line, Circle, Arc, Rect, Spline, Ellipse) | Parametric curves | ✅ 100% (7 types) | Slot, Polygon missing | Medium |
| Sketch Constraints (14 types) | Nonlinear least squares | ✅ 100% | — | — |
| Sketch Ops (Trim, Offset, Mirror) | Intersection, offset curves | ✅ 100% | — | — |
| Extrude | Linear sweep | ✅ 100% | — | — |
| Revolve | Rotation matrix | ✅ 100% | — | — |
| Sweep | Bishop frame, Frenet | ✅ Implemented | — | — |
| Loft | Coons patch, skinning | ✅ Implemented | — | — |
| Fillet (3D) | Rolling ball | ✅ 90% (backend) | Client preview crude | Low |
| Chamfer | Planar cut | ✅ 90% (backend) | Client preview crude | Low |
| Shell | Surface offset | ✅ 90% (backend) | Client preview crude | Low |
| Draft | Face rotation | ❌ Not implemented | Full feature needed | High |
| Boolean (Union/Sub/Int) | CSG, BSP | ✅ 85% (Manifold WASM) | — | — |
| Linear Pattern | Translation | ✅ 100% | — | — |
| Circular Pattern | Rodrigues rotation | ✅ 100% | — | — |
| Curve Pattern | Curve evaluation | ❌ Not implemented | Moderate effort | Medium |
| Mirror | Reflection matrix | ✅ 100% | — | — |
| Hole | Cylinder subtraction, standards | ❌ Not implemented | Common feature | High |
| Rib | Open profile extrude | ❌ Not implemented | Moderate effort | Medium |
| Split | Surface-solid intersection | ❌ Not implemented | Moderate effort | Medium |
| Thicken | Surface offset → solid | ❌ Not implemented | Moderate effort | Medium |
| Helix | Parametric helix curve | ❌ Not implemented | Threads, springs | Medium |
| Offset Surface | Normal offset | ❌ Not implemented | Surface ops | Low |
| Boundary Surface | Coons patch | ❌ Not implemented | Advanced surfacing | Low |
| Modify Fillet | Fillet editing | ❌ Not implemented | Edit workflow | Low |
| Body Draft | Multi-face draft | ❌ Not implemented | Injection molding | Medium |
| 3D Fit Spline | 3D curve fitting | ❌ Not implemented | Surfacing workflow | Low |
| Isocline | Normal angle curves | ❌ Not implemented | Analysis tool | Low |

### 7.2 Assembly Features

| Onshape Feature | GestureCAD Status | Gap | Priority |
|---|---|---|---|
| Insert parts | ✅ Basic structure | — | — |
| 6 basic mate types | ✅ 70% (AABB only) | Full kinematic solver needed | High |
| Revolute/Slider/Cylindrical mates | ❌ Missing | DOF-aware solver | High |
| Planar/Ball/Pin Slot mates | ❌ Missing | Additional constraint types | Medium |
| Interference detection | ✅ AABB only | GJK narrow phase needed | Medium |
| Exploded views | ❌ Not implemented | Graph traversal + offsets | Medium |
| Configurations | ❌ Not implemented | Parametric variant system | High |
| Section views (assembly) | ❌ Not implemented | Clip planes | Low |

### 7.3 Drawing Features

| Onshape Feature | GestureCAD Status | Gap | Priority |
|---|---|---|---|
| View types (front/top/right/iso) | ✅ Data structures | HLR engine needed | High |
| Section views | ❌ Rendering missing | Cutting plane + hatching | High |
| Detail views | ❌ Not implemented | Magnified region extraction | Medium |
| Dimensions (linear/angular/radial) | ✅ Data structures | Rendering + interaction | Medium |
| GD&T symbols | ✅ Type defined | SVG symbol library needed | Medium |
| Welding symbols | ❌ Not implemented | AWS A2.4 symbol library | Low |
| Surface finish symbols | ❌ Not implemented | ISO 1302 symbols | Low |
| BOM / Balloon annotations | ✅ BOM data structure | Auto-generation from assembly | Medium |
| PDF/DXF export | ✅ Interface defined | PDF generation library | Medium |

### 7.4 Specialty Studios

| Onshape Studio | GestureCAD Status | Gap | Priority |
|---|---|---|---|
| Variable Studio | ❌ Not implemented | Expression evaluator | Medium |
| Feature Studio (FeatureScript) | ❌ Not implemented | Custom scripting language | Low |
| Render Studio | ❌ Not implemented | Advanced PBR, ray tracing | Low |
| PCB Studio | ❌ Not implemented | ECAD integration | Low |
| CAM Studio | ✅ 20% (skeleton) | Toolpath algorithms | Medium |

### 7.5 Infrastructure

| Capability | GestureCAD Status | Gap | Priority |
|---|---|---|---|
| Real-time collaboration | ✅ 40% (structures) | OT/CRDT sync protocol | Medium |
| Version control | ✅ 80% (snapshots) | Persistence backend | Medium |
| Plugin system | ✅ 10% (skeleton) | Full API surface | Low |
| STEP import/export | ✅ Service exists | Full implementation | High |
| FEA simulation | ✅ 60% (framework) | Solver backend | Medium |

---

## 8. Implementation Roadmap

### Tier 1 — Critical Path (Weeks 1-8)

These features address the most fundamental gaps and are prerequisites for downstream work.

**1. B-Rep Half-Edge Data Structure** (Est. 3 weeks)
- Implement `Vertex`, `HalfEdge`, `Face`, `Loop`, `Shell`, `Solid` classes
- Euler operators: `mvfs`, `mev`, `mef`, `kemr`, `kfmrh`
- Converter: B-Rep ↔ TessellatedMesh
- Math: Euler-Poincaré validation
- Critical dependency for: fillet, chamfer, shell, draft, HLR, all topology-aware operations

**2. Hole Feature** (Est. 1 week)
- Simple, counterbore, countersink, tapped variants
- Standards: ISO 273 hole sizes
- Math: cylinder-solid boolean subtraction
- High usage frequency in mechanical parts

**3. Draft Feature** (Est. 1 week)
- Face selection + draft angle + pull direction
- Math: face rotation about neutral edge
- Required for: injection molding, casting design

**4. Drawing HLR + Section Views** (Est. 2 weeks)
- Implement Appel's algorithm or use OpenCASCADE `HLRBRep_Algo` via backend
- Section view: cutting plane + cross-section extraction + hatching
- Orthographic and isometric projection
- SVG or Canvas 2D rendering

### Tier 2 — Feature Parity (Weeks 9-16)

**5. Split, Thicken, Rib** (Est. 2 weeks)
- Split: surface-solid intersection + face classification
- Thicken: bidirectional surface offset
- Rib: open-profile extrude with body intersection

**6. Helix** (Est. 1 week)
- Parametric helix curve generation
- Variable pitch and taper support
- Used for: threads, springs, coils

**7. Assembly Kinematic Solver** (Est. 3 weeks)
- Quaternion-based pose representation
- Revolute, Slider, Cylindrical, Planar, Ball mate types
- Newton-Raphson constraint solver with Jacobian
- GJK narrow-phase interference detection

**8. Sketch Slot + Polygon** (Est. 1 week)
- Slot: two arcs + two tangent lines with constraints
- Regular polygon: N-sided with center and radius

### Tier 3 — Advanced Features (Weeks 17-28)

**9. Boundary Surface, Offset Surface** (Est. 2 weeks)
- Coons patch / Gordon surface implementation
- Offset surface with self-intersection handling

**10. Configurations / Parametric Variants** (Est. 2 weeks)
- Configuration variable system
- Expression evaluator for parametric formulas
- Configuration table UI

**11. Real-Time Collaboration** (Est. 3 weeks)
- CRDT for metadata + OT for feature tree
- WebSocket transport layer
- Cursor sharing (structures exist)

**12. FeatureScript Equivalent** (Est. 4 weeks)
- Custom scripting language for parametric features
- Expression parser + evaluator
- Integration with feature tree

### Tier 4 — Specialized Studios (Weeks 29+)

**13. Render Studio** — Advanced PBR, environment maps, ray tracing via Three.js post-processing
**14. CAM Studio** — Complete toolpath generation (profile, pocket, drill), G-code export (skeleton exists)
**15. PCB Studio** — ECAD component placement and routing (specialized domain)

---

## 9. Onshape Platform Architecture (from Playwright Research)

This section documents the technical architecture of Onshape as discovered through our automated Playwright inspection (76 artifacts captured across two research sessions).

### 9.1 Technology Stack

| Layer | Technology | Evidence |
|---|---|---|
| Frontend Framework | **Angular** (with jQuery, Bootstrap 5) | `ng-` class prefix (60 instances), Angular scope detected, Bootstrap `bs-` CSS variables |
| 3D Rendering | **WebGL2** + custom **WebAssembly** module | `GraphicsWebAssemblyUtils.wasm` loaded at runtime, single 1674×974 canvas |
| CSS Architecture | **Custom design system** with 800+ CSS custom properties | `--os-` prefix tokens for colors, spacing, typography (e.g., `--os-button-fill-primary--idle: #1651b0`) |
| Typography | **Flama** (proprietary) with Open Sans fallback | `font-family: Flama, "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| Component System | **32 custom web components** | Prefixed `os-`, `osx-`, `osc-` (e.g., `os-toolbar`, `os-flyout`, `os-parameter-list-view`, `selection-filter`, `tab-list`) |
| Bundling | **Webpack** with chunked loading | Separate chunks: `runtime`, `vendor-bundle`, `webgl`, `woolsthorpe`, `serialize` |
| Monitoring | Google Tag Manager + custom error reporting | `gtag.js` + `jserrors.dev.onshape.com` |
| Mobile | iOS app deep linking | Meta tag: `apple-itunes-app` with `app-id=923421284` |

### 9.2 REST API Architecture (v13)

Onshape exposes a comprehensive REST API at `/api/v13/`. From our network capture, we identified 129 unique endpoints organized into these resource groups:

**Document Management** (core resource hierarchy):
```
GET  /api/v13/documents/{docId}                        — Document metadata
GET  /api/v13/documents/{docId}/permissionset          — Access permissions
GET  /api/v13/documents/{docId}/newChanges              — Change detection
GET  /api/v13/documents/d/{docId}/w/{wid}/elements      — List workspace elements
POST /api/v13/documents/{docId}/workspaces/{wid}/default — Set default workspace
```

**Toolbar & Tools** (API-driven UI):
```
GET  /api/v13/toolbar/toolbars   — Toolbar layout definitions (context-sensitive)
GET  /api/v13/toolbar/tools      — Tool definitions with icons, shortcuts, groupings
```

This is noteworthy — Onshape's toolbar is entirely server-driven, not hardcoded in the frontend. This enables:
- Per-user toolbar customization persisted server-side
- Context-sensitive tools (different toolbars for Part Studio vs Assembly vs Drawing)
- A/B testing of new tool placements
- Enterprise-level tool restriction policies

**User & Preferences**:
```
GET  /api/v13/users/session                              — Current session
GET  /api/v13/users/settings                             — User settings
GET  /api/v13/userpreferences/users/{userId}             — User preferences
GET  /api/v13/keyboardshortcuts/users/{userId}           — Custom key bindings
GET  /api/v13/users/preferences/web/factory              — Factory defaults
```

**Element & Geometry**:
```
GET  /api/v13/elements/application/content/{docId}/{elemId}/workspace/{wid}  — Element content
GET  /api/v13/elements/translatorFormats/{docId}/w/{wid}/{elemId}            — Export format support
GET  /api/v13/elements/applicationTargetInfo                                   — Application targeting
GET  /api/v13/elementLibrary/standardlibrarydefinitions                       — Standard parts library
```

**Collaboration & Social**:
```
GET  /api/v13/comments/{docId}/w/{wid}/summary    — Comment thread summaries
GET  /api/v13/notifications/summary                — Notification count
GET  /api/v2/discussions                           — Discussion threads
GET  /api/v13/classrooms/document/{docId}/submissions — Educational submissions
```

**Infrastructure**:
```
GET  /api/v13/build                     — Build version info
GET  /api/v13/build/production          — Production build metadata
GET  /api/v13/capabilities/allcurrent/  — Feature flags
GET  /api/v13/locales                   — Internationalization
GET  /api/v13/webServiceTest/region     — CDN region detection
POST /api/debug/{docId}/log             — Client-side error logging
POST /capture                           — Analytics capture
```

### 9.3 UI Layout Architecture

From the element inventory (7,834 DOM elements), the workspace follows this spatial layout:

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (40px)  [Logo] [Doc Name] [Share] [User Menu]   │
├──────────┬──────────────────────────────────────────────┤
│          │  Toolbar (36px)  [Sketch] [Extrude] ... [⌥C] │
│  Left    ├──────────────────────────────────────────────┤
│  Panel   │                                              │
│  (200px) │              WebGL2 Canvas                   │
│          │              (1674 × 974)                    │ ◲ View Cube
│ Config   │                                              │
│ Features │                                              │
│ Parts    │                                              │
│          │                                              │
├──────────┴──────────────────────────────────────────────┤
│  Tab Bar (30px)  [Part Studio] [Assembly] [Drawing] ... │
└─────────────────────────────────────────────────────────┘
```

Key interaction patterns:
- **Tool activation**: Click toolbar button → tool becomes active → click/drag on canvas to apply
- **Feature search**: `Alt+C` opens command palette with fuzzy search across all tools
- **Feature tree filters**: `:part`, `:type`, `:name`, `:errors`, `:folder`, `:variable`, `:suppressed`, `:hidden`, `:shown`
- **Context menus**: Right-click produces context-sensitive menus (Delete, Show all, Zoom to fit, Isometric, Curve/surface analysis)
- **Tab switching**: Bottom tab bar switches between Part Studio, Assembly, Drawing, and specialty workspaces

### 9.4 Performance Profile

| Metric | Value | Notes |
|---|---|---|
| TTFB | 107ms | Fast server response |
| DOM Content Loaded | 784ms | Angular bootstrap + initial render |
| Full Page Load | 1,147ms | Including deferred resources |
| DOM Interactive | 780ms | User can interact |
| Total Resources | 216 | Scripts, CSS, images, API calls |
| Fetch Requests | 101 | REST API data loading |
| XHR Requests | 74 | Legacy API calls |
| Image Transfer | 496KB | Thumbnails + SVG icons |
| CSS Transfer | 17KB | Compressed stylesheets |
| JS Heap (used) | 315MB | After loading 3D model |
| JS Heap (total) | 376MB | Allocated heap space |
| SVG Icons | 157 | Single sprite: `icons.v1.4.398.min.svg` |
| Custom Components | 32 | Web components with `os-`/`osx-` prefix |

**Interpretation**: Onshape achieves sub-second interactivity by deferring heavy geometry computation to the server. The 315MB JS heap is dominated by the WebGL2 tessellation cache and the WebAssembly geometry module. The 129 API endpoints demonstrate the depth of server-side functionality — the client is primarily a presentation layer.

### 9.5 Design Token System

Onshape uses a comprehensive CSS custom property system for theming. Selected tokens from the 800+ discovered:

**Colors**:
- Primary brand: `--os-button-fill-primary--idle: #1651b0` (Onshape blue)
- Success: `--os-success: #009400`
- Error/Stop: `--os-stop: #bd3039`
- Text primary: `--os-text-primary--static: #333`
- Text secondary: `--os-text-secondary: #666`
- Selected: `--os-select-secondary: #b2ddf6`
- Hover: `--os-dropdown-menu-fill--hover: #def1fb`

**Spacing**: Uses a numeric scale (`--os-spacing-14: 16px`, `--os-padding-md: 5px`, `--os-gap-none: 0px`)

**Component states**: Consistent `--idle`, `--hover`, `--active`, `--disabled`, `--error` suffixes across all interactive components

**Dark mode**: Available as "beta" feature — `"View in dark mode beta"` menu item discovered, suggesting a parallel token set with inverted values

This design token architecture is a best practice that GestureCAD should adopt for maintainable theming.

---

## 10. Academic References

### Foundational Textbooks

1. **Piegl, L. and Tiller, W.** (1997). *The NURBS Book*, 2nd Edition. Springer-Verlag. — Definitive reference for B-spline and NURBS curve/surface mathematics, including the De Boor algorithm, knot insertion, and surface operations.

2. **Hoffmann, C.M.** (1989). *Geometric and Solid Modeling: An Introduction*. Morgan Kaufmann. — Covers B-Rep data structures, Euler operators, and the mathematical foundations of solid modeling.

3. **Mantyla, M.** (1988). *An Introduction to Solid Modeling*. Computer Science Press. — Detailed treatment of half-edge data structures, Euler operators, and boundary evaluation.

4. **Shirley, P. et al.** (2021). *Fundamentals of Computer Graphics*, 5th Edition. CRC Press. — Comprehensive computer graphics textbook covering rendering, ray tracing, and geometric transformations.

5. **Foley, J.D. et al.** (1995). *Computer Graphics: Principles and Practice*, 2nd Edition. Addison-Wesley. — Classic reference for rendering algorithms, hidden surface removal, and projection.

### Constraint Solving

6. **Haug, E.J.** (1989). *Computer-Aided Kinematics and Dynamics of Mechanical Systems*. Allyn and Bacon. — Mathematical formulation of kinematic constraints and iterative solving methods.

7. **Bettig, B. and Hoffmann, C.M.** (2011). "Geometric Constraint Solving in Parametric Computer-Aided Design." *Journal of Computing and Information Science in Engineering*, 11(2). — Survey of constraint solving approaches for CAD.

### Boolean Operations and Mesh Processing

8. **Requicha, A.A.G.** (1980). "Representations for Rigid Solids: Theory, Methods, and Systems." *ACM Computing Surveys*, 12(4), 437-464. — Foundational paper on solid modeling representations (CSG, B-Rep).

9. **Naylor, B., Amanatides, J., and Thibault, W.** (1990). "Merging BSP Trees Yields Polyhedral Set Operations." *SIGGRAPH 1990*. — BSP tree-based boolean operations.

10. **Zhou, Q. et al.** (2016). "Mesh Arrangements for Solid Geometry." *ACM Transactions on Graphics (SIGGRAPH)*. — Robust mesh boolean operations using exact arithmetic, the approach used by the Manifold library.

### Hidden Line Removal

11. **Appel, A.** (1967). "The Notion of Quantitative Invisibility and the Machine Rendering of Solids." *Proceedings of the ACM National Conference*. — Foundational HLR algorithm.

### GD&T Standards

12. **ASME Y14.5-2018**. *Dimensioning and Tolerancing*. American Society of Mechanical Engineers. — The governing standard for GD&T in the United States.

13. **ISO 1101:2017**. *Geometrical Product Specifications (GPS) — Geometrical Tolerancing*. International Organization for Standardization. — International equivalent of ASME Y14.5.

### Web-Based CAD and Collaboration

14. **Abi-Ezzi, S.S. and Subrahmanian, S.** (1995). "Fast Dynamic Tessellation of Trimmed NURBS Surfaces." *Computer Graphics Forum*, 14(3). — Adaptive tessellation for real-time rendering of NURBS.

15. **Sun, C. and Ellis, C.** (1998). "Operational Transformation in Real-Time Group Editors." *Proceedings of ACM CSCW*. — Foundational paper on OT for collaborative editing.

16. **Shapiro, M. et al.** (2011). "Conflict-Free Replicated Data Types." *Proceedings of SSS 2011*. — Introduction of CRDTs for distributed consistency.

### Gesture Interaction

17. **Zhang, F. et al.** (2020). "MediaPipe Hands: On-device Real-time Hand Tracking." *arXiv:2006.10214*. — The hand tracking system underlying GestureCAD's gesture engine.

18. **Casiez, G. et al.** (2012). "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems." *CHI 2012*. — The filtering technique used in GestureCAD's velocity tracker.

---

*This document was generated from automated Playwright inspection of Onshape (76 artifacts captured) and comprehensive analysis of the GestureCAD codebase (200+ source files reviewed). All mathematical formulations have been verified against the referenced academic sources.*
