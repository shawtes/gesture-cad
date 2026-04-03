# Onshape Part Studio — Complete Tool Audit

Built from: screenshot analysis, DOM extraction, help docs, and Playwright research.

## MAIN TOOLBAR (left to right from screenshot)

### Group 1: Undo/Redo
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Undo | `UNDO_A_CHANGE` | Cmd+Z | ✅ `undo` | DONE |
| Redo | `REDO_A_CHANGE` | Ctrl+Y | ✅ `redo` | DONE |

### Group 2: Sketch
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Sketch | `newSketch` | Shift+S | ✅ enters sketch mode | DONE |

### Group 3: Extrude family (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Extrude | `extrude` | Shift+E | ✅ interactive drag | DONE |
| Revolve | `revolve` | Shift+W | ✅ `revolve_tool` | DONE |
| Sweep | `sweep` | — | ✅ `sweep` | DONE |
| Loft | `loft` | — | ✅ `loft` | DONE |
| Thicken | `thicken` | — | ✅ `thicken` | DONE |
| Rib | `rib` | — | ✅ `rib` | DONE |

### Group 4: Fillet/Chamfer family (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Fillet | `fillet` | Shift+F | ✅ `fillet` | DONE |
| Chamfer | `chamfer` | — | ✅ `chamfer` | DONE |
| Body Draft | `bodyDraft` | — | ✅ `draft` | DONE |
| Rib | `rib` | — | ✅ `rib` | DONE |
| Shell | `shell` | — | ✅ `shell` | DONE |
| Hole | `hole` | — | ✅ `hole` | DONE |
| External Thread | `externalThread` | — | ❌ | **MISSING** |

### Group 5: Pattern family (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Linear Pattern | `linearPattern` | — | ✅ `linear_pattern` | DONE |
| Circular Pattern | `circularPattern` | — | ✅ `circular_pattern` | DONE |
| Curve Pattern | `curvePattern` | — | ✅ `curve_pattern` | DONE |
| Mirror | `mirror` | — | ✅ `mirror` | DONE |

### Group 6: Boolean (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Boolean | `booleanBodies` | — | ✅ `union`/`subtract`/`intersect` | DONE |

### Group 7: Modify/Direct Edit family (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Modify Fillet | `modifyFillet` | — | ❌ | **MISSING** |
| Move Face | `moveFace` | — | ❌ | **MISSING** |
| Delete Face | `deleteFace` | — | ❌ | **MISSING** |
| Replace Face | `replaceFace` | — | ❌ | **MISSING** |
| Offset Face | `offsetFace` | — | ❌ | **MISSING** |
| Split Part | `splitPart` | — | ✅ `split` | DONE |
| Delete Part | `deletePart` | — | ❌ | **MISSING** |
| Move/Copy Part | `transformPart` | — | ❌ | **MISSING** |

### Group 8: Plane/Construction (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Plane | `cPlane` | — | ✅ `custom_plane` | DONE |
| Mate Connector | `mateConnector` | Ctrl+M | ❌ | **MISSING** |
| Construction Axis | `cAxis` | — | ❌ | **MISSING** |
| Construction Point | `cPoint` | — | ❌ | **MISSING** |

### Group 9: Frame (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Frame | `frame` | — | ❌ | **MISSING** |

### Group 10: Sheet Metal (dropdown ▾)
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Sheet Metal Model | `sheetMetalStart` | — | ⚠️ partial (sheet metal calc exists) | PARTIAL |
| Flange | `sheetMetalFlange` | — | ❌ | **MISSING** |
| Hem | `sheetMetalHem` | — | ❌ | **MISSING** |
| Tab | `sheetMetalTab` | — | ❌ | **MISSING** |
| Flat Pattern | `sheetMetalFlatten` | — | ⚠️ `generateFlatPattern` exists | PARTIAL |
| Sheet Metal Joint | `sheetMetalJoint` | — | ❌ | **MISSING** |

