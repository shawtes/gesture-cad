# Onshape 12-Week Curriculum vs GestureCAD — Feature Gap Analysis

## Curriculum Overview (from official Onshape College Lesson Plans)

| Week | Title | Key Concepts |
|------|-------|-------------|
| 1 | Getting Started | Onshape interface, View Cube, 4 foundational features (extrude/revolve/sweep/loft), 2D→3D workflow, basic sketching |
| 2 | Intro to 3D Modeling - Parts | Design intent, dimensions & constraints, auto-inferencing, fillets & chamfers, multiple sketch regions, planes |
| 3 | Multi-Part Part Studio | Boolean operations (union/subtract/intersect), linear & circular patterns, top-down vs bottom-up design |
| 4 | Assemblies | Degrees of freedom, assembly Mates (fastened/revolute/slider/cylindrical/planar/ball), mate connectors, triad manipulation, animating mates, linked documents |
| 5 | 2D Drawings | Engineering drawings, drawing views (front/top/right/iso), dimensioning, tolerancing, GD&T, templates |
| 6 | Collaboration & Sharing | (PDF not available — inferred: real-time collaboration, sharing, commenting, version control) |
| 7 | Iterative Design | FeatureScript, version control, history, re-ordering features, top-down design |
| 8 | Advanced Assembly | Linked documents, standard hardware, snap mode, grouping, replicating fasteners |
| 9 | Advanced Geometry & Design for Plastics | Drafts, surfaces, splitting parts, variables/expressions, appearance/transparency |
| 10 | Design for Manufacturing: CNC | Hole tool, spur gears, importing files, direct editing (modify fillet, delete/move/replace face), App Store/CAM |
| 11 | Advanced Geometry Techniques | Lofting, importing sketch pictures, splines, embossing, helix for springs, branch/compare/merge |
| 12 | Advanced Tools & Design for Assembly | Section views, interference detection, gear relations, materials, mass properties, exploded views, mobile editing, export |

---

## Feature-by-Feature Status in GestureCAD

### Week 1: Getting Started
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| 3D navigation (orbit, pan, zoom) | ✅ | Right-click orbit, scroll zoom, Ctrl+drag pan |
| View Cube / presets | ✅ | TOP/FRONT/RIGHT/LEFT/BACK/BOTTOM/ISO buttons + azimuth/elevation sliders |
| Extrude (Add) | ✅ | Parameter dialog with depth + direction + Add/Remove/Intersect modes |
| Revolve | ✅ | Dedicated tool with angle/axis/type controls |
| Sweep | ✅ | Circle + line path → swept solid |
| Loft | ✅ | Two profiles → blended shape |
| Basic sketching (line, circle, rect) | ✅ | 9 sketch tools: point, line, circle, rect, arc, spline, ellipse, slot, polygon |
| Keyboard shortcuts | ✅ | L/C/R/A/X/V/H/G/D/N/1/2/3/Ctrl+Z/Y |

### Week 2: Parts & Design Intent
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Sketch dimensions | ✅ | Dimension tool (D key) — click two points to measure |
| Sketch constraints (14 types) | ✅ | Auto-detected: horizontal, vertical, coincident, tangent, parallel, perpendicular, symmetric, etc. |
| Automatic inferencing | ✅ | Auto-detect constraints on entity creation (5° threshold for angles, 0.15 snap) |
| Fillets | ✅ | Parameter dialog with radius slider |
| Chamfers | ✅ | Parameter dialog with distance slider |
| Multiple sketch regions | ⚠️ | Wire-to-face profile detection exists but not exposed in UI for multi-region selection |
| Custom planes | ⚠️ | 3 standard planes (XZ/XY/YZ), no custom plane creation yet |
| Design intent editing | ✅ | Double-click feature → re-opens parameter dialog |

