# Onshape Feature Reference — Official Documentation Extraction

Extracted from cad.onshape.com/help on April 1, 2026.
This document maps every Onshape feature to its exact parameters for GestureCAD implementation.

---

## 1. SKETCH TOOLS

### Desktop Sketch Toolbar (press S to open)
| Tool | Description | Shortcut |
|------|-------------|----------|
| Line | Line segments | L |
| Corner Rectangle | Rectangle by opposite corners | G |
| Center Point Rectangle | Rectangle from center | R |
| Center Point Circle | Circle from center + radius | C |
| 3 Point Circle | Circle through 3 points | — |
| Tangent Arc | Arc tangent to existing entity | — |
| 3 Point Arc | Arc through 3 points | — |
| Spline | Smooth curve through points | — |
| Point | Individual point | — |
| Construction | Toggle construction mode | Q |

### Curve Feature Tools
| Tool | Description |
|------|-------------|
| Helix | Helices on conical/cylindrical faces |
| 3D Fit Spline | 3D curve through vertices |
| Projected Curve | Project curves between sketches or onto faces |
| Bridging Curve | Connect two points/vertices |
| Composite Curve | Combine multiple edges |
| Intersection Curve | Curves at surface intersections |
| Trim Curve | Trim/extend curves by distance |
| Isocline | Curves on sloped faces at specific angles |
| Offset Curve | Offset copies of edges |
| Isoparametric Curve | Smooth curves in U/V directions |
| Edit Curve | Modify existing curves |
| Routing Curve | Multi-point 3D paths for pipes/wiring |

### Sketch Constraints
Horizontal (H), Vertical (V), Coincident (I), Perpendicular (Shift+L), Parallel (B), Tangent, Equal, Midpoint, Symmetric, Concentric, Fix

### Dimensioning Shortcuts
| Action | Shortcut |
|--------|----------|
| Standard dimension | D |
| Radial dimension | Shift+R |
| Diameter dimension | Shift+D |
| Max/min dimension | Ctrl+M |

---

## 2. EXTRUDE (Shift+E)

### Creation Types
- **Solid** — adds depth to sketch profiles
- **Surface** — generates surfaces from curves
- **Thin** — thin-walled extrusion with configurable thickness

### Result Operations
| Operation | Effect |
|-----------|--------|
| **New** | Create new part |
| **Add** | Combine with existing part |
| **Remove** | Subtract from existing part |
| **Intersect** | Keep only overlap |

### End Types
| End Type | Description |
|----------|-------------|
| **Blind** | Specified depth |
| **Up to Next** | Until encountering geometry |
| **Up to Face** | To a selected face plane |
| **Up to Part** | To next part/surface |
| **Up to Vertex** | To a selected point |
| **Through All** | Through all parts |

### Options
- Direction (custom axis)
- Starting offset
- Symmetric (both sides equal)
- Second end position (asymmetric)
- Draft angle with neutral plane
- Merge scope for boolean operations

---

## 3. REVOLVE (Shift+W)

### Angle Types
| Type | Description |
|------|-------------|
| **Full** | 360° revolution |
| **Blind** | One direction, specified angle |
| **Symmetric** | Both directions, same angle |
| **Two Directions** | Both directions, different angles |
| **Up to Entity** | Until encountering face/vertex/part |

### Axis Selection
- Line, cylindrical edge, or arc
- Mate connector Z-axis
- New mate connector

### Creation Types: Solid, Surface, Thin
### Result Operations: New, Add, Remove, Intersect

---

## 4. SWEEP

### Required Components
- **Profile** — cross-section (closed/open sketch, face, curves)
- **Path** — trajectory (sketch entities, curves, edges)

### Profile Control Options
- None (global plane)
- Keep profile orientation (maintain along path)
- Lock profile faces
- Lock profile direction

### Advanced Parameters
- **Twist** — Turns, Angle, or Pitch
- **Scale** — proportional transform at endpoint
- **Trim Ends** — tangent vs precise termination

---

## 5. LOFT

### Requirements
- Minimum 2 profiles (sketch regions, curves, faces, points)
- Same number of vertices per profile for best results
- Single contour per profile

### Guide Curves
- Must intersect profile boundaries
- Must be tangent continuous (G1)
- For surfaces: must touch outsides of profiles

### End Conditions
| Condition | Effect |
|-----------|--------|
| Normal to profile | Tangents parallel to normal |
| Tangent to profile | Tangents on profile plane |
| Match tangent | Match adjacent face tangents |
| Match curvature | Match adjacent face curvature |
| Normal direction | Normal to selected vector |
| Tangent direction | Tangent to selected vector |

### Options
- Path (centerline guide with adjustable section count)
- Connections (vertex matching across profiles)
- Isocurves (mesh visualization)

---

## 6. FILLET

### Types
- **Edge Fillet** — constant radius on individual edges
- **Full Round Fillet** — seamless blend between opposing faces
- **Variable Fillet** — different radii at vertices

### Measurement Options
- **Radius** — radial measurement
- **Width** — distance between fillet ends

### Cross-Section Types
| Type | Description |
|------|-------------|
| **Distance** | Circular (standard) |
| **Conic** | Rho control (0.25=elliptical, 0.5=parabolic, 0.999=hyperbolic) |
| **Curvature** | Match surrounding curvature |