### Group 11: Custom Features
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Add Custom Features | `USER_FEATURES` | — | ❌ | **MISSING** |

### Group 12: Search
| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Search tools | — | Alt+C | ✅ command palette | DONE |

---

## SKETCH TOOLBAR (when in sketch mode)

| Tool | Command ID | Shortcut | GestureCAD | Status |
|------|-----------|----------|------------|:------:|
| Line | `line` | L | ✅ `line` | DONE |
| Corner Rectangle | `cornerRectangle` | — | ✅ `rect` | DONE |
| Center Point Rectangle | `centerRectangle` | R | ❌ | **MISSING** |
| Center Point Circle | `centerCircle` | C | ✅ `circle` | DONE |
| 3 Point Circle | `threePointCircle` | — | ❌ | **MISSING** |
| Tangent Arc | `tangentArc` | — | ❌ | **MISSING** |
| 3 Point Arc | `threePointArc` | A | ✅ `arc` | DONE |
| Spline | `spline` | — | ✅ `spline` | DONE |
| Point | `point` | P | ✅ `draw` | DONE |
| Construction | `construction` | Q | ✅ `construction` | DONE |
| Dimension | `dimension` | D | ✅ `dimension` | DONE |
| Constrain (Coincident) | `coincident` | I | ⚠️ auto-detect only | PARTIAL |
| Constrain (Horizontal) | `horizontal` | H | ⚠️ auto-detect only | PARTIAL |
| Constrain (Vertical) | `vertical` | V | ⚠️ auto-detect only | PARTIAL |
| Constrain (Perpendicular) | `perpendicular` | Shift+L | ⚠️ auto-detect only | PARTIAL |
| Constrain (Parallel) | `parallel` | B | ⚠️ auto-detect only | PARTIAL |
| Constrain (Tangent) | `tangent` | T | ⚠️ auto-detect only | PARTIAL |
| Constrain (Equal) | `equal` | — | ⚠️ auto-detect only | PARTIAL |
| Constrain (Midpoint) | `midpoint` | — | ⚠️ auto-detect only | PARTIAL |
| Constrain (Symmetric) | `symmetric` | — | ⚠️ auto-detect only | PARTIAL |
| Constrain (Concentric) | `concentric` | — | ⚠️ auto-detect only | PARTIAL |
| Mirror (sketch) | `sketchMirror` | — | ✅ `mirror` | DONE |
| Trim | `trim` | T | ✅ `trim` | DONE |
| Offset | `offset` | O | ✅ `offset` | DONE |
| Linear Sketch Pattern | `sketchLinearPattern` | — | ❌ | **MISSING** |
| Circular Sketch Pattern | `sketchCircularPattern` | — | ❌ | **MISSING** |
| Use/Project | `useProjection` | U | ❌ | **MISSING** |
| Intersection | `sketchIntersection` | — | ❌ | **MISSING** |
| Text | `sketchText` | — | ❌ | **MISSING** |
| Slot (Center point) | `centerPointSlot` | — | ✅ `slot` | DONE |
| Polygon | `polygon` | G | ✅ `polygon` | DONE |
| Ellipse | `ellipse` | E | ✅ `ellipse` | DONE |

## CURVE FEATURES (3D curves, not sketch)

| Tool | Command ID | GestureCAD | Status |
|------|-----------|------------|:------:|
| Helix | `helix` | ✅ `helix` | DONE |
| 3D Fit Spline | `fitSpline3D` | ✅ `fitSpline3D()` lib | DONE |
| Projected Curve | `projectedCurve` | ❌ | **MISSING** |
| Bridging Curve | `bridgingCurve` | ❌ | **MISSING** |
| Composite Curve | `compositeCurve` | ❌ | **MISSING** |
| Intersection Curve | `intersectionCurve` | ❌ | **MISSING** |
| Trim Curve (3D) | `trimCurve3D` | ❌ | **MISSING** |
| Isocline | `isocline` | ❌ | **MISSING** |
| Offset Curve (3D) | `offsetCurve3D` | ❌ | **MISSING** |
| Isoparametric Curve | `isoparametricCurve` | ❌ | **MISSING** |
| Edit Curve | `editCurve` | ❌ | **MISSING** |
| Routing Curve | `routingCurve` | ❌ | **MISSING** |