### Week 3: Multi-Part & Patterns
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Boolean union | ✅ | Click union tool → combines last two features |
| Boolean subtract | ✅ | Click subtract → removes last feature from previous |
| Boolean intersect | ✅ | Click intersect → keeps overlap |
| Linear pattern | ✅ | Parameter dialog: count, spacing, direction axis |
| Circular pattern | ✅ | Parameter dialog: count, total angle |
| Multi-part Part Studio | ⚠️ | Features are single-body; multi-body needs separate features |
| Top-down design | ✅ | Sketch → feature → assembly workflow supported |

### Week 4: Assemblies
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Insert components | ✅ | Assembly tab → "Add Component" from features |
| Fastened/Lock mate | ✅ | Lock mate type available |
| Revolute mate | ✅ | Revolute mate with DOF tracking |
| Slider mate | ✅ | Slider mate implemented |
| Cylindrical mate | ✅ | Cylindrical mate (2 DOF) |
| Planar mate | ✅ | Planar mate (3 DOF) |
| Ball mate | ✅ | Ball/spherical mate (3 DOF) |
| Mate connectors | ✅ | MateConnector type with origin/primaryAxis/secondaryAxis |
| Triad manipulation | ⚠️ | Position via number inputs, no 3D triad gizmo yet |
| Animate mates | ❌ | No animation playback for revolute/slider mates |
| Linked documents | ❌ | No cross-document linking |
| Degrees of freedom display | ✅ | MATE_DOF_TABLE shows remaining DOF per mate type |

### Week 5: 2D Drawings
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Create drawing views (front/top/right/iso) | ✅ | Drawing tab → Generate 3-View |
| Projected views | ✅ | generateStandard3View creates 4 views in proper layout |
| Dimensioning (linear, angular, radial) | ✅ | Auto-generated dimensions from model bounds |
| Tolerancing | ⚠️ | GD&T type system defined, but no tolerance editing UI |
| GD&T symbols | ✅ | 14 ASME Y14.5 symbols defined with SVG paths |
| Feature control frames | ✅ | renderFeatureControlFrame draws FCF to canvas |
| Drawing templates | ⚠️ | A4 template with title block exists, not customizable |
| Export drawing (PNG) | ✅ | Export PNG button works |
| Section views | ✅ | generateSectionView with cutting plane + 45° hatching |
| Detail views | ✅ | generateDetailView with magnification |

### Week 6: Collaboration (inferred)
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Real-time collaboration | ⚠️ | Yjs CRDT provider exists, needs WebSocket backend |
| Cursor sharing | ✅ | Presence bar shows connected users |
| Version control | ✅ | Snapshot commits, branches, history display |
| Commenting | ❌ | No comment/annotation system |

### Week 7: Iterative Design
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| FeatureScript (custom features) | ❌ | No scripting language |
| Version control & history | ✅ | History tab with commits and branches |
| Re-ordering features | ❌ | Feature tree is append-only, no drag reorder |
| Feature replay (parametric update) | ✅ | replayFeatures() auto-triggers on entity changes |
| Top-down design | ✅ | Sketch → extrude → assembly workflow |

### Week 8: Advanced Assembly
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Linked documents (standard hardware) | ❌ | No external document linking |
| Snap mode in assembly | ❌ | No auto-snap when inserting components |
| Grouping in assembly | ❌ | No component grouping |
| Replicate for fasteners | ❌ | No fastener replication tool |
| Advanced mate limits | ⚠️ | Mate types exist but no min/max limits |

### Week 9: Advanced Geometry & Plastics
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Draft feature | ✅ | Parameter dialog: angle + pull direction + axis |
| Surface operations | ✅ | NURBS, offset surface, Coons patch, 3D fit spline |
| Split parts | ✅ | Split tool with plane offset + keep side |
| Variables/expressions | ⚠️ | NamedParameter system exists in store, limited expression eval |
| Appearance/transparency | ✅ | 10 material presets + render modes (shaded/wireframe/x-ray) |
| Shell (plastic design) | ✅ | Shell tool with wall thickness |