### Advanced Options
- Asymmetric (different radii per side)
- Partial (adjustable start/end %)
- Smooth transition between variable vertices
- Allow edge overflow
- Smooth corners

---

## 7. CHAMFER

### Types
| Type | Description |
|------|-------------|
| **Equal Distance** | Equal distance from edge in both directions |
| **Two Distances** | Different distances each direction |
| **Distance and Angle** | Distance one direction, angle in other (default 45°) |

### Measurement Types
- **Offset** — from starting edge (edge-dependent)
- **Tangent** — from face tangent intersection (edge-independent)

---

## 8. SHELL

### Parameters
- **Thickness** — wall thickness value
- **Face selection** — faces to remove (rest becomes shell)
- **Direction** — shell forms inside or outside face
- **Hollow** — shell without removing faces (enclosed cavity)

---

## 9. DRAFT

### Types
- **Neutral Plane** — select neutral face/plane, then faces to draft
- **Parting Line** — existing split line on face (requires prior Split)

### Parameters
- Draft angle (editable via dialog or orange arrow)
- Neutral plane selection
- Pull direction

### Options
- Tangent propagation
- Reapply fillets
- Direction (one-sided, symmetric, two-sided)

---

## 10. HOLE

### Types
| Type | Description |
|------|-------------|
| **Simple** | Uniform diameter drilled hole |
| **Counterbore** | Flat-bottomed enlarged coaxial hole |
| **Countersink** | Conical relief at top |
| **Tapped** | Threaded (straight/pipe/tapered) |

### Subtypes
| Subtype | Description |
|---------|-------------|
| **Drilled** | Standard drill size from dropdown |
| **Clearance** | Sized for fastener passage (Close/Free/Normal/Loose) |
| **PEM** | Self-clinching nuts, standoffs, studs |

### Parameters
- Diameter (with tolerance/precision)
- Depth (blind holes)
- Tip angle (118°, 135°, Flat, Custom)
- Termination (Blind, Up to Next, Up to Entity, Through All)
- Start plane (from part, sketch, selected plane)

---

## 11. BOOLEAN

### Operations
| Operation | Effect |
|-----------|--------|
| **Union** | Merge parts/surfaces |
| **Subtract** | Remove parts, optional offset |
| **Intersect** | Keep only overlapping material |

### Subtract Options
- Offset distance (gap between faces)
- Offset all vs selected faces
- Reapply fillet
- Keep tools (preserve originals)

---

## 12. LINEAR PATTERN

### Pattern Types: Part, Feature, Face

### Parameters
| Parameter | Description |
|-----------|-------------|
| Direction | Plane, edge, sketch entity, or curve |
| Distance | Spacing between instances |
| Instance Count | Total repetitions (min 1) |

### Options
- Centered mode (symmetric distribution)
- Second direction (creates grid/array)
- Skip instances (exclude specific copies)
- Reapply features (regenerate vs copy)
- Boolean (New/Add/Remove/Intersect)

---

## 13. CIRCULAR PATTERN

### Parameters
| Parameter | Description |
|-----------|-------------|
| Axis | Circular edge, cylindrical face, sketch circle, mate connector |
| Angle | Rotational distance |
| Instance Count | Number of copies |

### Options
- Equal spacing (distribute evenly within angle)
- Centered (seed at center)
- Opposite direction
- Skip instances
- Reapply features
- Boolean (New/Add/Remove/Intersect)

---

## 14. DRAWING TOOLS

### Dimensioning Shortcuts
| Tool | Shortcut |
|------|----------|
| Dimension | D |
| Radial | Shift+R |
| Diameter | Shift+D |
| Max/Min | Ctrl+M |
| Note | N |

### View Tools
| Tool | Shortcut |
|------|----------|
| Projected view | P |
| Line | L |
| Circle | C |
| Rectangle | G / R |

### Constraints
Horizontal (H), Vertical (V), Coincident (I), Perpendicular (Shift+L), Parallel (B)

### Navigation
PgDn/PgUp (sheets), Home/End (first/last sheet)

### Export: DWG, DXF formats

---

## 15. ASSEMBLY MATES

### Mate Types (from research + docs)
| Mate | DOF Removed | DOF Remaining | Description |
|------|:-----------:|:-------------:|-------------|
| Fastened | 6 | 0 | Fully locked |
| Revolute | 5 | 1 | Rotation about Z |
| Slider | 5 | 1 | Translation along Z |
| Cylindrical | 4 | 2 | Rotation + translation on Z |
| Planar | 3 | 3 | Contact on plane |
| Ball | 3 | 3 | Rotation about point |
| Pin Slot | 4 | 2 | Rotation + translation on different axes |
| Parallel | 2 | 4 | Axes remain parallel |
| Tangent | 1 | 5 | Surface contact |
| Linear Relation | — | — | Synchronized translation |
| Gear Relation | — | — | Synchronized rotation with ratio |

### Mate Connectors
- Auto-inferred on faces (center + normal), edges (midpoint + tangent), vertices
- Explicit creation via Ctrl+M
- 4x4 transformation matrix (origin + X axis + Z axis)