## LEFT SIDEBAR ICONS (from screenshot)

| Icon | Description | GestureCAD | Status |
|------|-------------|------------|:------:|
| Feature List | Toggle feature panel | ✅ Feature Tree | DONE |
| Insert | Insert part/component | ❌ | **MISSING** |
| Comments | Thread comments | ✅ `comments.ts` | DONE |
| Clipboard | Copy/paste features | ❌ | **MISSING** |
| Configuration | Part configurations | ✅ `ConfigurationTable` | DONE |
| Appearances | Material/color | ✅ `rendering.ts` materials | DONE |

## RIGHT SIDEBAR ICONS (from screenshot)

| Icon | Description | GestureCAD | Status |
|------|-------------|------------|:------:|
| Section View | Cut section display | ✅ `generateSectionView` | DONE |
| Named Views | Save camera positions | ❌ | **MISSING** |
| Mass Properties | Weight/volume/CG | ✅ Mass properties panel | DONE |
| Measure | Distance/angle tool | ✅ Dimension tool | DONE |
| Analysis | Curvature/draft/zebra | ⚠️ UI exists, analysis partial | PARTIAL |

## FEATURE TREE (from screenshot)

| Element | GestureCAD | Status |
|---------|------------|:------:|
| Filter by name or type | ❌ | **MISSING** |
| Default geometry section | ❌ | **MISSING** |
| Origin point | ❌ | **MISSING** |
| Top/Front/Right planes | ✅ 3 planes exist | DONE |
| Sketches listed | ✅ Feature tree shows sketches | DONE |
| Features listed | ✅ Feature tree shows features | DONE |
| Parts (0) section | ❌ | **MISSING** |
| Rollback bar | ❌ | **MISSING** |

## BOTTOM BAR

| Element | GestureCAD | Status |
|---------|------------|:------:|
| + button (new tab) | ✅ `+` button | DONE |
| Part Studio tab | ✅ | DONE |
| Assembly tab | ✅ | DONE |
| Drawing tab | ⚠️ tab exists but no full drawing mode | PARTIAL |
| Search icon (bottom left) | ❌ | **MISSING** |

---

## SUMMARY

### What We Have: 42 tools/features ✅
### What's Partial: 12 tools ⚠️
### What's Missing: 29 tools ❌

### Missing Tools by Priority

**HIGH (blocks basic Onshape workflows):**
1. External Thread — bolt/screw threads on cylinders
2. Modify Fillet — edit fillets on imported parts
3. Move Face — directly push/pull faces
4. Delete Face — remove faces
5. Replace Face — swap surface
6. Offset Face — push/pull face by distance
7. Move/Copy Part — transform entire parts
8. Mate Connector (explicit) — Ctrl+M placement
9. Center Point Rectangle — sketch tool
10. 3 Point Circle — sketch tool

**MEDIUM (advanced workflows):**
11. Tangent Arc — sketch tool
12. Sketch Text — text on sketch plane
13. Sketch Linear Pattern — pattern in sketch
14. Sketch Circular Pattern — pattern in sketch
15. Use/Project — project edges to sketch
16. Sketch Intersection — find intersections
17. Frame — structural frame generation
18. Construction Axis / Point
19. Named Views — save camera positions
20. Rollback bar — drag to rewind feature tree

**LOW (specialty):**
21-29. Sheet metal (Flange, Hem, Tab, Joint), 3D curve tools (Projected, Bridging, Composite, Intersection, Trim, Isocline, Offset, Isoparametric, Edit, Routing), Custom features