### Week 10: Design for Manufacturing (CNC)
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Hole tool (counterbore/countersink/tapped) | ✅ | Hole dialog with 4 types + diameter + depth |
| Importing files (STEP/STL) | ✅ | Import STL/STEP/OBJ/GLB via file picker |
| Direct editing (modify fillet) | ⚠️ | Can double-click feature to edit, but no face/edge direct edit |
| CAM / toolpath | ✅ | Profile/pocket/drill toolpaths + G-code generation + .nc download |
| App Store / plugins | ⚠️ | Plugin API skeleton exists (macro-recorder, plugin-api) |

### Week 11: Advanced Geometry Techniques
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Lofting (advanced) | ✅ | Loft between two profiles |
| Splines | ✅ | Multi-click spline tool with double-click to finish |
| Helix (springs) | ✅ | Helix tool: radius/pitch/height/taper/clockwise |
| Branch/Compare/Merge | ✅ | Version control with branches, snapshots |
| Importing sketch pictures | ❌ | No image import to trace over |
| Embossing | ❌ | No text/logo emboss feature |
| Curve pattern | ✅ | Pattern along a path with Frenet frame |

### Week 12: Advanced Tools & Design for Assembly
| Feature | GestureCAD Status | Notes |
|---------|:---:|-------|
| Section view (in assembly) | ✅ | Section view generation with cutting plane |
| Interference detection | ✅ | AABB + GJK detection, red highlight in assembly panel |
| Materials & mass properties | ✅ | 10 material presets, mass/volume/centroid/bounding box display |
| Exploded views | ✅ | computeExplodedPositions in assembly |
| Export (STEP/STL/OBJ/GLB) | ✅ | 4 export formats + STEP via backend |
| Gear relations | ❌ | No gear ratio mate type |
| Mobile editing | ❌ | No mobile-specific UI (but PWA possible) |

---

## Summary Scorecard

| Week | Total Features | ✅ Working | ⚠️ Partial | ❌ Missing | Coverage |
|------|:---:|:---:|:---:|:---:|:---:|
| 1 | 8 | 8 | 0 | 0 | **100%** |
| 2 | 8 | 6 | 2 | 0 | **88%** |
| 3 | 6 | 5 | 1 | 0 | **92%** |
| 4 | 11 | 8 | 1 | 2 | **77%** |
| 5 | 10 | 7 | 2 | 1 | **80%** |
| 6 | 4 | 2 | 1 | 1 | **63%** |
| 7 | 5 | 3 | 0 | 2 | **60%** |
| 8 | 5 | 0 | 1 | 4 | **10%** |
| 9 | 6 | 5 | 1 | 0 | **92%** |
| 10 | 5 | 3 | 2 | 0 | **80%** |
| 11 | 7 | 5 | 0 | 2 | **71%** |
| 12 | 7 | 5 | 0 | 2 | **71%** |
| **TOTAL** | **82** | **57** | **11** | **14** | **77%** |

## Critical Missing Features (sorted by impact)

### Must-Have for Curriculum Completion
1. **Animate mates** (Week 4) — revolute/slider animation playback
2. **Re-order features** (Week 7) — drag to reorder in feature tree
3. **Custom planes** (Week 2) — create planes at angle/offset from existing
4. **Commenting** (Week 6) — annotation comments on 3D model
5. **Emboss/Engrave** (Week 11) — text/logo extrude on surface

### Nice-to-Have
6. **Linked documents** (Week 4, 8) — cross-document part references
7. **FeatureScript** (Week 7) — custom parametric scripting
8. **Assembly snap mode** (Week 8) — auto-snap when inserting
9. **Gear relations** (Week 12) — gear ratio mate constraint
10. **Import sketch pictures** (Week 11) — trace over imported images
11. **Fastener replication** (Week 8) — duplicate hardware
12. **Assembly grouping** (Week 8) — component groups
13. **Mobile editing** (Week 12) — responsive/touch UI
14. **Tolerance editing UI** (Week 5) — interactive GD&T placement
