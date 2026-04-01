# GestureCAD -- 30-Sprint Development Roadmap

> **Master reference document** for the GestureCAD project: a hand-gesture-controlled CAD application.
>
> **Tech Stack**: Next.js 15 + React 19 + Three.js/@react-three/fiber + MediaPipe Hands | FastAPI + Build123d/OpenCASCADE | Turborepo + pnpm
>
> **Sprint cadence**: 2 weeks per sprint (60 weeks total)

---

## Table of Contents

| Sprint | Theme |
|--------|-------|
| [1](#sprint-1)   | Core Interactive Loop + 2D Sketch Foundation |
| [2](#sprint-2)   | Constraint Solver + Backend Integration |
| [3](#sprint-3)   | 3D Operations Foundation |
| [4](#sprint-4)   | Multi-hand Gestures + Advanced Sketch |
| [5](#sprint-5)   | Parametric Design |
| [6](#sprint-6)   | File Import/Export |
| [7](#sprint-7)   | Boolean Operations |
| [8](#sprint-8)   | Fillet, Chamfer, Shell |
| [9](#sprint-9)   | Pattern Features |
| [10](#sprint-10) | Advanced 3D |
| [11](#sprint-11) | Assembly Foundation |
| [12](#sprint-12) | Assembly Advanced |
| [13](#sprint-13) | Sheet Metal |
| [14](#sprint-14) | Surfacing Basics |
| [15](#sprint-15) | Advanced Surfacing |
| [16](#sprint-16) | Drawing/Documentation |
| [17](#sprint-17) | FEA -- Stress Analysis |
| [18](#sprint-18) | FEA -- Thermal + Modal |
| [19](#sprint-19) | Topology Optimization |
| [20](#sprint-20) | PBR Rendering |
| [21](#sprint-21) | Animation |
| [22](#sprint-22) | Collaboration Foundation |
| [23](#sprint-23) | Version Control |
| [24](#sprint-24) | Advanced Gestures |
| [25](#sprint-25) | Performance |
| [26](#sprint-26) | DXF/SVG Pipeline |
| [27](#sprint-27) | Weldments + Structural |
| [28](#sprint-28) | CAM Integration |
| [29](#sprint-29) | Plugin System |
| [30](#sprint-30) | Polish + Launch |

---

## Sprint 1

### Core Interactive Loop + 2D Sketch Foundation

Gestures to tools, toolbar, point/line/circle/rect on XZ plane, undo/redo.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | MediaPipe Hands initializes on camera feed and tracks 21 hand landmarks at 30+ FPS | Must |
| F1.2 | Landmark data is classified into gestures: Point, Pinch, Open Palm, Fist, Peace, Three-finger, L-shape, Swipe | Must |
| F1.3 | Active gesture maps to the corresponding sketch tool (point, line, circle, rectangle) | Must |
| F1.4 | Toolbar UI displays available tools with active-tool highlight synchronized to gesture state | Must |
| F1.5 | User can also click toolbar buttons to select tools (mouse fallback) | Should |
| F1.6 | Sketch entities render on the XZ ground plane in the Three.js viewport | Must |
| F1.7 | Undo (swipe-left) and Redo (swipe-right) traverse a command stack | Must |
| F1.8 | Grid overlay and axis indicator render on the sketch plane | Should |
| F1.9 | Snap-to-grid for cursor position when sketching | Could |

**Non-functional Requirements**

- Gesture recognition latency < 50 ms from frame capture to tool activation.
- Viewport maintains 60 FPS with up to 500 sketch entities.
- Command stack supports at least 200 undo levels.

#### 2. Architecture

- **GestureEngine** (`apps/web/src/gesture/GestureEngine.ts`): Wraps `@mediapipe/hands`, emits normalized landmark events via a pub/sub bus.
- **GestureClassifier** (`apps/web/src/gesture/GestureClassifier.ts`): Consumes landmarks, runs Fingerpose-style angle checks, emits `GestureEvent { type, confidence, handedness }`.
- **ToolStateMachine** (`apps/web/src/tools/ToolStateMachine.ts`): Maps `GestureEvent.type` to active tool. Implements state transitions (idle -> drawing -> confirming).
- **SketchStore** (Zustand store at `apps/web/src/stores/sketchStore.ts`): Holds `SketchEntity[]`, exposes `addEntity`, `removeEntity`, `updateEntity`. Integrates with `CommandStack` for undo/redo.
- **CommandStack** (`apps/web/src/commands/CommandStack.ts`): Generic command-pattern implementation with `execute()` / `undo()` / `redo()`.
- **SketchRenderer** (`apps/web/src/components/SketchRenderer.tsx`): R3F component that reads from `sketchStore` and renders `<Line>`, `<Circle>`, `<Rect>` geometry on the XZ plane.
- **Toolbar** (`apps/web/src/components/Toolbar.tsx`): React component subscribing to `ToolStateMachine` state.
- Data flow: Camera -> MediaPipe -> GestureEngine -> GestureClassifier -> ToolStateMachine -> SketchTool.onGesture() -> CommandStack.execute(AddEntityCommand) -> sketchStore -> SketchRenderer.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/gesture/GestureEngine.ts` | MediaPipe Hands initialization, landmark normalization |
| `apps/web/src/gesture/GestureClassifier.ts` | Angle-based gesture classification using Fingerpose patterns |
| `apps/web/src/gesture/gestures.ts` | Gesture definition configs (finger curl/direction thresholds) |
| `apps/web/src/tools/ToolStateMachine.ts` | Gesture-to-tool mapping, state transitions |
| `apps/web/src/tools/PointTool.ts` | Places point entities on pinch confirm |
| `apps/web/src/tools/LineTool.ts` | Two-point line creation (peace sign gesture) |
| `apps/web/src/tools/CircleTool.ts` | Center-radius circle (three-finger gesture) |
| `apps/web/src/tools/RectTool.ts` | Corner-corner rectangle (L-shape gesture) |
| `apps/web/src/commands/CommandStack.ts` | Undo/redo command pattern |
| `apps/web/src/commands/AddEntityCommand.ts` | Concrete command for entity creation |
| `apps/web/src/stores/sketchStore.ts` | Zustand store for sketch entities |
| `apps/web/src/components/SketchRenderer.tsx` | R3F sketch entity rendering |
| `apps/web/src/components/Toolbar.tsx` | Tool selection toolbar |
| `apps/web/src/components/Viewport.tsx` | Main R3F Canvas wrapper with camera, lights, grid |
| `packages/cad-types/src/sketch.ts` | `SketchEntity`, `Point2D`, `Line2D`, `Circle2D`, `Rect2D` types |
| `packages/gesture-types/src/index.ts` | `GestureEvent`, `GestureType` enum, `HandLandmarks` |

**Implementation order:** cad-types -> gesture-types -> GestureEngine -> GestureClassifier -> ToolStateMachine -> CommandStack -> sketchStore -> individual tools -> SketchRenderer -> Toolbar -> Viewport.

#### 4. Testing

- **Unit (Vitest):** GestureClassifier with mocked landmark arrays for each gesture; CommandStack push/undo/redo; SketchStore entity CRUD.
- **E2E (Playwright):** Mock webcam feed with recorded hand video; verify toolbar highlights change; draw a line and confirm two points appear; undo removes last entity.
- **Visual regression:** Capture snapshot of viewport with grid + 3 sketch entities; compare against baseline.

#### 5. Acceptance Criteria

- [ ] Camera permission prompt appears and MediaPipe loads within 3 seconds.
- [ ] Raising index finger activates the Point tool and toolbar highlights "Point".
- [ ] Peace sign activates Line tool; two pinch-confirms create a line segment on the XZ plane.
- [ ] Three fingers activate Circle tool; pinch center, drag radius, pinch confirm draws circle.
- [ ] L-shape activates Rectangle tool; two pinch-confirms create a rectangle.
- [ ] Swipe left undoes the last operation; swipe right redoes it.
- [ ] Toolbar buttons can be clicked with mouse as fallback.
- [ ] Viewport renders at 60 FPS with grid visible.

#### 6. Dependencies

- **Prior sprints:** None (first sprint).
- **External libraries:** `@mediapipe/hands@0.4.x`, `fingerpose@0.2.x`, `@react-three/fiber@9.x`, `@react-three/drei@10.x`, `three@0.170.x`, `zustand@5.x`, `next@15.x`, `react@19.x`.

---

## Sprint 2

### Constraint Solver + Backend Integration

PlaneGCS WASM, auto-constraints (H/V/coincident/tangent/equal), Build123d geometry API.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | PlaneGCS WASM module loads in the browser and solves 2D geometric constraints | Must |
| F2.2 | Auto-detect horizontal/vertical constraints when a line is near-axis (within 5-degree threshold) | Must |
| F2.3 | Auto-detect coincident constraints when endpoints are within snap distance (8px) | Must |
| F2.4 | Auto-detect tangent constraints between line-circle and circle-circle pairs | Should |
| F2.5 | Auto-detect equal-length constraints for consecutive parallel lines | Could |
| F2.6 | Constraint icons render at midpoints of constrained entities | Must |
| F2.7 | FastAPI backend exposes `/api/sketch` endpoint accepting sketch JSON and returning validated geometry | Must |
| F2.8 | Build123d on the backend constructs Wire/Face objects from sketch entities | Must |
| F2.9 | Constraint violations highlighted in red; solved state in green | Should |

**Non-functional Requirements**

- PlaneGCS solve time < 16 ms for up to 100 constraints (to not block frame).
- Backend sketch validation round-trip < 200 ms.
- WASM bundle size < 500 KB gzipped.

#### 2. Architecture

- **ConstraintSolver** (`apps/web/src/constraints/ConstraintSolver.ts`): Wraps the PlaneGCS WASM module. Maintains a `ConstraintSystem` mirroring the sketch store. Exposes `addConstraint()`, `removeConstraint()`, `solve()`.
- **AutoConstraintDetector** (`apps/web/src/constraints/AutoConstraintDetector.ts`): Runs after each entity placement. Checks geometric proximity/angle conditions and proposes constraints.
- **ConstraintStore** (Zustand, `apps/web/src/stores/constraintStore.ts`): Holds `Constraint[]` with types `Horizontal | Vertical | Coincident | Tangent | Equal`.
- **ConstraintRenderer** (`apps/web/src/components/ConstraintRenderer.tsx`): R3F overlay rendering constraint icons (H/V symbols, coincident dots, tangent arcs).
- **Backend API** (`apps/api/routers/sketch.py`): FastAPI router. Receives sketch JSON, constructs Build123d `Wire` objects, validates closure, returns face validity.
- **Build123d Service** (`apps/api/services/geometry.py`): Translates sketch entities into Build123d primitives (`Line`, `Arc`, `Circle`), builds `Wire` -> `Face`.
- Data flow: Entity created -> AutoConstraintDetector proposes constraints -> ConstraintStore updated -> ConstraintSolver.solve() adjusts entity positions -> sketchStore patched -> SketchRenderer re-renders. Concurrently, sketch JSON sent to backend for B-rep validation.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/constraints/ConstraintSolver.ts` | PlaneGCS WASM wrapper |
| `apps/web/src/constraints/AutoConstraintDetector.ts` | Proximity/angle-based constraint proposal |
| `apps/web/src/constraints/types.ts` | Constraint type definitions |
| `apps/web/src/stores/constraintStore.ts` | Zustand store for constraints |
| `apps/web/src/components/ConstraintRenderer.tsx` | Visual constraint indicators |
| `apps/web/public/wasm/planegcs.wasm` | PlaneGCS compiled WASM binary |
| `apps/web/src/constraints/planegcs-loader.ts` | WASM loader with fallback |
| `apps/api/routers/sketch.py` | FastAPI sketch validation endpoint |
| `apps/api/services/geometry.py` | Build123d geometry construction |
| `apps/api/models/sketch.py` | Pydantic models for sketch entities |
| `packages/cad-types/src/constraints.ts` | Shared constraint type enums |

**Modified files:** `sketchStore.ts` (add constraint-driven position updates), `SketchRenderer.tsx` (constraint coloring).

**Implementation order:** PlaneGCS WASM build/bundle -> ConstraintSolver -> AutoConstraintDetector -> constraintStore -> ConstraintRenderer -> backend Pydantic models -> geometry service -> sketch router.

#### 4. Testing

- **Unit (Vitest):** ConstraintSolver with known geometry (two lines sharing endpoint -> coincident solves correctly); AutoConstraintDetector threshold edge cases.
- **Unit (pytest):** Build123d wire construction from JSON; face validation for open vs closed wires.
- **E2E (Playwright):** Draw near-horizontal line -> verify H constraint icon appears; draw two lines with close endpoints -> verify they snap together.
- **Visual regression:** Constraint icons positioned correctly on various entity configurations.

#### 5. Acceptance Criteria

- [ ] PlaneGCS WASM loads without errors in Chrome, Firefox, Safari.
- [ ] Drawing a near-horizontal line (< 5 degrees from X-axis) auto-applies Horizontal constraint.
- [ ] Drawing a near-vertical line auto-applies Vertical constraint.
- [ ] Two endpoints within 8px snap together with Coincident constraint.
- [ ] Constraint icons (H, V, dot) render at entity midpoints.
- [ ] Backend `/api/sketch` accepts sketch JSON and returns `{ valid: true, face_area: number }`.
- [ ] Dragging a constrained point re-solves in real time without frame drops.
- [ ] Under-constrained entities shown in blue; fully constrained in green; over-constrained in red.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (sketch entities and store).
- **External libraries:** `planegcs` (WASM build from FreeCAD PlaneGCS), `build123d@0.8.x` (Python), `fastapi@0.115.x`, `pydantic@2.x`.

---

## Sprint 3

### 3D Operations Foundation

Extrude, Revolve via gestures, Feature tree panel, Build123d pipeline.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | "Pinch and pull" gesture on a closed sketch profile initiates extrude operation | Must |
| F3.2 | Hand vertical displacement maps to extrude distance with real-time preview | Must |
| F3.3 | "Twist" gesture (wrist rotation while pinching) initiates revolve around a selected axis | Must |
| F3.4 | Revolve angle maps to wrist rotation angle (0-360 degrees) | Must |
| F3.5 | Feature tree panel displays operation history as expandable nodes | Must |
| F3.6 | Clicking a feature tree node highlights the corresponding geometry in the viewport | Should |
| F3.7 | Backend converts sketch + operation into B-rep solid via Build123d `extrude()` / `revolve()` | Must |
| F3.8 | B-rep solid is tessellated to triangle mesh and sent to frontend for rendering | Must |
| F3.9 | Bi-directional extrude (symmetric about sketch plane) via gesture modifier | Could |

**Non-functional Requirements**

- Extrude preview updates at 30+ FPS during gesture.
- Backend B-rep computation < 500 ms for profiles with up to 20 edges.
- Tessellated mesh transfer < 1 MB for typical parts.

#### 2. Architecture

- **ExtrudeTool** (`apps/web/src/tools/ExtrudeTool.ts`): Detects "pinch-pull" gesture sequence. Creates preview geometry using Three.js `ExtrudeGeometry` locally for responsiveness. On confirm, sends sketch + distance to backend.
- **RevolveTool** (`apps/web/src/tools/RevolveTool.ts`): Detects "twist" gesture. Uses `LatheGeometry` for preview. Sends sketch + axis + angle to backend.
- **FeatureStore** (Zustand, `apps/web/src/stores/featureStore.ts`): Ordered list of `Feature` objects (Sketch, Extrude, Revolve). Each has status (computing, ready, error).
- **FeatureTreePanel** (`apps/web/src/components/FeatureTreePanel.tsx`): Sidebar panel with collapsible tree nodes. Supports drag-to-reorder (future sprint).
- **MeshRenderer** (`apps/web/src/components/MeshRenderer.tsx`): Receives tessellated mesh (vertices, normals, indices) from backend, renders as `BufferGeometry`.
- **Backend Pipeline** (`apps/api/services/pipeline.py`): Orchestrates sketch -> wire -> face -> solid flow. `extrude(face, direction, distance)` and `revolve(face, axis, angle)` via Build123d.
- **Tessellation Service** (`apps/api/services/tessellation.py`): Converts OCC `TopoDS_Shape` to indexed triangle mesh using `BRepMesh_IncrementalMesh`. Returns binary buffer (positions + normals + indices).
- **WebSocket channel** for streaming mesh updates during long operations.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/ExtrudeTool.ts` | Pinch-pull extrude gesture handler |
| `apps/web/src/tools/RevolveTool.ts` | Twist revolve gesture handler |
| `apps/web/src/stores/featureStore.ts` | Feature history store |
| `apps/web/src/components/FeatureTreePanel.tsx` | Feature tree sidebar |
| `apps/web/src/components/MeshRenderer.tsx` | Tessellated solid renderer |
| `apps/web/src/utils/meshDecoder.ts` | Binary mesh buffer decoder |
| `apps/api/routers/operations.py` | `/api/extrude`, `/api/revolve` endpoints |
| `apps/api/services/pipeline.py` | Sketch-to-solid pipeline |
| `apps/api/services/tessellation.py` | B-rep to triangle mesh conversion |
| `apps/api/models/operations.py` | Pydantic models for extrude/revolve params |
| `packages/cad-types/src/features.ts` | Feature, ExtrudeFeature, RevolveFeature types |
| `packages/cad-types/src/mesh.ts` | TessellatedMesh type (positions, normals, indices) |

**Modified files:** `GestureClassifier.ts` (add pinch-pull and twist detection), `Viewport.tsx` (integrate MeshRenderer), `Toolbar.tsx` (add extrude/revolve icons).

**Implementation order:** cad-types (features, mesh) -> featureStore -> backend pipeline + tessellation -> operations router -> ExtrudeTool + RevolveTool -> MeshRenderer -> FeatureTreePanel.

#### 4. Testing

- **Unit (Vitest):** FeatureStore add/remove/reorder; mesh buffer decoding from ArrayBuffer.
- **Unit (pytest):** Build123d extrude of a square profile produces a box with 6 faces; revolve of a rectangle produces a cylinder-like solid.
- **E2E (Playwright):** Draw closed rectangle -> pinch-pull gesture -> verify 3D box renders in viewport; verify feature tree shows "Extrude 1".
- **Visual regression:** Snapshot of extruded box with default material, compare normals/lighting.

#### 5. Acceptance Criteria

- [ ] Pinch-pull gesture on a closed profile shows real-time extrude preview.
- [ ] Releasing pinch confirms extrude; backend returns tessellated solid within 500 ms.
- [ ] Twist gesture on a closed profile with a selected axis shows revolve preview.
- [ ] Feature tree panel lists all operations in creation order.
- [ ] Clicking a feature node highlights the corresponding solid face in the viewport.
- [ ] Extruded/revolved solid renders with correct normals (smooth shading on curves, flat on planar faces).
- [ ] Error state shown if sketch profile is not closed.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (sketch tools), Sprint 2 (constraint solver, backend sketch API).
- **External libraries:** `build123d@0.8.x`, Three.js `ExtrudeGeometry`/`LatheGeometry` (preview only).

---

## Sprint 4

### Multi-hand Gestures + Advanced Sketch

Two-hand zoom/rotate, Spline tool, Trim/Extend, Offset, Arc.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | Two-hand pinch gesture (both hands pinching) maps to viewport zoom | Must |
| F4.2 | Two-hand rotate gesture (both hands open, rotating) maps to viewport orbit | Must |
| F4.3 | Open palm gesture maps to viewport pan (single hand) | Must |
| F4.4 | Spline tool: multi-point B-spline creation via sequential pinch gestures | Must |
| F4.5 | Arc tool: three-point arc (start, mid, end) via pinch gestures | Must |
| F4.6 | Trim tool: fist-select an entity near an intersection, gesture "cut" to trim | Should |
| F4.7 | Extend tool: fist-select an entity endpoint, drag to extend to nearest boundary | Should |
| F4.8 | Offset tool: select entity, pinch-drag perpendicular to create offset copy | Should |
| F4.9 | Smooth transition between one-hand and two-hand gesture modes | Must |

**Non-functional Requirements**

- Two-hand gesture detection robust to temporary occlusion of one hand (300 ms grace period).
- Spline with up to 20 control points renders at 60 FPS.
- Viewport navigation feels natural with < 16 ms input-to-visual latency.

#### 2. Architecture

- **MultiHandTracker** (`apps/web/src/gesture/MultiHandTracker.ts`): Extends GestureEngine to track two hands simultaneously. Maintains hand identity across frames using wrist position continuity.
- **NavigationController** (`apps/web/src/navigation/NavigationController.ts`): Consumes two-hand gestures. Computes zoom delta from inter-hand distance change, orbit delta from inter-hand angle change, pan from single-hand open-palm movement. Applies to R3F camera via `useThree().camera`.
- **SplineTool** (`apps/web/src/tools/SplineTool.ts`): Collects control points on pinch, builds cubic B-spline using `THREE.CubicBezierCurve3` segments. Visual preview with control polygon and curve.
- **ArcTool** (`apps/web/src/tools/ArcTool.ts`): Three-point arc. Computes center/radius/angles from three points using circumscribed circle formula.
- **TrimTool** (`apps/web/src/tools/TrimTool.ts`): Finds intersections between selected entity and all others. Splits entity at nearest intersection to gesture point. Removes the indicated segment.
- **ExtendTool** (`apps/web/src/tools/ExtendTool.ts`): Extends a line/arc endpoint to the nearest intersecting boundary entity.
- **OffsetTool** (`apps/web/src/tools/OffsetTool.ts`): Computes parallel offset of line/arc/spline at a given distance. Uses normal direction from gesture drag vector.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/gesture/MultiHandTracker.ts` | Two-hand tracking with identity persistence |
| `apps/web/src/navigation/NavigationController.ts` | Gesture-driven camera navigation |
| `apps/web/src/tools/SplineTool.ts` | B-spline creation tool |
| `apps/web/src/tools/ArcTool.ts` | Three-point arc tool |
| `apps/web/src/tools/TrimTool.ts` | Entity trimming at intersections |
| `apps/web/src/tools/ExtendTool.ts` | Entity extension to boundaries |
| `apps/web/src/tools/OffsetTool.ts` | Parallel offset copy |
| `apps/web/src/utils/intersections.ts` | Line-line, line-circle, line-arc, circle-circle intersection math |
| `apps/web/src/utils/spline.ts` | B-spline evaluation and fitting utilities |
| `packages/cad-types/src/sketch.ts` | Add `Arc2D`, `Spline2D` types |

**Modified files:** `GestureEngine.ts` (multi-hand support), `GestureClassifier.ts` (two-hand gesture patterns), `ToolStateMachine.ts` (navigation vs tool mode priority), `Toolbar.tsx` (add new tool icons), `SketchRenderer.tsx` (render arcs and splines).

**Implementation order:** MultiHandTracker -> NavigationController -> intersection utils -> spline utils -> ArcTool -> SplineTool -> TrimTool -> ExtendTool -> OffsetTool.

#### 4. Testing

- **Unit (Vitest):** Intersection algorithms (all pairwise combinations); spline evaluation at known parameter values; arc center/radius from three points.
- **E2E (Playwright):** Two-hand pinch zoom changes camera FOV; draw a spline with 4 control points; trim a line at a circle intersection.
- **Visual regression:** Spline rendering smoothness; arc rendering with different angle ranges.

#### 5. Acceptance Criteria

- [ ] Two-hand pinch-apart zooms in; pinch-together zooms out.
- [ ] Two-hand rotation orbits the camera around the model center.
- [ ] Open palm pans the viewport smoothly.
- [ ] Spline tool creates smooth curves through at least 4 control points.
- [ ] Arc tool creates a circular arc passing through three specified points.
- [ ] Trim tool removes the correct segment of an entity at an intersection.
- [ ] Extend tool lengthens an entity to the nearest boundary.
- [ ] Offset tool creates a parallel copy at the gesture-specified distance.
- [ ] Switching from two-hand navigation back to one-hand tool mode is seamless.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (gesture engine, sketch tools), Sprint 2 (constraint solver).
- **External libraries:** `@mediapipe/hands@0.4.x` (already loaded, now with `maxNumHands: 2`).

---

## Sprint 5

### Parametric Design

Feature history tree, Parameter editing, Dimension constraints, Design tables.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Feature history tree is fully editable: double-click a feature to edit its parameters | Must |
| F5.2 | Editing a feature re-executes all downstream features (parametric regeneration) | Must |
| F5.3 | Dimension constraints (distance, angle, radius) can be added to sketch entities | Must |
| F5.4 | Dimension values are editable inline (click the dimension text, type new value) | Must |
| F5.5 | Named parameters can be defined and referenced in dimension expressions (e.g., `width * 2`) | Must |
| F5.6 | Expression parser supports basic math: +, -, *, /, parentheses, named references | Must |
| F5.7 | Design table UI allows tabular parameter sets for variant generation | Should |
| F5.8 | Selecting a design table row regenerates the model with those parameter values | Should |
| F5.9 | Feature suppression: right-click to suppress/unsuppress a feature without deleting it | Could |

**Non-functional Requirements**

- Parametric regeneration of a 10-feature model completes within 2 seconds.
- Expression evaluation is sandboxed (no `eval()`; use a safe parser).
- Design table supports up to 100 rows without UI lag.

#### 2. Architecture

- **ParameterStore** (`apps/web/src/stores/parameterStore.ts`): Named parameters with current values. `{ name: string, value: number, expression?: string }`.
- **ExpressionParser** (`apps/web/src/utils/ExpressionParser.ts`): Recursive descent parser for arithmetic expressions with named variable lookup. Returns evaluated number or error.
- **FeatureRegenEngine** (`apps/web/src/engine/FeatureRegenEngine.ts`): Given modified feature index, replays feature list from that index forward. Sends each feature to backend sequentially, updates mesh.
- **DimensionConstraint** components: `DistanceDimension`, `AngleDimension`, `RadiusDimension` rendered as SVG overlays with editable text inputs positioned via 3D-to-2D projection.
- **DesignTablePanel** (`apps/web/src/components/DesignTablePanel.tsx`): Spreadsheet-like table with parameter columns and variant rows. Uses a lightweight grid component.
- Backend: `apps/api/routers/regenerate.py` accepts full feature list + parameter values, returns final tessellated mesh plus per-feature status.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/stores/parameterStore.ts` | Named parameter definitions and values |
| `apps/web/src/utils/ExpressionParser.ts` | Safe arithmetic expression evaluator |
| `apps/web/src/engine/FeatureRegenEngine.ts` | Parametric regeneration orchestrator |
| `apps/web/src/components/DimensionOverlay.tsx` | SVG dimension annotation overlay |
| `apps/web/src/components/DesignTablePanel.tsx` | Variant design table UI |
| `apps/web/src/commands/EditFeatureCommand.ts` | Command for editing feature parameters |
| `apps/api/routers/regenerate.py` | Full-model regeneration endpoint |
| `packages/cad-types/src/parameters.ts` | Parameter, Expression, DesignTableRow types |

**Modified files:** `featureStore.ts` (add suppression flag, parameter references), `FeatureTreePanel.tsx` (inline editing, suppress/unsuppress context menu), `constraintStore.ts` (add dimension constraints).

**Implementation order:** ExpressionParser -> parameterStore -> DimensionOverlay -> EditFeatureCommand -> FeatureRegenEngine -> backend regenerate endpoint -> DesignTablePanel.

#### 4. Testing

- **Unit (Vitest):** ExpressionParser: `"width * 2 + 5"` with `width=10` returns `25`; division by zero returns error; cyclic reference detection.
- **Unit (pytest):** Regeneration pipeline with 5 features returns correct final mesh.
- **E2E (Playwright):** Change extrude distance dimension -> model height updates in viewport; add named parameter -> reference in dimension -> change parameter -> model updates.
- **Visual regression:** Dimension annotation positioning after camera orbit.

#### 5. Acceptance Criteria

- [ ] Double-clicking a feature in the tree opens an edit panel with parameter inputs.
- [ ] Changing an extrude distance and confirming regenerates the model correctly.
- [ ] Dimension constraints display as annotation overlays on the sketch.
- [ ] Clicking a dimension value allows inline editing; pressing Enter applies the change.
- [ ] Named parameters can be created (e.g., `wall_thickness = 3`) and used in expressions.
- [ ] Design table with 3 parameter columns and 5 rows switches variants correctly.
- [ ] Suppressing a feature grays it out and excludes it from regeneration.
- [ ] Circular parameter references are detected and reported as errors.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (feature tree, extrude/revolve), Sprint 2 (constraints).
- **External libraries:** None new (uses existing stack).

---

## Sprint 6

### File Import/Export

STEP/STL import (occt-import-js), STL/OBJ/glTF export, drag-and-drop.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | Import STEP files via `occt-import-js` WASM in the browser | Must |
| F6.2 | Import STL files (ASCII and binary) in the browser | Must |
| F6.3 | Drag-and-drop files onto the viewport to import | Must |
| F6.4 | File picker dialog accessible from menu bar | Must |
| F6.5 | Export current model as STL (binary) | Must |
| F6.6 | Export current model as OBJ with MTL material file | Should |
| F6.7 | Export current model as glTF 2.0 (.glb binary) | Should |
| F6.8 | Export triggers backend tessellation at configurable resolution (coarse/medium/fine) | Must |
| F6.9 | Import progress indicator for large files (> 5 MB) | Should |

**Non-functional Requirements**

- STEP import of a 10 MB file completes within 10 seconds.
- STL import of 1M triangles renders without crashing.
- Exported STL files are valid (manifold, correct normals) per STL specification.

#### 2. Architecture

- **ImportService** (`apps/web/src/services/ImportService.ts`): Detects file type by extension, delegates to appropriate parser. STEP -> `occt-import-js` WASM, STL -> custom binary/ASCII parser.
- **OcctImportLoader** (`apps/web/src/loaders/OcctImportLoader.ts`): Wrapper around `occt-import-js`. Loads WASM, parses STEP, returns `{ meshes: TessellatedMesh[], metadata: PartInfo[] }`.
- **STLParser** (`apps/web/src/loaders/STLParser.ts`): Handles both binary and ASCII STL. Returns `TessellatedMesh`.
- **ExportService** (`apps/web/src/services/ExportService.ts`): Requests tessellated mesh from backend at specified resolution. Converts to target format.
- **Backend Export** (`apps/api/routers/export.py`): `/api/export/{format}` endpoint. Tessellates B-rep at specified deflection, returns binary buffer. Supports `stl`, `obj`, `gltf`.
- **DragDropZone** (`apps/web/src/components/DragDropZone.tsx`): Full-viewport drag-and-drop overlay with file type validation and progress feedback.
- **FileMenuBar** (`apps/web/src/components/FileMenuBar.tsx`): File > Import / Export menu items.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/services/ImportService.ts` | File type detection and import orchestration |
| `apps/web/src/loaders/OcctImportLoader.ts` | STEP import via occt-import-js |
| `apps/web/src/loaders/STLParser.ts` | STL binary/ASCII parser |
| `apps/web/src/services/ExportService.ts` | Export format conversion |
| `apps/web/src/components/DragDropZone.tsx` | Drag-and-drop import UI |
| `apps/web/src/components/FileMenuBar.tsx` | File menu bar with Import/Export |
| `apps/web/public/wasm/occt-import-js.wasm` | OpenCASCADE import WASM binary |
| `apps/api/routers/export.py` | Export endpoints (STL, OBJ, glTF) |
| `apps/api/services/exporter.py` | Format-specific export logic |

**Modified files:** `Viewport.tsx` (integrate DragDropZone), `featureStore.ts` (imported geometry as base feature).

**Implementation order:** STLParser (simplest) -> ImportService -> OcctImportLoader -> DragDropZone -> backend exporter service -> export router -> ExportService -> FileMenuBar.

#### 4. Testing

- **Unit (Vitest):** STLParser with binary and ASCII test fixtures; OcctImportLoader with a small STEP test file.
- **Unit (pytest):** Export endpoint returns valid STL header and triangle count; OBJ file has matching vertex/face counts.
- **E2E (Playwright):** Drag a `.stl` file onto viewport -> model renders; click Export > STL -> file downloads and is valid.
- **Visual regression:** Imported STEP model (standard test bracket) renders with expected shape.

#### 5. Acceptance Criteria

- [ ] Dragging a `.step` file onto the viewport imports and renders the model.
- [ ] Dragging a `.stl` file imports and renders correctly.
- [ ] File > Import opens a file picker supporting `.step`, `.stp`, `.stl` extensions.
- [ ] File > Export > STL downloads a binary STL file.
- [ ] File > Export > OBJ downloads an `.obj` + `.mtl` pair.
- [ ] File > Export > glTF downloads a `.glb` file viewable in a glTF viewer.
- [ ] Progress bar appears during import of files > 5 MB.
- [ ] Invalid file formats show a user-friendly error message.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (mesh rendering, backend pipeline).
- **External libraries:** `occt-import-js@0.0.20+`, Three.js `STLLoader` (reference only, using custom parser for WASM compat).

---

## Sprint 7

### Boolean Operations

Union/Subtract/Intersect via Manifold WASM, gesture selection of bodies.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F7.1 | Manifold WASM module loads and performs mesh boolean operations in the browser | Must |
| F7.2 | Union operation: fist-select two bodies, "bring together" gesture to union | Must |
| F7.3 | Subtract operation: fist-select tool body, then target body, "push through" gesture | Must |
| F7.4 | Intersect operation: fist-select two bodies, "squeeze" gesture | Must |
| F7.5 | Boolean preview shows transparent result before confirmation | Should |
| F7.6 | Backend performs authoritative boolean via Build123d `fuse()`, `cut()`, `intersect()` | Must |
| F7.7 | Multi-body part environment: multiple solid bodies coexist in one part | Must |
| F7.8 | Body selection highlights with outline effect | Must |

**Non-functional Requirements**

- Manifold boolean on meshes up to 50K triangles completes within 500 ms.
- Backend boolean on B-rep completes within 2 seconds.
- Transparent preview renders without z-fighting artifacts.

#### 2. Architecture

- **ManifoldService** (`apps/web/src/boolean/ManifoldService.ts`): Loads `manifold-3d` WASM. Converts `TessellatedMesh` to Manifold mesh, performs operation, converts back. Used for instant preview.
- **BooleanTool** (`apps/web/src/tools/BooleanTool.ts`): Manages body selection state (first body, second body), detects boolean-type gesture, triggers preview via ManifoldService, on confirm sends to backend.
- **BodyStore** (Zustand, `apps/web/src/stores/bodyStore.ts`): Tracks multiple solid bodies per part. Each body has an ID, mesh, visibility, selection state.
- **OutlineEffect** (`apps/web/src/effects/OutlineEffect.ts`): Post-processing outline pass for selected bodies using `EffectComposer` + `OutlinePass` from Three.js.
- **Backend Booleans** (`apps/api/services/boolean.py`): Uses Build123d `Part.fuse()`, `Part.cut()`, `Part.intersect()`. Returns new tessellated mesh.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/boolean/ManifoldService.ts` | Manifold WASM wrapper for client-side preview |
| `apps/web/src/tools/BooleanTool.ts` | Gesture-driven boolean operation tool |
| `apps/web/src/stores/bodyStore.ts` | Multi-body solid management |
| `apps/web/src/effects/OutlineEffect.ts` | Selection outline post-processing |
| `apps/web/public/wasm/manifold.wasm` | Manifold compiled WASM binary |
| `apps/api/services/boolean.py` | Build123d boolean operations |
| `apps/api/routers/boolean.py` | Boolean operation endpoints |

**Modified files:** `GestureClassifier.ts` (add bring-together, push-through, squeeze gestures), `MeshRenderer.tsx` (multi-body rendering), `FeatureTreePanel.tsx` (boolean features as tree nodes).

**Implementation order:** ManifoldService WASM loading -> bodyStore -> BooleanTool gesture detection -> OutlineEffect -> ManifoldService boolean operations -> backend boolean service -> integration.

#### 4. Testing

- **Unit (Vitest):** ManifoldService union of two overlapping boxes produces expected vertex count; subtract of cylinder from box produces expected topology.
- **Unit (pytest):** Build123d fuse/cut/intersect with known geometries; edge cases (non-overlapping bodies, coincident faces).
- **E2E (Playwright):** Create two extruded boxes -> select both -> union gesture -> verify single body in body store.
- **Visual regression:** Boolean result mesh rendering quality (no holes, correct normals).

#### 5. Acceptance Criteria

- [ ] Manifold WASM loads and initializes without errors.
- [ ] Fist-selecting a body highlights it with an outline effect.
- [ ] "Bring together" gesture on two selected bodies previews the union transparently.
- [ ] Confirming the union produces a single merged body.
- [ ] "Push through" gesture previews subtraction (tool body cuts into target).
- [ ] "Squeeze" gesture previews intersection (only overlapping volume remains).
- [ ] Boolean operations appear as features in the feature tree.
- [ ] Backend B-rep boolean matches the Manifold preview geometry.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D solids, feature tree), Sprint 1 (gesture classification).
- **External libraries:** `manifold-3d@3.0.x` (WASM), `three@0.170.x` (OutlinePass from examples).

---

## Sprint 8

### Fillet, Chamfer, Shell

Edge selection by gesture, Build123d fillet/chamfer/shell, variable radius.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F8.1 | Edge selection: point at an edge with index finger, edge highlights on hover | Must |
| F8.2 | Fillet tool: select edge(s), pinch-drag to set radius, real-time preview | Must |
| F8.3 | Chamfer tool: select edge(s), pinch-drag to set distance, real-time preview | Must |
| F8.4 | Shell tool: select face to remove, pinch-drag to set wall thickness | Must |
| F8.5 | Multi-edge selection: pinch to toggle edge selection on/off | Must |
| F8.6 | Variable radius fillet: drag different radii at edge start/end | Could |
| F8.7 | "Select all tangent edges" option for fillet/chamfer chain selection | Should |
| F8.8 | Backend performs B-rep fillet/chamfer/shell via Build123d | Must |

**Non-functional Requirements**

- Edge hover detection responds within one frame (16 ms) using raycasting.
- Fillet preview updates at 20+ FPS during radius drag.
- Shell operation on a box (6 faces, remove 1) completes within 1 second.

#### 2. Architecture

- **EdgePicker** (`apps/web/src/picking/EdgePicker.ts`): Uses `three-mesh-bvh` for accelerated raycasting. Identifies nearest edge from hit point by computing distance to edge midpoints stored in edge metadata.
- **Edge metadata**: Backend returns edge data alongside tessellated mesh: `{ edgeId, vertices: [start, end], faceIds: [left, right] }`. Stored in `bodyStore`.
- **FilletTool** (`apps/web/src/tools/FilletTool.ts`): Edge selection mode -> radius drag mode. Preview via local subdivision of edge neighborhood (approximate). Confirm sends to backend.
- **ChamferTool** (`apps/web/src/tools/ChamferTool.ts`): Similar to fillet but creates flat bevel. Distance parameter instead of radius.
- **ShellTool** (`apps/web/src/tools/ShellTool.ts`): Face selection mode (reuse `EdgePicker` adapted to faces). Thickness drag. Backend Build123d `shell()`.
- **Backend**: `apps/api/services/features.py` adds `fillet_edges(shape, edge_ids, radius)`, `chamfer_edges(shape, edge_ids, distance)`, `shell_faces(shape, face_ids, thickness)` using Build123d API.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/picking/EdgePicker.ts` | BVH-accelerated edge selection |
| `apps/web/src/picking/FacePicker.ts` | Face selection for shell tool |
| `apps/web/src/tools/FilletTool.ts` | Fillet creation tool |
| `apps/web/src/tools/ChamferTool.ts` | Chamfer creation tool |
| `apps/web/src/tools/ShellTool.ts` | Shell creation tool |
| `apps/web/src/components/EdgeHighlight.tsx` | Edge highlight overlay rendering |
| `apps/api/routers/features.py` | Fillet/chamfer/shell endpoints |
| `apps/api/services/features.py` | Build123d fillet/chamfer/shell logic |
| `packages/cad-types/src/topology.ts` | EdgeInfo, FaceInfo types with IDs |

**Modified files:** `tessellation.py` (return edge/face metadata), `bodyStore.ts` (store edge/face metadata), `MeshRenderer.tsx` (edge highlight support).

**Implementation order:** Topology types -> backend edge metadata in tessellation -> EdgePicker -> FacePicker -> FilletTool -> ChamferTool -> ShellTool -> EdgeHighlight -> backend features.

#### 4. Testing

- **Unit (Vitest):** EdgePicker finds correct edge from ray direction; multi-selection toggle works.
- **Unit (pytest):** Fillet a box edge with radius 2 -> resulting shape has correct face count; shell with thickness 1 -> hollow box.
- **E2E (Playwright):** Select an edge of an extruded box -> apply fillet -> verify rounded edge visible; apply shell -> verify hollow interior.
- **Visual regression:** Fillet radius visualization; chamfer flat face; shell cross-section.

#### 5. Acceptance Criteria

- [ ] Hovering index finger over a solid edge highlights it in yellow.
- [ ] Pinching toggles the edge into the selection set (blue highlight).
- [ ] Fillet tool with selected edges shows radius preview during drag.
- [ ] Confirmed fillet produces smooth rounded edges.
- [ ] Chamfer tool creates flat beveled edges at the specified distance.
- [ ] Shell tool hollows the solid after removing the selected face.
- [ ] "Select tangent chain" selects all edges tangent-connected to the initial pick.
- [ ] Features appear correctly in the feature tree with editable parameters.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D solids), Sprint 7 (body store), Sprint 1 (gesture picking).
- **External libraries:** `three-mesh-bvh@0.8.x`, `build123d@0.8.x`.

---

## Sprint 9

### Pattern Features

Linear/Circular pattern, Mirror, gesture-driven count/spacing.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F9.1 | Linear pattern: select feature(s), specify direction, count, and spacing | Must |
| F9.2 | Direction selection by pointing at an edge or axis | Must |
| F9.3 | Count/spacing controlled by gesture: spread fingers to increase count, pinch to decrease | Must |
| F9.4 | Circular pattern: select feature(s), specify axis, count, and total angle | Must |
| F9.5 | Circular pattern axis selection by pointing at a cylindrical face | Should |
| F9.6 | Mirror: select feature(s), select mirror plane (XY, XZ, YZ, or planar face) | Must |
| F9.7 | Pattern preview shows ghosted copies before confirmation | Must |
| F9.8 | Backend generates patterned B-rep via Build123d | Must |

**Non-functional Requirements**

- Pattern preview with up to 20 instances renders at 30+ FPS using instanced rendering.
- Backend pattern generation scales linearly with instance count.

#### 2. Architecture

- **LinearPatternTool** (`apps/web/src/tools/LinearPatternTool.ts`): Feature selection -> direction pick -> count/spacing gesture input -> preview via `THREE.InstancedMesh` -> confirm to backend.
- **CircularPatternTool** (`apps/web/src/tools/CircularPatternTool.ts`): Feature selection -> axis pick -> count/angle gesture -> preview with instanced meshes on circular positions -> confirm.
- **MirrorTool** (`apps/web/src/tools/MirrorTool.ts`): Feature selection -> plane pick -> preview mirrored ghost -> confirm.
- **PatternPreviewRenderer** (`apps/web/src/components/PatternPreviewRenderer.tsx`): Uses `InstancedMesh` with per-instance transform matrices. Ghost material (transparent, dashed outline).
- **Backend**: `apps/api/services/patterns.py` implements `linear_pattern()`, `circular_pattern()`, `mirror()` using Build123d's pattern API.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/LinearPatternTool.ts` | Linear pattern gesture tool |
| `apps/web/src/tools/CircularPatternTool.ts` | Circular pattern gesture tool |
| `apps/web/src/tools/MirrorTool.ts` | Mirror gesture tool |
| `apps/web/src/components/PatternPreviewRenderer.tsx` | Instanced mesh pattern preview |
| `apps/api/services/patterns.py` | Build123d pattern operations |
| `apps/api/routers/patterns.py` | Pattern endpoints |
| `packages/cad-types/src/patterns.ts` | LinearPattern, CircularPattern, Mirror types |

**Modified files:** `GestureClassifier.ts` (finger-spread count gesture), `featureStore.ts` (pattern feature type), `FeatureTreePanel.tsx` (pattern node with instance indicators).

**Implementation order:** Pattern types -> PatternPreviewRenderer -> LinearPatternTool -> CircularPatternTool -> MirrorTool -> backend patterns service -> integration.

#### 4. Testing

- **Unit (Vitest):** Linear pattern transform matrix generation (3 instances, spacing 10, direction X); circular pattern angle distribution (6 instances, 360 degrees).
- **Unit (pytest):** Build123d linear pattern of a cylinder hole produces correct hole count; mirror across XZ plane preserves symmetry.
- **E2E (Playwright):** Create hole -> linear pattern x4 -> verify 4 holes visible; mirror a fillet -> verify symmetric result.
- **Visual regression:** Pattern preview ghost rendering; circular pattern around cylinder axis.

#### 5. Acceptance Criteria

- [ ] Selecting a feature and pointing at an edge initiates linear pattern with that direction.
- [ ] Spreading fingers increases the pattern count; ghosted previews update in real time.
- [ ] Confirmed linear pattern creates the specified number of copies at even spacing.
- [ ] Circular pattern distributes instances evenly around the selected axis.
- [ ] Mirror creates a symmetric copy across the selected plane.
- [ ] All pattern types appear as single features in the tree (expandable to show instances).
- [ ] Editing pattern parameters (count, spacing, angle) triggers regeneration.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (features), Sprint 8 (edge/face picking).
- **External libraries:** Three.js `InstancedMesh` (built-in).

---

## Sprint 10

### Advanced 3D

Sweep, Loft, Draft, Section views, Split.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F10.1 | Sweep: select a profile sketch and a path (edge/spline), generate swept solid | Must |
| F10.2 | Loft: select two or more profile sketches on parallel planes, generate lofted solid | Must |
| F10.3 | Draft: select face(s), specify draft angle via gesture drag, apply draft to faces | Must |
| F10.4 | Section view: gesture-slice through the model to reveal interior cross-section | Should |
| F10.5 | Split: select a plane or surface to split a body into two separate bodies | Should |
| F10.6 | Sweep with guide curves for controlling the sweep shape along the path | Could |
| F10.7 | Loft with guide curves for controlling the transition shape between profiles | Could |

**Non-functional Requirements**

- Sweep/loft preview generates within 1 second for profiles up to 20 edges.
- Section view clipping is GPU-accelerated (no mesh re-generation).
- Draft angle range: 0.1 to 45 degrees.

#### 2. Architecture

- **SweepTool** (`apps/web/src/tools/SweepTool.ts`): Profile selection -> path selection -> preview via backend streaming -> confirm. Preview uses a fast client-side approximation (extrude profile along path samples).
- **LoftTool** (`apps/web/src/tools/LoftTool.ts`): Multi-profile selection (gesture to switch between sketch planes). Preview interpolates between profiles using `THREE.TubeGeometry` approximation.
- **DraftTool** (`apps/web/src/tools/DraftTool.ts`): Face selection -> drag sets angle -> preview tilts faces. Backend uses Build123d `draft()`.
- **SectionViewTool** (`apps/web/src/tools/SectionViewTool.ts`): Places a clipping plane via gesture. Uses `THREE.ClippingPlane` for GPU-accelerated cross-section. Renders section outline on the cut face.
- **SplitTool** (`apps/web/src/tools/SplitTool.ts`): Plane selection -> backend splits body -> two bodies returned.
- **Backend**: `apps/api/services/advanced3d.py` implements `sweep(profile, path)`, `loft(profiles)`, `draft(shape, faces, angle, neutral_plane)`, `split(shape, plane)` via Build123d.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/SweepTool.ts` | Sweep operation gesture tool |
| `apps/web/src/tools/LoftTool.ts` | Loft operation gesture tool |
| `apps/web/src/tools/DraftTool.ts` | Draft angle gesture tool |
| `apps/web/src/tools/SectionViewTool.ts` | Section view clipping tool |
| `apps/web/src/tools/SplitTool.ts` | Body split tool |
| `apps/web/src/components/SectionPlane.tsx` | Clipping plane visualization |
| `apps/api/services/advanced3d.py` | Sweep, loft, draft, split logic |
| `apps/api/routers/advanced3d.py` | Advanced 3D operation endpoints |

**Modified files:** `featureStore.ts` (new feature types), `FeatureTreePanel.tsx` (sweep/loft/draft/split nodes), `Viewport.tsx` (clipping plane support).

**Implementation order:** Backend advanced3d service (sweep, loft first) -> SweepTool -> LoftTool -> DraftTool -> SectionViewTool -> SplitTool -> SectionPlane component.

#### 4. Testing

- **Unit (pytest):** Sweep a circle along a helical path -> produces spring-like solid; loft a circle to a square -> smooth transition solid; draft a box face at 5 degrees.
- **E2E (Playwright):** Draw profile + path -> sweep -> verify 3D result; draw two profiles -> loft -> verify solid.
- **Visual regression:** Swept pipe rendering; lofted transition; section view cross-section hatching.

#### 5. Acceptance Criteria

- [ ] Sweep creates a solid by moving a profile along a path curve.
- [ ] Loft creates a smooth solid transitioning between two or more profiles.
- [ ] Draft applies a taper angle to selected faces relative to a neutral plane.
- [ ] Section view slices the model with a movable plane, showing interior.
- [ ] Split divides a body into two independent bodies at the specified plane.
- [ ] All operations integrate with the feature tree and support parametric editing.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D operations), Sprint 4 (spline/arc for paths), Sprint 8 (face selection).
- **External libraries:** `build123d@0.8.x`, Three.js clipping planes.

---

## Sprint 11

### Assembly Foundation

Component insertion, Coincident/Concentric mates, component tree.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F11.1 | Create a new assembly document that can contain multiple component references | Must |
| F11.2 | Insert existing part files as components into an assembly | Must |
| F11.3 | Components maintain a reference to their source part (linked, not embedded) | Must |
| F11.4 | Coincident mate: select two planar faces, they become coplanar | Must |
| F11.5 | Concentric mate: select two cylindrical faces, their axes align | Must |
| F11.6 | Component tree panel shows assembly hierarchy (assembly -> components -> mates) | Must |
| F11.7 | Drag-to-position: open palm gesture to freely move a component before mating | Should |
| F11.8 | Mate preview: show ghost position before confirming the mate | Should |
| F11.9 | Ground component: first inserted component is fixed; others are free | Must |

**Non-functional Requirements**

- Assembly supports up to 50 components without viewport lag.
- Mate solving (position/orientation) completes within 100 ms for 20 mates.
- Component insertion from file completes within 2 seconds.

#### 2. Architecture

- **AssemblyStore** (`apps/web/src/stores/assemblyStore.ts`): Holds `Component[]` (id, partRef, transform matrix, grounded flag) and `Mate[]` (type, componentA face, componentB face).
- **MateSolver** (`apps/web/src/assembly/MateSolver.ts`): Given mates list, computes component transforms. Uses iterative constraint satisfaction (for coincident: align face normals; for concentric: align cylinder axes and optionally snap distance).
- **CoincidentMate** / **ConcentricMate** (`apps/web/src/assembly/mates/`): Specific mate logic computing the required rotation and translation to satisfy the constraint.
- **ComponentTreePanel** (`apps/web/src/components/ComponentTreePanel.tsx`): Assembly hierarchy view. Components with expand to show mates.
- **AssemblyRenderer** (`apps/web/src/components/AssemblyRenderer.tsx`): Renders each component as a `<group>` with its transform matrix. Supports selection highlighting.
- **Backend**: `apps/api/routers/assembly.py` stores assembly structure, validates mates, returns assembled component transforms.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/stores/assemblyStore.ts` | Assembly state management |
| `apps/web/src/assembly/MateSolver.ts` | Constraint-based mate solving |
| `apps/web/src/assembly/mates/CoincidentMate.ts` | Coincident face mate logic |
| `apps/web/src/assembly/mates/ConcentricMate.ts` | Concentric axis mate logic |
| `apps/web/src/tools/MateTool.ts` | Face selection for mate creation |
| `apps/web/src/components/ComponentTreePanel.tsx` | Assembly hierarchy tree |
| `apps/web/src/components/AssemblyRenderer.tsx` | Multi-component assembly renderer |
| `apps/api/routers/assembly.py` | Assembly management endpoints |
| `apps/api/models/assembly.py` | Assembly, Component, Mate Pydantic models |
| `packages/cad-types/src/assembly.ts` | Assembly, Component, Mate types |

**Modified files:** `Viewport.tsx` (switch between part and assembly mode), `FileMenuBar.tsx` (New Assembly option).

**Implementation order:** Assembly types -> assemblyStore -> CoincidentMate -> ConcentricMate -> MateSolver -> MateTool -> AssemblyRenderer -> ComponentTreePanel -> backend assembly router.

#### 4. Testing

- **Unit (Vitest):** MateSolver: two components with coincident mate -> faces are coplanar; concentric mate -> axes aligned.
- **Unit (pytest):** Assembly model serialization/deserialization; mate validation (incompatible face types rejected).
- **E2E (Playwright):** Insert two parts -> apply coincident mate -> components snap together; verify component tree.
- **Visual regression:** Assembly rendering with two mated components; mate indicator icons.

#### 5. Acceptance Criteria

- [ ] New assembly document can be created from the file menu.
- [ ] Parts can be inserted into the assembly from a file browser.
- [ ] First inserted component is automatically grounded (cannot move).
- [ ] Selecting two planar faces creates a coincident mate, snapping components together.
- [ ] Selecting two cylindrical faces creates a concentric mate, aligning axes.
- [ ] Component tree shows assembly hierarchy with mate list per component.
- [ ] Components can be freely repositioned with open-palm drag before mating.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D solids), Sprint 6 (file import), Sprint 8 (face selection).
- **External libraries:** None new.

---

## Sprint 12

### Assembly Advanced

Distance/Angle/Tangent mates, Interference detection, Exploded views.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F12.1 | Distance mate: two faces with a specified offset distance | Must |
| F12.2 | Angle mate: two planar faces at a specified angle | Must |
| F12.3 | Tangent mate: a planar face tangent to a cylindrical/spherical face | Should |
| F12.4 | Interference detection: check all component pairs for volume overlap | Must |
| F12.5 | Interference results panel: list of interfering pairs with volume and location | Must |
| F12.6 | Exploded view: auto-generate or manually adjust explosion along mate directions | Must |
| F12.7 | Explosion step editing: drag components to set explosion distance per step | Should |
| F12.8 | Animated explode/collapse transition | Should |

**Non-functional Requirements**

- Interference detection for 20 components completes within 5 seconds.
- Exploded view animation runs at 60 FPS.
- Distance/Angle mates support parametric values (editable).

#### 2. Architecture

- **DistanceMate** / **AngleMate** / **TangentMate** (`apps/web/src/assembly/mates/`): Each implements the mate interface with specific constraint equations for the MateSolver.
- **InterferenceDetector** (`apps/web/src/assembly/InterferenceDetector.ts`): Uses Manifold WASM `intersect()` on all component pairs. Returns interference volumes and bounding boxes.
- **InterferencePanel** (`apps/web/src/components/InterferencePanel.tsx`): Lists interfering pairs with volume, highlights in viewport on hover.
- **ExplodedViewController** (`apps/web/src/assembly/ExplodedViewController.ts`): Computes explosion vectors from mate directions. Supports auto-explode (uniform distance) and manual per-step adjustment.
- **ExplodedViewAnimator** (`apps/web/src/assembly/ExplodedViewAnimator.ts`): Animates component transforms from assembled to exploded positions using `requestAnimationFrame` with easing.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/assembly/mates/DistanceMate.ts` | Distance offset mate |
| `apps/web/src/assembly/mates/AngleMate.ts` | Angular mate |
| `apps/web/src/assembly/mates/TangentMate.ts` | Tangent contact mate |
| `apps/web/src/assembly/InterferenceDetector.ts` | Pairwise interference check |
| `apps/web/src/assembly/ExplodedViewController.ts` | Explosion vector computation |
| `apps/web/src/assembly/ExplodedViewAnimator.ts` | Smooth explosion animation |
| `apps/web/src/components/InterferencePanel.tsx` | Interference results display |
| `apps/web/src/components/ExplodedViewControls.tsx` | Exploded view slider and step editor |
| `apps/api/services/interference.py` | Backend interference detection (B-rep based) |

**Modified files:** `MateSolver.ts` (support distance/angle/tangent constraints), `assemblyStore.ts` (exploded view state), `ComponentTreePanel.tsx` (mate type icons).

**Implementation order:** New mate types -> MateSolver updates -> InterferenceDetector -> InterferencePanel -> ExplodedViewController -> ExplodedViewAnimator -> ExplodedViewControls.

#### 4. Testing

- **Unit (Vitest):** Distance mate with offset 10 -> faces are 10 units apart; angle mate at 45 degrees; interference detection finds overlapping boxes.
- **E2E (Playwright):** Create distance mate -> verify gap between components; run interference check -> verify results panel.
- **Visual regression:** Exploded view with 5 components; interference highlight rendering.

#### 5. Acceptance Criteria

- [ ] Distance mate holds two faces at the specified offset distance.
- [ ] Angle mate holds two faces at the specified angle.
- [ ] Tangent mate positions a flat face tangent to a curved face.
- [ ] Interference detection identifies all overlapping component pairs.
- [ ] Interference panel lists pairs with interference volume values.
- [ ] Exploded view spreads components apart along mate directions.
- [ ] Explosion distance is adjustable via slider or per-step drag.
- [ ] Animated explode/collapse transitions smoothly over 1 second.

#### 6. Dependencies

- **Prior sprints:** Sprint 11 (assembly foundation, mate solver), Sprint 7 (Manifold for interference).
- **External libraries:** `manifold-3d@3.0.x` (for interference volume calculation).

---

## Sprint 13

### Sheet Metal

Base flange, Bend, Relief, Flat pattern, K-factor calculation.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F13.1 | Sheet metal environment: set material thickness and default bend radius | Must |
| F13.2 | Base flange: extrude a sketch profile as a sheet metal part with specified thickness | Must |
| F13.3 | Edge flange: select an edge and drag to create a bend with flange | Must |
| F13.4 | Bend: apply a bend to a flat face at a specified angle and radius | Must |
| F13.5 | Corner relief: auto-generate relief cuts at bend intersections (rectangular, circular, or tear) | Should |
| F13.6 | Flat pattern: unfold the sheet metal part to a flat layout | Must |
| F13.7 | K-factor: configurable K-factor (0.0-1.0) for bend allowance calculation | Must |
| F13.8 | Toggle between folded and flat views | Should |

**Non-functional Requirements**

- Flat pattern computation for parts with up to 20 bends completes within 3 seconds.
- K-factor accuracy matches industry-standard bend allowance tables within 2%.
- Flat pattern DXF export suitable for laser cutting (Sprint 26 integration).

#### 2. Architecture

- **SheetMetalStore** (`apps/web/src/stores/sheetMetalStore.ts`): Holds material thickness, bend radius, K-factor, bend table. Tracks which bodies are sheet metal parts.
- **BaseFlangeFeature**, **EdgeFlangeFeature**, **BendFeature** (`apps/web/src/sheetmetal/`): Feature definitions with parameters. Each computes a local B-rep modification on the backend.
- **FlatPatternEngine** (`apps/api/services/sheetmetal.py`): Unfolds a sheet metal body by reversing bends using bend allowance formula: `BA = angle * (radius + K * thickness)`. Returns flat face with bend lines.
- **SheetMetalToolbar** (`apps/web/src/components/SheetMetalToolbar.tsx`): Context-sensitive toolbar that appears when a sheet metal part is active.
- **FlatPatternViewer** (`apps/web/src/components/FlatPatternViewer.tsx`): 2D view of the unfolded flat pattern with bend lines and relief outlines.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/stores/sheetMetalStore.ts` | Sheet metal configuration and state |
| `apps/web/src/sheetmetal/BaseFlangeFeature.ts` | Base flange creation logic |
| `apps/web/src/sheetmetal/EdgeFlangeFeature.ts` | Edge flange with bend |
| `apps/web/src/sheetmetal/BendFeature.ts` | Bend insertion |
| `apps/web/src/sheetmetal/ReliefGenerator.ts` | Corner relief generation |
| `apps/web/src/components/SheetMetalToolbar.tsx` | Sheet metal-specific toolbar |
| `apps/web/src/components/FlatPatternViewer.tsx` | Flat pattern 2D view |
| `apps/api/services/sheetmetal.py` | Sheet metal operations and flat pattern |
| `apps/api/routers/sheetmetal.py` | Sheet metal endpoints |
| `packages/cad-types/src/sheetmetal.ts` | SheetMetal types (BendInfo, FlatPattern) |

**Modified files:** `featureStore.ts` (sheet metal feature types), `Viewport.tsx` (toggle folded/flat mode).

**Implementation order:** SheetMetal types -> sheetMetalStore -> backend sheetmetal service -> BaseFlangeFeature -> EdgeFlangeFeature -> BendFeature -> ReliefGenerator -> FlatPatternViewer -> SheetMetalToolbar.

#### 4. Testing

- **Unit (pytest):** K-factor bend allowance calculation matches reference tables; flat pattern of a single-bend part has correct dimensions.
- **E2E (Playwright):** Create base flange -> add edge flange -> toggle to flat pattern -> verify flat view renders.
- **Visual regression:** Folded sheet metal part with bends; flat pattern with bend lines.

#### 5. Acceptance Criteria

- [ ] Sheet metal environment can be configured with thickness and default bend radius.
- [ ] Base flange creates a thin-walled solid from a sketch profile.
- [ ] Edge flange adds a bend and flange to a selected edge.
- [ ] Corner reliefs appear automatically at bend intersections.
- [ ] Flat pattern unfolds the part correctly with bend allowance applied.
- [ ] K-factor is editable and affects flat pattern dimensions.
- [ ] Toggle button switches between folded 3D view and flat 2D view.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (extrude), Sprint 8 (edge selection), Sprint 5 (parametric editing).
- **External libraries:** `build123d@0.8.x`.

---

## Sprint 14

### Surfacing Basics

NURBS surfaces, Boundary surface, Trim/Extend surface.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F14.1 | Create NURBS surface from control point grid via gesture point placement | Must |
| F14.2 | Edit NURBS surface control points by dragging with pinch gesture | Must |
| F14.3 | Boundary surface: select 3 or 4 edge curves, generate surface filling the boundary | Must |
| F14.4 | Trim surface: select a surface and a cutting curve, remove the specified side | Must |
| F14.5 | Extend surface: select a surface edge, drag to extend the surface naturally | Should |
| F14.6 | Surface display modes: shaded, wireframe, control polygon, curvature combs | Should |
| F14.7 | Surface degree (U/V) configurable (2-5) | Could |

**Non-functional Requirements**

- NURBS surface with 10x10 control points renders at 60 FPS.
- Boundary surface computation completes within 2 seconds.
- Control point dragging provides real-time surface update at 30+ FPS.

#### 2. Architecture

- **NURBSSurfaceTool** (`apps/web/src/tools/NURBSSurfaceTool.ts`): Grid-based control point placement. Uses `THREE.NURBSSurface` for real-time preview. Gesture places points row by row.
- **SurfaceControlPointEditor** (`apps/web/src/tools/SurfaceControlPointEditor.ts`): Pinch-drag on a control point modifies its position. Surface re-evaluates in real time.
- **BoundarySurfaceTool** (`apps/web/src/tools/BoundarySurfaceTool.ts`): Select 3-4 boundary curves, send to backend for Coons/Gordon patch computation.
- **SurfaceTrimTool** / **SurfaceExtendTool**: Surface modification tools using backend Build123d surface operations.
- **SurfaceRenderer** (`apps/web/src/components/SurfaceRenderer.tsx`): Renders NURBS surface with configurable display mode (shaded, wireframe, control polygon overlay, curvature combs).
- **Backend**: `apps/api/services/surfaces.py` implements NURBS surface creation, boundary surface fill, trim, and extend using OpenCASCADE `Geom_BSplineSurface`.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/NURBSSurfaceTool.ts` | NURBS surface control point placement |
| `apps/web/src/tools/SurfaceControlPointEditor.ts` | Control point drag editing |
| `apps/web/src/tools/BoundarySurfaceTool.ts` | Boundary surface creation |
| `apps/web/src/tools/SurfaceTrimTool.ts` | Surface trimming |
| `apps/web/src/tools/SurfaceExtendTool.ts` | Surface extension |
| `apps/web/src/components/SurfaceRenderer.tsx` | Multi-mode surface rendering |
| `apps/web/src/utils/nurbs.ts` | NURBS evaluation and knot vector utilities |
| `apps/api/services/surfaces.py` | OpenCASCADE surface operations |
| `apps/api/routers/surfaces.py` | Surface endpoints |
| `packages/cad-types/src/surfaces.ts` | NURBSSurface, BoundarySurface types |

**Modified files:** `featureStore.ts` (surface feature types), `Toolbar.tsx` (surface tools section).

**Implementation order:** NURBS utilities -> SurfaceRenderer -> NURBSSurfaceTool -> SurfaceControlPointEditor -> backend surfaces service -> BoundarySurfaceTool -> SurfaceTrimTool -> SurfaceExtendTool.

#### 4. Testing

- **Unit (Vitest):** NURBS evaluation at known parameter values; knot vector validation.
- **Unit (pytest):** Boundary surface from 4 edges produces a valid face; trim surface removes the correct half.
- **E2E (Playwright):** Place control points in grid -> NURBS surface renders; drag a control point -> surface deforms.
- **Visual regression:** NURBS surface shading; control polygon wireframe overlay; curvature comb display.

#### 5. Acceptance Criteria

- [ ] NURBS surface creates from a grid of gesture-placed control points.
- [ ] Dragging a control point updates the surface shape in real time.
- [ ] Boundary surface fills the region enclosed by 3 or 4 selected edge curves.
- [ ] Trim removes the specified portion of a surface at a cutting curve.
- [ ] Extend grows a surface smoothly from a selected edge.
- [ ] Display mode toggle cycles through shaded, wireframe, control polygon, curvature combs.

#### 6. Dependencies

- **Prior sprints:** Sprint 4 (spline curves), Sprint 8 (edge selection).
- **External libraries:** Three.js `NURBSSurface` (from examples), `build123d@0.8.x`.

---

## Sprint 15

### Advanced Surfacing

Thicken, Offset surface, Curvature analysis, Surface quality tools.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F15.1 | Thicken surface: convert a surface body to a solid by offsetting in the normal direction | Must |
| F15.2 | Offset surface: create a new surface offset at a specified distance from the original | Must |
| F15.3 | Curvature analysis: Gaussian and Mean curvature visualization with color map | Must |
| F15.4 | Zebra stripe analysis: parallel stripe pattern for continuity checking (G0/G1/G2) | Should |
| F15.5 | Draft analysis: color-coded face angle relative to a pull direction | Should |
| F15.6 | Minimum radius display: highlight regions below a specified minimum radius | Could |
| F15.7 | Curvature comb display on surface edges for boundary continuity verification | Should |

**Non-functional Requirements**

- Curvature analysis computation and visualization for surfaces up to 10K triangles renders at 30+ FPS.
- Zebra stripes use GPU shader for real-time interaction during rotation.
- Thicken/offset operations complete within 2 seconds.

#### 2. Architecture

- **ThickenTool** / **OffsetSurfaceTool**: Select surface, drag to set distance, backend performs OpenCASCADE `BRepOffsetAPI_MakeThickSolid` / `BRepOffset_MakeOffset`.
- **CurvatureAnalyzer** (`apps/web/src/analysis/CurvatureAnalyzer.ts`): Computes per-vertex Gaussian/Mean curvature from mesh. Applies color map via vertex colors.
- **ZebraShader** (`apps/web/src/shaders/zebra.glsl`): Custom GLSL shader projecting parallel stripe pattern onto surfaces. Stripe distortion reveals surface continuity breaks.
- **DraftAnalyzer** (`apps/web/src/analysis/DraftAnalyzer.ts`): Per-face angle to pull direction. Colors faces: green (sufficient draft), yellow (marginal), red (undercut).
- **AnalysisOverlay** (`apps/web/src/components/AnalysisOverlay.tsx`): Switches between analysis modes with legend bar.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/ThickenTool.ts` | Surface thicken to solid |
| `apps/web/src/tools/OffsetSurfaceTool.ts` | Surface offset |
| `apps/web/src/analysis/CurvatureAnalyzer.ts` | Gaussian/Mean curvature computation |
| `apps/web/src/analysis/DraftAnalyzer.ts` | Draft angle analysis |
| `apps/web/src/shaders/zebra.vert` | Zebra stripe vertex shader |
| `apps/web/src/shaders/zebra.frag` | Zebra stripe fragment shader |
| `apps/web/src/components/AnalysisOverlay.tsx` | Analysis mode selector and legend |
| `apps/api/services/surface_ops.py` | Thicken, offset surface operations |

**Modified files:** `SurfaceRenderer.tsx` (analysis display modes), `MeshRenderer.tsx` (vertex color support).

**Implementation order:** CurvatureAnalyzer -> AnalysisOverlay -> ZebraShader -> DraftAnalyzer -> ThickenTool -> OffsetSurfaceTool -> backend surface_ops.

#### 4. Testing

- **Unit (Vitest):** Curvature of a known sphere (constant Gaussian curvature = 1/r^2); draft angle of a vertical face relative to Z-axis = 0 degrees.
- **Unit (pytest):** Thicken a planar surface by 5mm -> box solid with correct dimensions; offset surface maintains expected area change.
- **E2E (Playwright):** Activate curvature analysis -> verify color map renders; thicken a surface -> verify solid body created.
- **Visual regression:** Curvature color map on a freeform surface; zebra stripes on a car-like surface.

#### 5. Acceptance Criteria

- [ ] Thicken converts a surface to a solid with the specified wall thickness.
- [ ] Offset surface creates a new surface at the specified distance.
- [ ] Curvature analysis renders Gaussian/Mean curvature as a heat map.
- [ ] Zebra stripes display correctly and rotate with the view.
- [ ] Draft analysis colors faces by angle to the pull direction.
- [ ] Analysis legend shows the color scale with numeric values.

#### 6. Dependencies

- **Prior sprints:** Sprint 14 (surfaces), Sprint 8 (face selection).
- **External libraries:** Three.js `ShaderMaterial`, `build123d@0.8.x`.

---

## Sprint 16

### Drawing/Documentation

2D drawing views, Dimensions, Annotations, BOM generation.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F16.1 | Create 2D drawing document from a 3D model | Must |
| F16.2 | Standard views: Front, Top, Right, Isometric projection onto drawing sheet | Must |
| F16.3 | Section view on drawing: specify cut plane, generate cross-section view | Should |
| F16.4 | Detail view: magnified circular callout of a region | Should |
| F16.5 | Automatic hidden line removal in projected views | Must |
| F16.6 | Add linear, angular, radial, and diameter dimensions to drawing views | Must |
| F16.7 | Add annotations: notes, GD&T symbols, surface finish symbols | Should |
| F16.8 | Title block with configurable fields (part name, material, date, revision) | Must |
| F16.9 | BOM generation from assembly: part list with quantities | Should |
| F16.10 | Print/export drawing as PDF | Must |

**Non-functional Requirements**

- Hidden line removal for models up to 50K triangles completes within 5 seconds.
- Drawing sheet renders at full resolution for A4/A3 paper sizes.
- PDF export produces vector output (not rasterized).

#### 2. Architecture

- **DrawingStore** (`apps/web/src/stores/drawingStore.ts`): Sheet size, views (position, scale, type), dimensions, annotations. Each view references a 3D model and a projection direction.
- **ProjectionEngine** (`apps/api/services/projection.py`): Takes B-rep shape + view direction, produces 2D projected edges using `HLRBRep_Algo` (hidden line removal). Returns visible and hidden edge sets as 2D polylines.
- **DrawingCanvas** (`apps/web/src/components/DrawingCanvas.tsx`): 2D SVG/Canvas renderer for the drawing sheet. Renders projected edge data, dimensions, and annotations.
- **DimensionTool** (`apps/web/src/drawing/DimensionTool.ts`): Click two points/edges to add a dimension. Auto-calculates value from 3D model.
- **AnnotationTool** (`apps/web/src/drawing/AnnotationTool.ts`): Place text, GD&T frames, leader lines.
- **BOMGenerator** (`apps/api/services/bom.py`): Traverses assembly structure, counts unique parts, generates BOM table data.
- **PDFExporter** (`apps/web/src/services/PDFExporter.ts`): Converts SVG drawing to PDF using a library like `jsPDF` + `svg2pdf.js`.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/stores/drawingStore.ts` | Drawing document state |
| `apps/web/src/components/DrawingCanvas.tsx` | 2D drawing sheet renderer |
| `apps/web/src/drawing/DimensionTool.ts` | Dimension placement tool |
| `apps/web/src/drawing/AnnotationTool.ts` | Annotation placement tool |
| `apps/web/src/drawing/TitleBlock.tsx` | Title block component |
| `apps/web/src/drawing/ViewProjection.ts` | View layout and projection mapping |
| `apps/web/src/services/PDFExporter.ts` | Drawing to PDF conversion |
| `apps/api/services/projection.py` | HLR-based 2D projection |
| `apps/api/services/bom.py` | BOM generation from assembly |
| `apps/api/routers/drawing.py` | Drawing/projection endpoints |
| `packages/cad-types/src/drawing.ts` | DrawingView, Dimension, Annotation types |

**Modified files:** `FileMenuBar.tsx` (New Drawing option), `Viewport.tsx` (switch to drawing mode).

**Implementation order:** Drawing types -> drawingStore -> backend projection service -> DrawingCanvas -> ViewProjection -> DimensionTool -> AnnotationTool -> TitleBlock -> BOMGenerator -> PDFExporter.

#### 4. Testing

- **Unit (pytest):** Projection of a cube from front -> 1 visible square face; hidden line removal produces correct visible/hidden edge sets.
- **Unit (Vitest):** Dimension value calculation from two 3D points; PDF generation produces non-empty buffer.
- **E2E (Playwright):** Create drawing from a box model -> verify 3 standard views render; add dimension -> verify value matches model.
- **Visual regression:** Drawing sheet layout; dimension text positioning; title block.

#### 5. Acceptance Criteria

- [ ] Drawing document creates with configurable sheet size (A4, A3, Letter).
- [ ] Front, Top, Right views project correctly with hidden lines dashed.
- [ ] Section view shows cross-hatched interior at the specified cut plane.
- [ ] Dimensions display accurate values derived from the 3D model.
- [ ] Annotations (notes, GD&T symbols) can be placed with leader lines.
- [ ] Title block renders with editable fields.
- [ ] BOM table generates from an assembly with part names and quantities.
- [ ] PDF export produces a vector-quality printable file.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D model), Sprint 11 (assembly for BOM), Sprint 5 (dimensions).
- **External libraries:** `jspdf@2.x`, `svg2pdf.js@2.x`, OpenCASCADE HLR algorithms (via Build123d).

---

## Sprint 17

### FEA -- Stress Analysis

Mesh generation, Linear static stress, Results visualization.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F17.1 | Generate tetrahedral FE mesh from B-rep solid with configurable element size | Must |
| F17.2 | Material assignment: Young's modulus, Poisson's ratio, density from material library | Must |
| F17.3 | Boundary conditions: fixed support (select face), applied force (select face + vector) | Must |
| F17.4 | Linear static stress analysis solver | Must |
| F17.5 | Results visualization: Von Mises stress as color map on the deformed shape | Must |
| F17.6 | Displacement visualization with scale factor | Should |
| F17.7 | Results probe: hover over a point to see stress/displacement values | Should |
| F17.8 | Safety factor display: stress vs. yield strength ratio | Could |

**Non-functional Requirements**

- Mesh generation for models up to 20K elements completes within 10 seconds.
- FEA solve for 20K elements completes within 30 seconds on backend.
- Results visualization renders at 60 FPS with per-vertex coloring.

#### 2. Architecture

- **FEA module** lives primarily on the backend due to computational requirements.
- **MeshGenerator** (`apps/api/services/fea/mesher.py`): Uses `gmsh` Python API to generate tetrahedral mesh from B-rep. Exports mesh as nodes + elements arrays.
- **FEASolver** (`apps/api/services/fea/solver.py`): Assembles global stiffness matrix, applies boundary conditions, solves `Ku = F` using `scipy.sparse.linalg.spsolve`. Returns nodal displacements.
- **StressCalculator** (`apps/api/services/fea/stress.py`): Computes element stresses from displacements. Extrapolates to nodes. Returns Von Mises stress per node.
- **MaterialLibrary** (`apps/api/data/materials.json`): JSON database of common engineering materials (Steel, Aluminum, Titanium, ABS, Nylon) with mechanical properties.
- **FEAStore** (`apps/web/src/stores/feaStore.ts`): Holds mesh, BCs, material, results state. Manages analysis workflow (setup -> mesh -> solve -> results).
- **FEAResultsRenderer** (`apps/web/src/components/FEAResultsRenderer.tsx`): Renders deformed mesh with vertex colors mapped to stress values. Color map legend.
- **BCTool** (`apps/web/src/tools/BCTool.ts`): Gesture-driven boundary condition application (select face, choose type).

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/fea/mesher.py` | Gmsh-based tetrahedral mesh generation |
| `apps/api/services/fea/solver.py` | Linear static FEA solver |
| `apps/api/services/fea/stress.py` | Stress computation from displacements |
| `apps/api/services/fea/materials.py` | Material property lookup |
| `apps/api/data/materials.json` | Engineering materials database |
| `apps/api/routers/fea.py` | FEA workflow endpoints |
| `apps/web/src/stores/feaStore.ts` | FEA workflow state |
| `apps/web/src/components/FEAResultsRenderer.tsx` | Stress/displacement color map renderer |
| `apps/web/src/components/FEASetupPanel.tsx` | Material, BC, mesh settings panel |
| `apps/web/src/tools/BCTool.ts` | Boundary condition application tool |
| `packages/cad-types/src/fea.ts` | FEA types (Mesh, BC, Material, Results) |

**Modified files:** `Viewport.tsx` (FEA visualization mode), `Toolbar.tsx` (FEA tools section).

**Implementation order:** materials database -> FEA types -> mesher -> solver -> stress calculator -> FEA router -> feaStore -> FEASetupPanel -> BCTool -> FEAResultsRenderer.

#### 4. Testing

- **Unit (pytest):** Mesh generation from a cube produces valid tetrahedra; solver on a cantilever beam matches analytical deflection within 5%; Von Mises stress at known locations matches hand calculation.
- **Unit (Vitest):** FEAStore workflow state transitions; color map interpolation.
- **E2E (Playwright):** Set up a simple beam analysis -> run -> verify color map appears on the model.
- **Visual regression:** Stress color map on a bracket; deformed shape with displacement scale.

#### 5. Acceptance Criteria

- [ ] Tetrahedral mesh generates from any valid B-rep solid.
- [ ] Material can be assigned from the library (Steel, Aluminum, etc.).
- [ ] Fixed support applies to a selected face (shown as green triangles).
- [ ] Force applies to a selected face with a direction arrow visualization.
- [ ] Solver runs and returns results within 30 seconds for typical parts.
- [ ] Von Mises stress color map renders on the deformed shape.
- [ ] Hovering over the model shows local stress/displacement values.
- [ ] Color map legend shows stress scale with min/max values.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D solids), Sprint 8 (face selection).
- **External libraries:** `gmsh@4.x` (Python), `scipy@1.x`, `numpy@1.x`.

---

## Sprint 18

### FEA -- Thermal + Modal

Thermal analysis, Modal analysis, Frequency response.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F18.1 | Thermal analysis: temperature distribution from heat loads and convection BCs | Must |
| F18.2 | Thermal BCs: fixed temperature, heat flux, convection (film coefficient + ambient) | Must |
| F18.3 | Temperature gradient visualization as color map | Must |
| F18.4 | Modal analysis: compute natural frequencies and mode shapes | Must |
| F18.5 | Mode shape animation: animated deformation at each natural frequency | Must |
| F18.6 | Mode selection panel: list frequencies, click to visualize | Must |
| F18.7 | Frequency response (harmonic): displacement amplitude vs. frequency plot | Should |
| F18.8 | Thermo-mechanical coupling: use thermal results as loads for stress analysis | Could |

**Non-functional Requirements**

- Thermal solve for 20K elements completes within 20 seconds.
- Modal solve (first 10 modes) completes within 60 seconds.
- Mode shape animation runs at 60 FPS.

#### 2. Architecture

- **ThermalSolver** (`apps/api/services/fea/thermal.py`): Assembles thermal conductivity matrix, applies thermal BCs (Dirichlet for temperature, Neumann for flux, Robin for convection), solves `KT = Q`.
- **ModalSolver** (`apps/api/services/fea/modal.py`): Assembles mass matrix alongside stiffness. Solves generalized eigenvalue problem `Kv = lambda*Mv` using `scipy.sparse.linalg.eigsh` for first N modes.
- **FrequencyResponseSolver** (`apps/api/services/fea/harmonic.py`): Sweeps frequency range, computes `[K - omega^2 * M]^{-1} * F` at each frequency.
- **ModalAnimator** (`apps/web/src/components/ModalAnimator.tsx`): Animates mesh vertex positions sinusoidally based on mode shape eigenvector. Frequency-controlled speed.
- **ThermalResultsRenderer** (`apps/web/src/components/ThermalResultsRenderer.tsx`): Temperature color map (blue=cold to red=hot).
- **FrequencyChart** (`apps/web/src/components/FrequencyChart.tsx`): Line chart of displacement amplitude vs. frequency using a lightweight charting library.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/fea/thermal.py` | Thermal conductivity solver |
| `apps/api/services/fea/modal.py` | Eigenvalue modal solver |
| `apps/api/services/fea/harmonic.py` | Frequency response solver |
| `apps/web/src/components/ModalAnimator.tsx` | Mode shape animation |
| `apps/web/src/components/ThermalResultsRenderer.tsx` | Temperature color map |
| `apps/web/src/components/FrequencyChart.tsx` | Frequency response plot |
| `apps/web/src/components/ModeSelectionPanel.tsx` | Natural frequency list with mode selector |

**Modified files:** `feaStore.ts` (thermal and modal analysis types), `FEASetupPanel.tsx` (thermal BCs, modal settings), `fea.py` router (new endpoints).

**Implementation order:** ThermalSolver -> thermal BCs in FEASetupPanel -> ThermalResultsRenderer -> ModalSolver -> ModeSelectionPanel -> ModalAnimator -> FrequencyResponseSolver -> FrequencyChart.

#### 4. Testing

- **Unit (pytest):** Thermal: 1D bar with fixed temperatures at ends -> linear temperature distribution; Modal: cantilever beam first natural frequency matches `f_n = (1.875)^2 / (2*pi*L^2) * sqrt(EI/rho*A)` within 10%.
- **E2E (Playwright):** Run thermal analysis -> verify temperature color map; run modal analysis -> verify mode list and animation.
- **Visual regression:** Temperature distribution on a heat sink; first mode shape of a beam.

#### 5. Acceptance Criteria

- [ ] Thermal BCs (fixed temperature, heat flux, convection) can be applied to faces.
- [ ] Thermal solver produces temperature distribution visualized as a color map.
- [ ] Modal solver computes first 10 natural frequencies.
- [ ] Mode selection panel lists frequencies; clicking a mode shows the animated shape.
- [ ] Mode shape animation oscillates the mesh at the correct frequency.
- [ ] Frequency response plot shows resonance peaks at natural frequencies.

#### 6. Dependencies

- **Prior sprints:** Sprint 17 (FEA foundation, mesher, material library).
- **External libraries:** `scipy@1.x` (eigenvalue solver), chart library (e.g., `recharts@2.x` or `lightweight-charts`).

---

## Sprint 19

### Topology Optimization

Generative design, Load cases, Manufacturing constraints.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F19.1 | Define design space: select a solid body as the optimization domain | Must |
| F19.2 | Define keep-out regions: select faces/volumes that must remain solid | Must |
| F19.3 | Define load cases: reuse FEA boundary conditions (forces, fixed supports) | Must |
| F19.4 | Objective: minimize compliance (maximize stiffness) for a target volume fraction | Must |
| F19.5 | SIMP (Solid Isotropic Material with Penalization) topology optimization solver | Must |
| F19.6 | Intermediate density visualization: per-element density as opacity/color | Must |
| F19.7 | Manufacturing constraints: minimum member size, symmetry plane, draw direction | Should |
| F19.8 | Export optimized shape as STL mesh | Should |

**Non-functional Requirements**

- Topology optimization with 50K elements converges within 5 minutes (100 iterations).
- Intermediate results update in the viewport every 10 iterations.
- Target volume fraction configurable from 10% to 90%.

#### 2. Architecture

- **TopOptSolver** (`apps/api/services/topopt/solver.py`): SIMP method implementation. Iteratively updates element densities using optimality criteria. Uses FEA solver from Sprint 17 as inner loop.
- **SensitivityFilter** (`apps/api/services/topopt/filter.py`): Mesh-independent sensitivity filter with configurable radius to enforce minimum member size.
- **SymmetryConstraint** (`apps/api/services/topopt/constraints.py`): Mirrors density updates across a symmetry plane. Draw direction constraint penalizes enclosed voids.
- **TopOptStore** (`apps/web/src/stores/topOptStore.ts`): Configuration (volume fraction, filter radius, constraints), iteration status, current density field.
- **DensityRenderer** (`apps/web/src/components/DensityRenderer.tsx`): Renders each element with opacity proportional to its density. Low-density elements can be hidden below a threshold.
- **TopOptSetupPanel** (`apps/web/src/components/TopOptSetupPanel.tsx`): Configuration panel for design space, keep-outs, load cases, constraints.
- WebSocket streaming for live iteration updates.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/topopt/solver.py` | SIMP topology optimization |
| `apps/api/services/topopt/filter.py` | Sensitivity filter for minimum member size |
| `apps/api/services/topopt/constraints.py` | Manufacturing constraints (symmetry, draw direction) |
| `apps/api/routers/topopt.py` | Topology optimization endpoints |
| `apps/web/src/stores/topOptStore.ts` | Optimization configuration and results |
| `apps/web/src/components/DensityRenderer.tsx` | Element density visualization |
| `apps/web/src/components/TopOptSetupPanel.tsx` | Optimization setup panel |
| `packages/cad-types/src/topopt.ts` | TopOpt configuration and result types |

**Modified files:** `feaStore.ts` (reuse BCs for load cases), `Viewport.tsx` (density visualization mode).

**Implementation order:** TopOpt types -> TopOptSetupPanel -> backend SIMP solver -> sensitivity filter -> manufacturing constraints -> DensityRenderer -> WebSocket live updates -> STL export of optimized shape.

#### 4. Testing

- **Unit (pytest):** Classic MBB beam: optimized topology matches known reference pattern; volume fraction converges to target within 2%.
- **E2E (Playwright):** Set up a cantilever optimization -> run -> verify density field updates; export result as STL.
- **Visual regression:** Optimized topology of a bracket; density threshold slider effect.

#### 5. Acceptance Criteria

- [ ] Design space and keep-out regions can be defined by selecting solid bodies/faces.
- [ ] Load cases reuse existing FEA boundary conditions.
- [ ] SIMP solver converges and live-updates the density field in the viewport.
- [ ] Final result clearly shows optimized material distribution.
- [ ] Minimum member size constraint produces designs without thin features below the threshold.
- [ ] Symmetry constraint produces symmetric optimized designs.
- [ ] Optimized shape can be exported as an STL mesh.

#### 6. Dependencies

- **Prior sprints:** Sprint 17 (FEA solver, mesher, BCs), Sprint 6 (STL export).
- **External libraries:** `scipy@1.x`, `numpy@1.x`.

---

## Sprint 20

### PBR Rendering

Materials library, Environment maps, Real-time PBR preview.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F20.1 | PBR material system: base color, metalness, roughness, normal map | Must |
| F20.2 | Materials library panel: predefined materials (brushed steel, polished chrome, matte plastic, wood, rubber) | Must |
| F20.3 | Drag material from library onto a body/face to apply | Must |
| F20.4 | Environment map (HDRI) for reflections and ambient lighting | Must |
| F20.5 | HDRI selector: choose from bundled environments (studio, outdoor, workshop) | Should |
| F20.6 | Custom material editor: adjust PBR parameters with live preview | Should |
| F20.7 | Decal placement: project an image texture onto a face | Could |
| F20.8 | Screenshot capture: export viewport as high-resolution PNG | Must |

**Non-functional Requirements**

- PBR rendering at 60 FPS for models up to 100K triangles.
- HDRI loading < 2 seconds for 2K resolution maps.
- Material library loads lazily (thumbnails first, full textures on apply).

#### 2. Architecture

- **MaterialLibrary** (`apps/web/src/rendering/MaterialLibrary.ts`): Catalog of `PBRMaterialDef` objects with texture URLs. Materials organized by category (metals, plastics, wood, etc.).
- **MaterialStore** (`apps/web/src/stores/materialStore.ts`): Per-body and per-face material assignments. Tracks active HDRI.
- **PBRMaterialFactory** (`apps/web/src/rendering/PBRMaterialFactory.ts`): Creates `THREE.MeshStandardMaterial` instances from `PBRMaterialDef`. Manages texture loading and caching.
- **EnvironmentManager** (`apps/web/src/rendering/EnvironmentManager.ts`): Loads HDRI as `THREE.EquirectangularReflectionMapping`, applies to scene environment and background.
- **MaterialPanel** (`apps/web/src/components/MaterialPanel.tsx`): Grid of material thumbnails with search. Drag source for material application.
- **MaterialEditor** (`apps/web/src/components/MaterialEditor.tsx`): Sliders for metalness, roughness, color picker, texture upload.
- **ScreenshotService** (`apps/web/src/services/ScreenshotService.ts`): Captures WebGL canvas at custom resolution, exports as PNG blob.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/rendering/MaterialLibrary.ts` | PBR material catalog |
| `apps/web/src/rendering/PBRMaterialFactory.ts` | Material instance creation and caching |
| `apps/web/src/rendering/EnvironmentManager.ts` | HDRI environment map management |
| `apps/web/src/stores/materialStore.ts` | Material assignment state |
| `apps/web/src/components/MaterialPanel.tsx` | Material library browser |
| `apps/web/src/components/MaterialEditor.tsx` | Custom material parameter editor |
| `apps/web/src/services/ScreenshotService.ts` | High-res screenshot capture |
| `apps/web/public/hdri/studio.hdr` | Studio lighting HDRI |
| `apps/web/public/hdri/outdoor.hdr` | Outdoor lighting HDRI |
| `apps/web/public/materials/` | Material texture files directory |

**Modified files:** `MeshRenderer.tsx` (apply PBR materials from materialStore), `Viewport.tsx` (environment map, screenshot button), `bodyStore.ts` (material reference per body/face).

**Implementation order:** MaterialLibrary -> PBRMaterialFactory -> EnvironmentManager -> materialStore -> MaterialPanel -> MeshRenderer integration -> MaterialEditor -> ScreenshotService.

#### 4. Testing

- **Unit (Vitest):** PBRMaterialFactory creates material with correct parameters; texture cache avoids duplicate loads.
- **E2E (Playwright):** Apply "Brushed Steel" to a body -> verify material appears metallic; change HDRI -> verify reflections update; capture screenshot -> verify PNG downloads.
- **Visual regression:** Brushed steel sphere; matte plastic box; chrome cylinder with studio HDRI.

#### 5. Acceptance Criteria

- [ ] Material panel shows categorized material thumbnails.
- [ ] Dragging a material onto a body applies the PBR material instantly.
- [ ] Metallic materials show realistic reflections from the HDRI environment.
- [ ] HDRI selector changes the lighting environment in real time.
- [ ] Custom material editor adjusts metalness/roughness/color with live preview.
- [ ] Screenshot export produces a high-resolution PNG of the current viewport.
- [ ] Materials persist across save/load cycles.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (mesh rendering), Sprint 8 (face selection for per-face materials).
- **External libraries:** Three.js `MeshStandardMaterial`, `RGBELoader` (HDRI), `@react-three/drei` (Environment component).

---

## Sprint 21

### Animation

Exploded views, Motion studies, Keyframe animation.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F21.1 | Timeline panel: horizontal timeline with scrubber, play/pause, frame rate control | Must |
| F21.2 | Keyframe animation: set component position/rotation at keyframes, interpolate between | Must |
| F21.3 | Motion study: animate assembly components along mate degrees of freedom | Must |
| F21.4 | Exploded view animation: animate from assembled to exploded state and back | Must |
| F21.5 | Camera animation: keyframe camera position/target for fly-through | Should |
| F21.6 | Easing functions: linear, ease-in, ease-out, ease-in-out for keyframe interpolation | Should |
| F21.7 | Video export: render animation frames to MP4 via server-side encoding | Could |
| F21.8 | Onion skinning: show ghost frames for animation preview | Could |

**Non-functional Requirements**

- Animation playback at configurable 24/30/60 FPS.
- Timeline supports up to 1000 keyframes.
- Video export at 1080p in reasonable time (1 minute of animation < 5 minutes to encode).

#### 2. Architecture

- **AnimationStore** (`apps/web/src/stores/animationStore.ts`): Timeline data model: tracks, keyframes, current time, playback state. Each track targets a component or camera property.
- **KeyframeInterpolator** (`apps/web/src/animation/KeyframeInterpolator.ts`): Interpolates between keyframes using selected easing. Quaternion slerp for rotations, linear/bezier for positions.
- **TimelinePanel** (`apps/web/src/components/TimelinePanel.tsx`): Horizontal track view with keyframe diamonds, scrubber, playback controls.
- **MotionStudyEngine** (`apps/web/src/animation/MotionStudyEngine.ts`): Computes valid motion paths from mate constraints (e.g., a hinge mate allows rotation around the axis).
- **VideoExporter** (`apps/api/services/video.py`): Receives frame sequence from frontend via WebSocket, encodes to MP4 using FFmpeg.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/stores/animationStore.ts` | Animation timeline and keyframe state |
| `apps/web/src/animation/KeyframeInterpolator.ts` | Easing and interpolation |
| `apps/web/src/animation/MotionStudyEngine.ts` | Mate-constrained motion paths |
| `apps/web/src/components/TimelinePanel.tsx` | Animation timeline UI |
| `apps/web/src/components/PlaybackControls.tsx` | Play/pause/speed controls |
| `apps/api/services/video.py` | FFmpeg-based video encoding |
| `apps/api/routers/animation.py` | Animation/video endpoints |
| `packages/cad-types/src/animation.ts` | Track, Keyframe, Easing types |

**Modified files:** `AssemblyRenderer.tsx` (apply animated transforms), `Viewport.tsx` (camera animation support), `assemblyStore.ts` (animation state integration).

**Implementation order:** Animation types -> animationStore -> KeyframeInterpolator -> TimelinePanel -> PlaybackControls -> MotionStudyEngine -> camera animation -> VideoExporter.

#### 4. Testing

- **Unit (Vitest):** KeyframeInterpolator: linear interpolation at t=0.5 returns midpoint; quaternion slerp produces valid rotation; easing functions match expected curves.
- **E2E (Playwright):** Add two keyframes for a component -> play -> verify component moves; scrub timeline -> verify correct intermediate position.
- **Visual regression:** Timeline panel layout; keyframe diamond positioning; onion skin ghost rendering.

#### 5. Acceptance Criteria

- [ ] Timeline panel displays with horizontal tracks and time ruler.
- [ ] Keyframes can be added at any time position by setting component transforms.
- [ ] Playing the animation interpolates smoothly between keyframes.
- [ ] Motion study respects mate constraints (hinge rotates, slider translates).
- [ ] Exploded view animates assembly disassembly/reassembly.
- [ ] Camera keyframes create smooth fly-through animations.
- [ ] Easing function selector changes interpolation behavior visibly.
- [ ] Video export (when available) produces a valid MP4 file.

#### 6. Dependencies

- **Prior sprints:** Sprint 11/12 (assembly, mates), Sprint 20 (PBR for visual quality).
- **External libraries:** Three.js animation system, `ffmpeg` (server-side, optional).

---

## Sprint 22

### Collaboration Foundation

WebSocket real-time sync, Cursor sharing, Operational transforms.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F22.1 | WebSocket server for real-time document synchronization | Must |
| F22.2 | Operational Transform (OT) engine for concurrent edit conflict resolution | Must |
| F22.3 | Cursor sharing: see other users' gesture cursors in the viewport with name labels | Must |
| F22.4 | Presence indicators: user avatars in a toolbar showing who is connected | Must |
| F22.5 | Real-time sketch entity sync: entity creation/modification replicated to all clients | Must |
| F22.6 | Real-time feature sync: 3D operations replicated to all clients | Must |
| F22.7 | Conflict resolution: simultaneous edits to the same entity merge deterministically | Must |
| F22.8 | Connection resilience: reconnect automatically on network interruption | Should |
| F22.9 | Room-based collaboration: share a link to join a session | Must |

**Non-functional Requirements**

- Edit propagation latency < 100 ms on the same network.
- Supports up to 10 concurrent users per document.
- OT convergence guaranteed (all clients reach the same state).

#### 2. Architecture

- **CollabServer** (`apps/api/services/collab/server.py`): WebSocket server managing rooms, client connections, and OT message routing. Uses FastAPI WebSocket endpoints.
- **OTEngine** (`apps/api/services/collab/ot.py`): Operational Transform implementation for CAD operations. Transforms: `InsertEntity`, `DeleteEntity`, `MoveEntity`, `AddFeature`, `EditFeature`. Server maintains canonical operation history.
- **CollabClient** (`apps/web/src/collab/CollabClient.ts`): WebSocket client that sends local operations, receives remote operations, applies transforms. Maintains local operation buffer for optimistic updates.
- **CursorSync** (`apps/web/src/collab/CursorSync.ts`): Broadcasts local cursor position (hand landmark position projected to 3D) at 15 FPS. Receives others' cursors.
- **RemoteCursorRenderer** (`apps/web/src/components/RemoteCursorRenderer.tsx`): Renders other users' cursors as colored pointer meshes with floating name labels.
- **PresenceBar** (`apps/web/src/components/PresenceBar.tsx`): Horizontal bar showing connected user avatars with online/away status.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/collab/server.py` | WebSocket room management |
| `apps/api/services/collab/ot.py` | Operational Transform engine |
| `apps/api/services/collab/operations.py` | OT operation type definitions |
| `apps/web/src/collab/CollabClient.ts` | Client-side OT and WebSocket |
| `apps/web/src/collab/CursorSync.ts` | Cursor position broadcasting |
| `apps/web/src/collab/OperationBuffer.ts` | Local optimistic operation buffer |
| `apps/web/src/components/RemoteCursorRenderer.tsx` | Other users' cursor rendering |
| `apps/web/src/components/PresenceBar.tsx` | Connected users display |
| `apps/web/src/components/ShareDialog.tsx` | Room creation and link sharing |
| `packages/cad-types/src/collab.ts` | Operation, Cursor, Presence types |

**Modified files:** `sketchStore.ts` (apply remote operations), `featureStore.ts` (apply remote feature operations), `Viewport.tsx` (remote cursor layer).

**Implementation order:** OT operation types -> OT engine (server) -> CollabServer -> CollabClient -> OperationBuffer -> sketchStore integration -> featureStore integration -> CursorSync -> RemoteCursorRenderer -> PresenceBar -> ShareDialog.

#### 4. Testing

- **Unit (pytest):** OT transform pairs: `Insert(A) x Insert(B)` at same index; `Delete(A) x Insert(B)` index adjustment; convergence test with random operation sequences.
- **Unit (Vitest):** CollabClient reconnection logic; OperationBuffer flush on acknowledgment.
- **E2E (Playwright):** Open two browser tabs with same room -> draw entity in tab 1 -> verify it appears in tab 2; verify cursor appears in both.
- **Integration:** 5-client stress test with rapid concurrent edits -> all clients converge to same state.

#### 5. Acceptance Criteria

- [ ] Share dialog generates a room link that others can use to join.
- [ ] Presence bar shows all connected users with avatars.
- [ ] Drawing a sketch entity in one client appears in all other clients within 200 ms.
- [ ] Other users' cursors are visible as colored pointers with name labels.
- [ ] Simultaneous edits to the same entity resolve deterministically.
- [ ] Network disconnection triggers auto-reconnect with state sync.
- [ ] Feature operations (extrude, fillet) propagate to all clients.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (sketch store), Sprint 3 (feature store).
- **External libraries:** FastAPI WebSocket support (built-in), `websocket-client` (for testing).

---

## Sprint 23

### Version Control

Branching, Merge, History, PDM basics.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F23.1 | Document version history: every save creates a version with timestamp and author | Must |
| F23.2 | Version browser: list versions with thumbnails, restore any previous version | Must |
| F23.3 | Branch: create a named branch from any version for parallel exploration | Must |
| F23.4 | Merge: merge a branch back to main with visual diff of geometry changes | Must |
| F23.5 | Diff viewer: side-by-side 3D comparison of two versions with highlighted differences | Must |
| F23.6 | Conflict resolution: manual selection when merge encounters conflicting feature edits | Should |
| F23.7 | Tagging: mark versions as milestones (v1.0, prototype, final) | Should |
| F23.8 | PDM metadata: part number, revision, lifecycle status (draft, review, released) | Could |

**Non-functional Requirements**

- Version storage is space-efficient (delta-based, not full copies).
- Version list loads within 1 second for documents with up to 500 versions.
- 3D diff computation completes within 5 seconds.

#### 2. Architecture

- **VersionStore** (backend, `apps/api/services/versioning/store.py`): Stores document snapshots as JSON diffs (operational delta from previous version). Uses SQLite or PostgreSQL for metadata, file system for geometry blobs.
- **BranchManager** (`apps/api/services/versioning/branches.py`): Manages branch creation, switching, and merge. Tracks branch heads and common ancestors.
- **MergeEngine** (`apps/api/services/versioning/merge.py`): Three-way merge of feature lists. Detects conflicts (same feature edited in both branches). Generates merge result or conflict markers.
- **DiffEngine** (`apps/api/services/versioning/diff.py`): Compares two document versions. For geometry, computes mesh difference (Boolean XOR) to highlight added/removed material.
- **VersionPanel** (`apps/web/src/components/VersionPanel.tsx`): Version history list with branch graph visualization (like a simplified git log).
- **DiffViewer** (`apps/web/src/components/DiffViewer.tsx`): Side-by-side 3D viewports showing two versions with difference highlighting.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/versioning/store.py` | Version storage with delta compression |
| `apps/api/services/versioning/branches.py` | Branch management |
| `apps/api/services/versioning/merge.py` | Three-way feature merge |
| `apps/api/services/versioning/diff.py` | Geometry diff computation |
| `apps/api/routers/versioning.py` | Version control endpoints |
| `apps/web/src/components/VersionPanel.tsx` | Version history browser |
| `apps/web/src/components/BranchGraph.tsx` | Visual branch graph |
| `apps/web/src/components/DiffViewer.tsx` | Side-by-side 3D diff |
| `apps/web/src/components/MergeDialog.tsx` | Merge conflict resolution UI |
| `packages/cad-types/src/versioning.ts` | Version, Branch, Diff types |

**Modified files:** `FileMenuBar.tsx` (Save Version, Branch, Merge items), `featureStore.ts` (version snapshot serialization).

**Implementation order:** Version types -> version store -> branch manager -> merge engine -> diff engine -> versioning router -> VersionPanel -> BranchGraph -> DiffViewer -> MergeDialog.

#### 4. Testing

- **Unit (pytest):** Version delta compression ratio > 5:1 for typical edits; merge of non-conflicting branches produces correct result; conflict detection on same-feature edits.
- **E2E (Playwright):** Save 3 versions -> browse history -> restore version 1 -> verify model state; create branch -> edit -> merge back.
- **Visual regression:** Branch graph rendering; diff viewer highlight colors.

#### 5. Acceptance Criteria

- [ ] Every save creates a version visible in the version history panel.
- [ ] Any previous version can be restored with one click.
- [ ] Branches can be created from any version.
- [ ] Switching branches updates the model to that branch's state.
- [ ] Merging a branch applies changes from the branch to the target.
- [ ] Conflicting edits are flagged and presented for manual resolution.
- [ ] 3D diff viewer highlights geometry differences between versions.
- [ ] Version tags (milestones) can be applied and filtered.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (feature store serialization), Sprint 22 (collaboration awareness).
- **External libraries:** `sqlite3` (Python built-in) or `asyncpg` for PostgreSQL.

---

## Sprint 24

### Advanced Gestures

Custom gesture training, Gesture macros, Accessibility modes.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F24.1 | Custom gesture recording: user demonstrates a gesture pattern, system learns it | Must |
| F24.2 | Gesture trainer: capture N samples of a custom gesture and train a classifier | Must |
| F24.3 | Map custom gestures to any tool or action | Must |
| F24.4 | Gesture macros: record a sequence of operations, replay by performing a gesture | Must |
| F24.5 | Gesture sensitivity calibration: adjust detection thresholds per user | Should |
| F24.6 | Accessibility: switch control mode (mouse-only, keyboard+mouse, voice commands) | Must |
| F24.7 | Left-hand / right-hand / both-hand preference setting | Should |
| F24.8 | Gesture tutorial overlay: animated hand showing how to perform each gesture | Should |

**Non-functional Requirements**

- Custom gesture recognition accuracy > 90% after 10 training samples.
- Gesture macro replay executes within 2x the original recording time.
- Accessibility mode switch requires zero restart.

#### 2. Architecture

- **GestureTrainer** (`apps/web/src/gesture/GestureTrainer.ts`): Records landmark sequences during training. Uses Dynamic Time Warping (DTW) or a lightweight neural classifier (TensorFlow.js) to match new gestures against templates.
- **GestureTemplateStore** (`apps/web/src/stores/gestureTemplateStore.ts`): Persists custom gesture templates in IndexedDB. Each template: name, landmark samples, associated action.
- **MacroRecorder** (`apps/web/src/gesture/MacroRecorder.ts`): Records CommandStack operations during a macro recording session. Replays them on trigger.
- **AccessibilityManager** (`apps/web/src/accessibility/AccessibilityManager.ts`): Provides alternative input modes. Mouse mode: click-based tool activation. Keyboard mode: hotkey mappings. Voice mode: Web Speech API command recognition.
- **CalibrationWizard** (`apps/web/src/components/CalibrationWizard.tsx`): Step-by-step gesture calibration for the user's hand size, speed, and detection sensitivity.
- **TutorialOverlay** (`apps/web/src/components/TutorialOverlay.tsx`): Animated SVG hand demonstrating gesture patterns with step-by-step instructions.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/gesture/GestureTrainer.ts` | Custom gesture recording and matching |
| `apps/web/src/gesture/DTWMatcher.ts` | Dynamic Time Warping for gesture comparison |
| `apps/web/src/gesture/MacroRecorder.ts` | Operation sequence recording and replay |
| `apps/web/src/stores/gestureTemplateStore.ts` | Persistent custom gesture templates |
| `apps/web/src/accessibility/AccessibilityManager.ts` | Alternative input mode router |
| `apps/web/src/accessibility/VoiceCommands.ts` | Web Speech API voice control |
| `apps/web/src/accessibility/KeyboardBindings.ts` | Keyboard shortcut mappings |
| `apps/web/src/components/CalibrationWizard.tsx` | Gesture sensitivity calibration |
| `apps/web/src/components/TutorialOverlay.tsx` | Animated gesture tutorial |
| `apps/web/src/components/GestureTrainingPanel.tsx` | Custom gesture training UI |
| `apps/web/src/components/MacroPanel.tsx` | Macro recording/management |

**Modified files:** `GestureClassifier.ts` (integrate custom gesture matching), `ToolStateMachine.ts` (custom gesture -> action mapping), `settings` page (accessibility preferences).

**Implementation order:** DTWMatcher -> GestureTrainer -> gestureTemplateStore -> GestureTrainingPanel -> MacroRecorder -> MacroPanel -> AccessibilityManager -> VoiceCommands -> KeyboardBindings -> CalibrationWizard -> TutorialOverlay.

#### 4. Testing

- **Unit (Vitest):** DTW matcher correctly identifies similar gesture patterns; macro replay produces same CommandStack operations as original recording.
- **E2E (Playwright):** Train a custom gesture -> perform it -> verify mapped tool activates; record a macro -> trigger -> verify operations replay.
- **Accessibility (Playwright):** Keyboard-only mode: Tab to tool, Enter to activate; Voice mode: say "line tool" -> verify activation.

#### 5. Acceptance Criteria

- [ ] User can record a new gesture by demonstrating it 10 times.
- [ ] Custom gesture is recognized with > 90% accuracy after training.
- [ ] Custom gesture can be mapped to any existing tool or action.
- [ ] Macro recording captures a sequence of operations.
- [ ] Performing the macro trigger gesture replays all recorded operations.
- [ ] Accessibility mode switch (gesture/mouse/keyboard/voice) works without page reload.
- [ ] Calibration wizard adjusts detection sensitivity to the user's hands.
- [ ] Tutorial overlay demonstrates each built-in gesture with animation.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (gesture engine, classifier), Sprint 5 (command stack for macros).
- **External libraries:** `@mediapipe/hands@0.4.x`, optionally `@tensorflow/tfjs@4.x` (for neural gesture classifier).

---

## Sprint 25

### Performance

three-mesh-bvh, LOD, Web Workers, GPU compute, instanced rendering.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F25.1 | BVH-accelerated raycasting via `three-mesh-bvh` for all selection operations | Must |
| F25.2 | Level of Detail (LOD): automatic mesh simplification at distance thresholds | Must |
| F25.3 | Web Workers for heavy computations: constraint solving, mesh processing, OT transforms | Must |
| F25.4 | Instanced rendering for pattern features and assembly repeated components | Must |
| F25.5 | Geometry batching: merge static meshes to reduce draw calls | Should |
| F25.6 | GPU compute (WebGPU where available): parallelize mesh operations | Could |
| F25.7 | Lazy loading: defer loading of off-screen assembly components | Should |
| F25.8 | Performance monitor: FPS counter, draw call count, memory usage overlay | Must |

**Non-functional Requirements**

- Raycasting on 1M triangle mesh < 1 ms per ray.
- Assembly with 100 components renders at 30+ FPS.
- Web Worker offloading does not introduce > 5 ms overhead for message passing.
- Memory usage < 2 GB for assemblies with 50 unique components.

#### 2. Architecture

- **BVHManager** (`apps/web/src/performance/BVHManager.ts`): Builds and maintains BVH for all mesh geometries. Patches `THREE.Raycaster` to use BVH-accelerated intersection.
- **LODManager** (`apps/web/src/performance/LODManager.ts`): Generates simplified meshes at 3 LOD levels using mesh decimation (quadric error metrics). Swaps based on camera distance using `THREE.LOD`.
- **WorkerPool** (`apps/web/src/workers/WorkerPool.ts`): Pool of Web Workers for parallelizing tasks. Workers for: constraint solving, mesh decimation, OT transforms.
- **ConstraintSolverWorker** (`apps/web/src/workers/constraintSolver.worker.ts`): Runs PlaneGCS in a worker to avoid main-thread blocking.
- **InstanceManager** (`apps/web/src/performance/InstanceManager.ts`): Detects repeated geometries in assemblies and patterns. Converts to `InstancedMesh` with per-instance transforms.
- **BatchManager** (`apps/web/src/performance/BatchManager.ts`): Merges static (non-interactive) meshes using `THREE.BufferGeometryUtils.mergeBufferGeometries`.
- **PerformanceMonitor** (`apps/web/src/components/PerformanceMonitor.tsx`): Overlay showing FPS, draw calls, triangles, memory via `THREE.WebGLInfo` and `performance.memory`.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/performance/BVHManager.ts` | BVH construction and raycaster integration |
| `apps/web/src/performance/LODManager.ts` | Automatic LOD generation and swapping |
| `apps/web/src/performance/InstanceManager.ts` | Instanced rendering for repeated geometry |
| `apps/web/src/performance/BatchManager.ts` | Static mesh batching |
| `apps/web/src/workers/WorkerPool.ts` | Web Worker pool management |
| `apps/web/src/workers/constraintSolver.worker.ts` | Constraint solving in worker |
| `apps/web/src/workers/meshDecimation.worker.ts` | Mesh simplification in worker |
| `apps/web/src/components/PerformanceMonitor.tsx` | Real-time performance overlay |

**Modified files:** `ConstraintSolver.ts` (offload to worker), `MeshRenderer.tsx` (BVH, LOD, instancing integration), `AssemblyRenderer.tsx` (instanced components), `EdgePicker.ts` (BVH raycasting).

**Implementation order:** BVHManager (immediate raycasting improvement) -> WorkerPool + constraintSolver worker -> LODManager -> InstanceManager -> BatchManager -> PerformanceMonitor -> GPU compute (conditional on WebGPU availability).

#### 4. Testing

- **Unit (Vitest):** BVH raycasting returns same results as brute force but faster; LOD switches at correct distances; WorkerPool distributes tasks evenly.
- **Performance benchmarks:** Raycast time on 500K triangles (target < 1 ms); assembly render FPS with 50 components (target > 30 FPS); worker message round-trip time.
- **E2E (Playwright):** Performance monitor shows > 30 FPS for a complex assembly; verify no visual artifacts from LOD switching.
- **Visual regression:** LOD transitions should be imperceptible at intended view distances.

#### 5. Acceptance Criteria

- [ ] Raycasting on large meshes is < 1 ms using BVH acceleration.
- [ ] LOD automatically reduces triangle count for distant objects.
- [ ] Constraint solving runs in a Web Worker without blocking the UI.
- [ ] Instanced rendering is used for pattern features (draw call count reduced).
- [ ] Performance monitor overlay shows FPS, draw calls, and triangle count.
- [ ] Assembly with 50+ components maintains 30+ FPS.
- [ ] No visual quality degradation perceived during normal interaction.

#### 6. Dependencies

- **Prior sprints:** Sprint 8 (edge picking, raycasting), Sprint 9 (patterns), Sprint 11 (assemblies), Sprint 2 (constraint solver).
- **External libraries:** `three-mesh-bvh@0.8.x`, Three.js `LOD`, `BufferGeometryUtils`.

---

## Sprint 26

### DXF/SVG Pipeline

DXF import/export, SVG export, 2D drawing output.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F26.1 | DXF import: parse DXF files and convert entities to sketch entities | Must |
| F26.2 | DXF entity support: LINE, CIRCLE, ARC, POLYLINE, SPLINE, DIMENSION | Must |
| F26.3 | DXF export: convert sketch entities and flat patterns to DXF format | Must |
| F26.4 | DXF layer support: import layers as sketch groups; export with layer assignments | Should |
| F26.5 | SVG export: vector export of 2D sketch view for web/print use | Must |
| F26.6 | SVG export of drawing views (from Sprint 16) as standalone SVG files | Should |
| F26.7 | DXF export of sheet metal flat patterns (from Sprint 13) for CNC/laser cutting | Must |
| F26.8 | Batch export: export all drawing views as individual DXF/SVG files | Could |

**Non-functional Requirements**

- DXF import handles AutoCAD 2018 format (AC1032) and earlier.
- DXF files up to 10 MB parse within 5 seconds.
- SVG output is W3C-compliant and renders in all modern browsers.

#### 2. Architecture

- **DXFParser** (`apps/web/src/loaders/DXFParser.ts`): Parses DXF file sections (HEADER, TABLES, ENTITIES, BLOCKS). Converts DXF entities to internal sketch entity types with layer and style attributes.
- **DXFWriter** (`apps/web/src/services/DXFWriter.ts`): Generates DXF file content from sketch entities. Handles entity type mapping, layer table, and header section.
- **SVGExporter** (`apps/web/src/services/SVGExporter.ts`): Converts sketch entities and drawing views to SVG elements. Handles viewBox calculation, stroke styles, dimension text.
- **DXFLayerMapper** (`apps/web/src/loaders/DXFLayerMapper.ts`): Maps DXF layers to sketch groups with color and line style preservation.
- Backend: `apps/api/services/dxf.py` for server-side DXF generation from B-rep projected edges (for 3D model -> DXF workflow).

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/loaders/DXFParser.ts` | DXF file parser |
| `apps/web/src/loaders/DXFLayerMapper.ts` | DXF layer to sketch group mapping |
| `apps/web/src/services/DXFWriter.ts` | DXF file generator |
| `apps/web/src/services/SVGExporter.ts` | SVG export from sketch/drawing |
| `apps/api/services/dxf.py` | Server-side DXF from B-rep projections |
| `apps/api/routers/dxf.py` | DXF endpoints |
| `packages/cad-types/src/dxf.ts` | DXF entity types and layer info |

**Modified files:** `ImportService.ts` (add DXF file type), `ExportService.ts` (add DXF/SVG options), `FileMenuBar.tsx` (DXF/SVG export menu items), `FlatPatternViewer.tsx` (DXF export button).

**Implementation order:** DXF entity types -> DXFParser -> DXFLayerMapper -> ImportService integration -> DXFWriter -> SVGExporter -> backend dxf service -> FileMenuBar integration.

#### 4. Testing

- **Unit (Vitest):** DXFParser: parse a test DXF with known entities -> correct entity count and types; DXFWriter roundtrip: export then import produces same entities.
- **Unit (pytest):** Server-side DXF from projected cube -> 4 visible edges in DXF output.
- **E2E (Playwright):** Import a DXF file -> verify sketch entities render; export sketch as DXF -> verify file downloads; export as SVG -> open in browser.
- **Integration:** DXF files exported from GestureCAD open correctly in AutoCAD/LibreCAD.

#### 5. Acceptance Criteria

- [ ] DXF files with LINE, CIRCLE, ARC, POLYLINE, SPLINE entities import correctly.
- [ ] DXF layers are preserved as sketch groups with original colors.
- [ ] Sketch entities export to a valid DXF file.
- [ ] Sheet metal flat patterns export as DXF suitable for laser cutting.
- [ ] SVG export produces clean vector output viewable in browsers.
- [ ] Drawing views export as SVG with dimensions and annotations.
- [ ] Exported DXF files are compatible with AutoCAD and LibreCAD.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (sketch entities), Sprint 6 (import/export framework), Sprint 13 (flat patterns), Sprint 16 (drawing views).
- **External libraries:** None new (custom DXF parser; DXF format is text-based and well-documented).

---

## Sprint 27

### Weldments + Structural

Structural members, Weld beads, Cut list.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F27.1 | Structural member insertion: select a profile (I-beam, C-channel, tube, angle) and a path | Must |
| F27.2 | Profile library: standard structural steel profiles (AISC, EN) with dimensions | Must |
| F27.3 | Trim/Extend at member junctions: auto-trim intersecting members with miter/cope | Must |
| F27.4 | Weld bead visualization: fillet weld, groove weld, spot weld symbols on joints | Should |
| F27.5 | Cut list generation: list of structural members with lengths, angles, quantities | Must |
| F27.6 | Gusset plate insertion: triangular plate at member junctions | Should |
| F27.7 | End cap: close open ends of hollow profiles | Could |

**Non-functional Requirements**

- Profile library contains at least 50 standard profiles.
- Cut list generates within 1 second for structures with up to 100 members.
- Structural member sweep along path renders in real time during path editing.

#### 2. Architecture

- **ProfileLibrary** (`apps/api/data/profiles.json` + `apps/web/src/weldments/ProfileLibrary.ts`): JSON catalog of structural profiles with cross-section geometry (as sketch outlines), material properties, and standard designations.
- **StructuralMemberTool** (`apps/web/src/tools/StructuralMemberTool.ts`): Select profile from library -> draw or select path (line/polyline) -> sweep profile along path via backend.
- **JunctionTrimmer** (`apps/api/services/weldments/trim.py`): Detects member intersections, applies miter or cope cuts automatically based on member angles.
- **WeldSymbolRenderer** (`apps/web/src/components/WeldSymbolRenderer.tsx`): Places weld symbols (per AWS A2.4) at detected joints. 2D symbol overlay projected from 3D joint position.
- **CutListGenerator** (`apps/api/services/weldments/cutlist.py`): Traverses structural member features, computes cut lengths (accounting for trim), generates tabular cut list.
- **CutListPanel** (`apps/web/src/components/CutListPanel.tsx`): Table display of the cut list with sorting and export (CSV/PDF).

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/tools/StructuralMemberTool.ts` | Structural member insertion tool |
| `apps/web/src/weldments/ProfileLibrary.ts` | Client-side profile browser |
| `apps/web/src/components/ProfileSelector.tsx` | Profile selection panel |
| `apps/web/src/components/WeldSymbolRenderer.tsx` | Weld symbol overlay |
| `apps/web/src/components/CutListPanel.tsx` | Cut list table display |
| `apps/api/data/profiles.json` | Standard profile dimensions catalog |
| `apps/api/services/weldments/members.py` | Structural member sweep |
| `apps/api/services/weldments/trim.py` | Junction auto-trim |
| `apps/api/services/weldments/cutlist.py` | Cut list generation |
| `apps/api/routers/weldments.py` | Weldment endpoints |
| `packages/cad-types/src/weldments.ts` | Profile, Member, CutListEntry types |

**Modified files:** `featureStore.ts` (structural member feature type), `FeatureTreePanel.tsx` (member/weldment group).

**Implementation order:** Profile data -> ProfileLibrary -> ProfileSelector -> backend member sweep -> StructuralMemberTool -> JunctionTrimmer -> WeldSymbolRenderer -> CutListGenerator -> CutListPanel.

#### 4. Testing

- **Unit (pytest):** Sweep I-beam along a 1m line -> correct cross-section area and length; miter trim at 45 degrees produces correct end geometry; cut list for 3 members sums to expected total length.
- **E2E (Playwright):** Select profile -> draw path -> verify structural member renders; verify cut list shows correct entries.
- **Visual regression:** I-beam profile rendering; miter joint quality; weld symbol positioning.

#### 5. Acceptance Criteria

- [ ] Profile library offers at least 50 standard profiles across categories.
- [ ] Structural member sweeps correctly along straight and polyline paths.
- [ ] Intersecting members auto-trim with miter cuts at junctions.
- [ ] Weld symbols render at detected joints with correct symbology.
- [ ] Cut list table lists all members with accurate lengths and quantities.
- [ ] Cut list exports to CSV for fabrication use.
- [ ] Gusset plates can be inserted at selected junctions.

#### 6. Dependencies

- **Prior sprints:** Sprint 10 (sweep), Sprint 4 (spline paths), Sprint 16 (documentation output).
- **External libraries:** `build123d@0.8.x` (sweep), structural profile data from public AISC database.

---

## Sprint 28

### CAM Integration

Toolpath generation, G-code export, Machine simulation.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F28.1 | Define stock material: rectangular or cylindrical stock bounding the part | Must |
| F28.2 | 2.5D roughing toolpath: horizontal slice layers with offset clearing | Must |
| F28.3 | 2.5D finishing toolpath: contour following at each Z level | Must |
| F28.4 | 3D surface finishing: parallel or spiral toolpath over freeform surfaces | Should |
| F28.5 | Drilling operations: detect holes, generate peck drill cycles | Should |
| F28.6 | Tool library: end mills, ball nose, drills with diameter, flutes, feed/speed | Must |
| F28.7 | G-code export: standard G-code (Fanuc dialect) with configurable post-processor | Must |
| F28.8 | Toolpath visualization: render toolpaths as colored lines in the 3D viewport | Must |
| F28.9 | Basic machine simulation: animated tool moving along the toolpath | Should |

**Non-functional Requirements**

- Roughing toolpath generation for a 100x100x50mm part with 5mm stepdown < 10 seconds.
- G-code file size < 10 MB for typical parts.
- Machine simulation animation at 30+ FPS.

#### 2. Architecture

- **CAM module** is primarily backend (computational geometry).
- **ToolpathPlanner** (`apps/api/services/cam/planner.py`): Orchestrates toolpath generation. Slices stock at Z levels, computes offset loops for clearing, generates tool engagement paths.
- **RoughingStrategy** (`apps/api/services/cam/roughing.py`): Adaptive clearing with constant chip load. Uses offset contours of the slice boundary.
- **FinishingStrategy** (`apps/api/services/cam/finishing.py`): Surface-following toolpath. Generates parallel passes at a specified stepover.
- **DrillDetector** (`apps/api/services/cam/drilling.py`): Identifies cylindrical holes in the B-rep, generates drill point locations with depths.
- **GCodeWriter** (`apps/api/services/cam/gcode.py`): Converts toolpath points to G-code. Configurable post-processor for different machine dialects (Fanuc, Haas, LinuxCNC).
- **ToolLibrary** (`apps/api/data/tools.json`): Catalog of cutting tools with geometry and recommended feeds/speeds.
- **ToolpathRenderer** (`apps/web/src/components/ToolpathRenderer.tsx`): Renders toolpath as colored `Line2` segments. Color-coded by operation type (rapids=red, cuts=blue, plunges=green).
- **MachineSimulator** (`apps/web/src/components/MachineSimulator.tsx`): Animates a tool model along the toolpath with material removal visualization (subtract tool volume from stock mesh).

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/api/services/cam/planner.py` | Toolpath planning orchestration |
| `apps/api/services/cam/roughing.py` | Roughing strategy |
| `apps/api/services/cam/finishing.py` | Finishing strategy |
| `apps/api/services/cam/drilling.py` | Hole detection and drill path |
| `apps/api/services/cam/gcode.py` | G-code generation and post-processing |
| `apps/api/data/tools.json` | Cutting tool library |
| `apps/api/routers/cam.py` | CAM endpoints |
| `apps/web/src/stores/camStore.ts` | CAM setup and toolpath state |
| `apps/web/src/components/ToolpathRenderer.tsx` | Toolpath 3D visualization |
| `apps/web/src/components/MachineSimulator.tsx` | Animated machining simulation |
| `apps/web/src/components/CAMSetupPanel.tsx` | Stock, tool, operation configuration |
| `apps/web/src/components/ToolLibraryPanel.tsx` | Tool selection browser |
| `packages/cad-types/src/cam.ts` | Toolpath, Operation, GCode types |

**Modified files:** `Viewport.tsx` (toolpath rendering layer), `FileMenuBar.tsx` (Export G-code menu item).

**Implementation order:** CAM types -> tool library data -> backend roughing strategy -> finishing strategy -> drill detection -> GCodeWriter -> CAM router -> camStore -> CAMSetupPanel -> ToolpathRenderer -> MachineSimulator.

#### 4. Testing

- **Unit (pytest):** Roughing of a pocket produces correct number of Z levels; finishing toolpath covers full surface area; G-code output has valid syntax (no missing line numbers, correct G/M codes).
- **E2E (Playwright):** Set up stock + tool -> generate roughing toolpath -> verify toolpath lines render; export G-code -> verify file downloads.
- **Integration:** Exported G-code validates in a G-code simulator (e.g., CAMotics).

#### 5. Acceptance Criteria

- [ ] Stock material can be defined as a box or cylinder bounding the part.
- [ ] Roughing toolpath clears material in horizontal layers.
- [ ] Finishing toolpath follows the part surface contour.
- [ ] Drilling operations detect holes and generate drill cycles.
- [ ] Tool library provides configurable cutting tools.
- [ ] G-code exports in valid Fanuc format.
- [ ] Toolpath renders in the viewport with color-coded operation types.
- [ ] Machine simulation animates the cutting tool along the path.

#### 6. Dependencies

- **Prior sprints:** Sprint 3 (3D solids), Sprint 6 (export framework).
- **External libraries:** `build123d@0.8.x` (for geometry slicing), `numpy@1.x` (offset computation).

---

## Sprint 29

### Plugin System

Extension API, Custom tools, Marketplace.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F29.1 | Plugin API: well-documented JavaScript API for extending GestureCAD | Must |
| F29.2 | Custom tool plugins: register new sketch/3D tools with custom gesture mappings | Must |
| F29.3 | Custom panel plugins: add new sidebar panels with React components | Must |
| F29.4 | Custom export plugins: register new file format exporters | Should |
| F29.5 | Plugin lifecycle: install, enable, disable, uninstall plugins | Must |
| F29.6 | Plugin sandbox: plugins run in an iframe sandbox with a message-based API | Must |
| F29.7 | Plugin manifest: `plugin.json` declaring name, version, permissions, entry point | Must |
| F29.8 | Plugin marketplace: browse and install community plugins (local for MVP) | Should |
| F29.9 | Plugin settings: per-plugin configuration stored in user preferences | Could |

**Non-functional Requirements**

- Plugin loading adds < 100 ms to startup per plugin.
- Plugin sandbox prevents access to main app state except through the API.
- Plugin API is backward-compatible (semantic versioning).

#### 2. Architecture

- **PluginHost** (`apps/web/src/plugins/PluginHost.ts`): Manages plugin lifecycle (load, init, enable, disable, destroy). Maintains plugin registry.
- **PluginSandbox** (`apps/web/src/plugins/PluginSandbox.ts`): Creates iframe sandboxes for each plugin. Communicates via `postMessage` with a typed message protocol.
- **PluginAPI** (`apps/web/src/plugins/PluginAPI.ts`): The API surface exposed to plugins. Includes: `registerTool()`, `registerPanel()`, `registerExporter()`, `getActiveSketch()`, `getFeatureTree()`, `onEntityCreated()`, `onFeatureAdded()`.
- **PluginManifest** schema: `{ name, version, author, description, permissions: ["sketch:read", "sketch:write", "feature:read", "ui:panel"], entryPoint: "index.js" }`.
- **PluginStore** (`apps/web/src/stores/pluginStore.ts`): Installed plugins, enabled state, settings per plugin.
- **MarketplacePanel** (`apps/web/src/components/MarketplacePanel.tsx`): Browse available plugins, install/uninstall, rate/review (local catalog for MVP).

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/plugins/PluginHost.ts` | Plugin lifecycle manager |
| `apps/web/src/plugins/PluginSandbox.ts` | Iframe sandbox for plugin isolation |
| `apps/web/src/plugins/PluginAPI.ts` | Public API exposed to plugins |
| `apps/web/src/plugins/PluginMessageProtocol.ts` | Typed message schema for sandbox communication |
| `apps/web/src/stores/pluginStore.ts` | Installed plugin state |
| `apps/web/src/components/PluginManagerPanel.tsx` | Plugin install/enable/disable UI |
| `apps/web/src/components/MarketplacePanel.tsx` | Plugin marketplace browser |
| `packages/cad-types/src/plugin.ts` | PluginManifest, PluginAPI type definitions |
| `docs/PLUGIN_API.md` | Plugin developer documentation |

**Modified files:** `ToolStateMachine.ts` (register plugin tools), `Toolbar.tsx` (render plugin tool icons), layout (render plugin panels in sidebar).

**Implementation order:** PluginManifest schema -> PluginAPI type definitions -> PluginSandbox -> PluginHost -> PluginMessageProtocol -> PluginAPI implementation -> pluginStore -> PluginManagerPanel -> MarketplacePanel -> example plugin.

#### 4. Testing

- **Unit (Vitest):** PluginSandbox communication roundtrip; PluginAPI `registerTool()` adds tool to ToolStateMachine; permission enforcement (plugin without `sketch:write` cannot create entities).
- **E2E (Playwright):** Install example plugin -> verify custom tool appears in toolbar; activate plugin tool -> verify it functions; disable plugin -> verify tool disappears.
- **Security:** Plugin cannot access `document.cookie`, `localStorage`, or parent window DOM directly.

#### 5. Acceptance Criteria

- [ ] Plugin manifest format is documented and validated on install.
- [ ] Plugins can register custom tools that appear in the toolbar.
- [ ] Plugins can register custom sidebar panels with React components.
- [ ] Plugin sandbox prevents unauthorized access to app internals.
- [ ] Plugins can be enabled/disabled without page reload.
- [ ] Plugin marketplace shows available plugins with install buttons.
- [ ] Plugin permissions are enforced (declared permissions only).
- [ ] An example plugin (e.g., "Gear Generator") demonstrates the full API.

#### 6. Dependencies

- **Prior sprints:** Sprint 1 (tool system), Sprint 3 (feature system), Sprint 5 (parameter system).
- **External libraries:** None new (standard browser iframe API).

---

## Sprint 30

### Polish + Launch

Onboarding, Tutorial gestures, Documentation, Deployment.

#### 1. Requirements

**Functional Requirements**

| ID | Requirement | Priority |
|----|-------------|----------|
| F30.1 | First-time user onboarding flow: interactive walkthrough of gesture controls | Must |
| F30.2 | Tutorial mode: guided exercises (draw a line, extrude a box, apply a fillet) | Must |
| F30.3 | Gesture cheat sheet: overlay showing all gesture-to-action mappings | Must |
| F30.4 | User documentation: searchable help system with illustrated articles | Must |
| F30.5 | Keyboard shortcut reference card | Should |
| F30.6 | Production deployment: Vercel (frontend) + cloud backend (FastAPI) | Must |
| F30.7 | Error reporting: client-side error boundary with crash report submission | Must |
| F30.8 | Analytics: anonymous usage metrics (feature usage frequency, session duration) | Should |
| F30.9 | Landing page: product marketing page with demo video | Should |
| F30.10 | Lighthouse audit: Performance > 80, Accessibility > 90, Best Practices > 90 | Must |

**Non-functional Requirements**

- Onboarding completes in under 5 minutes for a new user.
- Documentation search returns results within 200 ms.
- Production deployment achieves < 3 second Time to Interactive.
- Error reports include stack trace, browser info, and last 10 user actions.

#### 2. Architecture

- **OnboardingFlow** (`apps/web/src/onboarding/OnboardingFlow.tsx`): Step-by-step modal sequence with animated hand demonstrations, progress indicators, and skip option. Steps: camera setup, basic gestures, first sketch, first extrude.
- **TutorialEngine** (`apps/web/src/onboarding/TutorialEngine.ts`): Scripted exercise system. Each tutorial defines: objective, required actions, hints, success criteria. Validates user actions against expected sequence.
- **GestureCheatSheet** (`apps/web/src/components/GestureCheatSheet.tsx`): Modal overlay with gesture illustrations in a grid layout. Filterable by category (navigation, sketch, 3D, selection).
- **HelpSystem** (`apps/web/src/help/HelpSystem.ts`): Indexed searchable documentation. Articles in MDX format compiled at build time. Full-text search via client-side index.
- **ErrorBoundary** (`apps/web/src/components/ErrorBoundary.tsx`): React error boundary capturing component crashes. Sends reports to backend endpoint.
- **AnalyticsService** (`apps/web/src/services/AnalyticsService.ts`): Anonymous event tracking (no PII). Records feature activation counts, session duration, error frequency.
- **Deployment**: Vercel for Next.js frontend (configured in `vercel.json`), Fly.io or Railway for FastAPI backend, WASM files served from CDN.

#### 3. Implementation

**New files:**

| File | Purpose |
|------|---------|
| `apps/web/src/onboarding/OnboardingFlow.tsx` | First-time user walkthrough |
| `apps/web/src/onboarding/TutorialEngine.ts` | Guided exercise system |
| `apps/web/src/onboarding/tutorials/basic-sketch.ts` | Basic sketch tutorial script |
| `apps/web/src/onboarding/tutorials/first-extrude.ts` | First extrude tutorial script |
| `apps/web/src/onboarding/tutorials/assembly-basics.ts` | Assembly basics tutorial script |
| `apps/web/src/components/GestureCheatSheet.tsx` | Gesture reference overlay |
| `apps/web/src/help/HelpSystem.ts` | Searchable documentation engine |
| `apps/web/src/help/articles/` | MDX documentation articles directory |
| `apps/web/src/components/ErrorBoundary.tsx` | Crash recovery UI |
| `apps/web/src/services/AnalyticsService.ts` | Anonymous usage analytics |
| `apps/web/src/components/LandingPage.tsx` | Product marketing page |
| `vercel.json` | Vercel deployment configuration |
| `apps/api/Dockerfile` | Backend container for deployment |
| `apps/api/routers/errors.py` | Error report ingestion endpoint |

**Modified files:** `apps/web/src/app/layout.tsx` (ErrorBoundary wrapper, analytics init), `apps/web/src/app/page.tsx` (onboarding trigger for new users), `package.json` (build/deploy scripts), `turbo.json` (production build pipeline).

**Implementation order:** ErrorBoundary (safety net first) -> OnboardingFlow -> TutorialEngine + tutorial scripts -> GestureCheatSheet -> HelpSystem + articles -> AnalyticsService -> LandingPage -> deployment config (Vercel + backend) -> Lighthouse optimization -> final QA pass.

#### 4. Testing

- **Unit (Vitest):** TutorialEngine validates correct action sequences; HelpSystem search returns relevant articles; ErrorBoundary catches and reports errors.
- **E2E (Playwright):** New user flow: onboarding appears -> complete gesture tutorial -> verify onboarding marked complete; search help for "extrude" -> verify article result.
- **Lighthouse CI:** Automated Lighthouse audit in CI pipeline with score thresholds.
- **Cross-browser:** Verify onboarding and core features in Chrome, Firefox, Safari, Edge.
- **Load testing:** Backend handles 50 concurrent users without degradation.

#### 5. Acceptance Criteria

- [ ] First-time users see an interactive onboarding walkthrough.
- [ ] Tutorials guide users through basic operations with real-time validation.
- [ ] Gesture cheat sheet is accessible via a help button at all times.
- [ ] Documentation is searchable and covers all major features.
- [ ] Keyboard shortcut reference card is accessible.
- [ ] Production deployment serves the app with < 3 second Time to Interactive.
- [ ] Client errors are caught and reported gracefully.
- [ ] Lighthouse scores meet thresholds: Performance > 80, Accessibility > 90.
- [ ] Landing page communicates the product value proposition.
- [ ] Application works in Chrome, Firefox, Safari, and Edge.

#### 6. Dependencies

- **Prior sprints:** All prior sprints (this is the final integration and polish sprint).
- **External libraries:** `vercel` (deployment), `lighthouse@12.x` (CI audit), `@sentry/nextjs` or custom error reporting.

---

## Appendix: Library Version Matrix

| Library | Version | Sprint Introduced | Purpose |
|---------|---------|-------------------|---------|
| `next` | 15.x | 1 | React framework |
| `react` | 19.x | 1 | UI library |
| `three` | 0.170.x | 1 | 3D rendering |
| `@react-three/fiber` | 9.x | 1 | React Three.js bindings |
| `@react-three/drei` | 10.x | 1 | R3F helpers |
| `@mediapipe/hands` | 0.4.x | 1 | Hand tracking |
| `fingerpose` | 0.2.x | 1 | Gesture classification |
| `zustand` | 5.x | 1 | State management |
| `planegcs` (WASM) | latest | 2 | 2D constraint solver |
| `fastapi` | 0.115.x | 2 | Python API framework |
| `build123d` | 0.8.x | 2 | CAD kernel (Python) |
| `pydantic` | 2.x | 2 | Data validation |
| `occt-import-js` | 0.0.20+ | 6 | STEP file import |
| `manifold-3d` | 3.0.x | 7 | Mesh boolean operations |
| `three-mesh-bvh` | 0.8.x | 8 | Accelerated raycasting |
| `gmsh` | 4.x | 17 | FEA mesh generation |
| `scipy` | 1.x | 17 | Scientific computing |
| `numpy` | 1.x | 17 | Numerical arrays |
| `jspdf` | 2.x | 16 | PDF generation |
| `svg2pdf.js` | 2.x | 16 | SVG to PDF conversion |

---

## Appendix: Cumulative File Structure (Final)

```
gesture-cad/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── public/
│   │   │   ├── wasm/                 # WASM binaries (PlaneGCS, Manifold, occt-import-js)
│   │   │   ├── hdri/                 # HDRI environment maps
│   │   │   └── materials/            # PBR material textures
│   │   └── src/
│   │       ├── gesture/              # Hand tracking and gesture classification
│   │       ├── tools/                # Sketch and 3D operation tools
│   │       ├── constraints/          # PlaneGCS constraint solver
│   │       ├── commands/             # Command pattern (undo/redo)
│   │       ├── stores/               # Zustand state stores
│   │       ├── components/           # React/R3F UI components
│   │       ├── navigation/           # Viewport camera control
│   │       ├── engine/               # Parametric regeneration
│   │       ├── boolean/              # Manifold boolean operations
│   │       ├── picking/              # Edge/face selection (BVH)
│   │       ├── effects/              # Post-processing effects
│   │       ├── assembly/             # Assembly mates and solver
│   │       ├── sheetmetal/           # Sheet metal features
│   │       ├── analysis/             # Curvature and draft analysis
│   │       ├── shaders/              # Custom GLSL shaders
│   │       ├── animation/            # Keyframe and motion study
│   │       ├── collab/               # Real-time collaboration
│   │       ├── rendering/            # PBR materials and environment
│   │       ├── performance/          # BVH, LOD, instancing, batching
│   │       ├── workers/              # Web Worker pool
│   │       ├── loaders/              # File parsers (STEP, STL, DXF)
│   │       ├── services/             # Import/Export/Screenshot/Analytics
│   │       ├── drawing/              # 2D drawing tools
│   │       ├── weldments/            # Structural profile library
│   │       ├── accessibility/        # Alternative input modes
│   │       ├── plugins/              # Plugin system host
│   │       ├── onboarding/           # Tutorials and walkthrough
│   │       ├── help/                 # Searchable documentation
│   │       └── utils/                # Math, intersection, spline utilities
│   └── api/                          # FastAPI backend
│       ├── data/                     # Materials, profiles, tools JSON
│       ├── models/                   # Pydantic models
│       ├── routers/                  # API route handlers
│       └── services/                 # Business logic
│           ├── fea/                  # FEA solvers (stress, thermal, modal)
│           ├── topopt/               # Topology optimization
│           ├── cam/                  # CAM toolpath generation
│           ├── collab/               # WebSocket collaboration server
│           ├── versioning/           # Version control and branching
│           └── weldments/            # Structural member operations
├── packages/
│   ├── cad-types/                    # Shared TypeScript types
│   └── gesture-types/                # Gesture vocabulary types
├── docs/
│   ├── SPRINT_PLAN.md                # This file
│   └── PLUGIN_API.md                 # Plugin developer guide (Sprint 29)
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── vercel.json
└── README.md
```
