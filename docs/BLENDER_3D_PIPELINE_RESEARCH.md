# Blender 3D Character/Machine Pipeline — GestureCAD Integration Research

> Based on "Blender 3D: Characters, Machines, and Scenes for Artists" (Valenza, Kuhn, Caudron, Nicq — Packt 2016)
> Research conducted 2026-04-02

---

## Table of Contents

1. [Feature Map: Book → GestureCAD](#1-feature-map)
2. [Mesh Modeling System](#2-mesh-modeling-system)
3. [Digital Sculpting & Retopology](#3-digital-sculpting--retopology)
4. [UV Unwrapping & Texturing](#4-uv-unwrapping--texturing)
5. [Materials & Shaders](#5-materials--shaders)
6. [Rigging & Skinning](#6-rigging--skinning)
7. [Animation System](#7-animation-system)
8. [Lighting, Rendering & Compositing](#8-lighting-rendering--compositing)
9. [Library Dependency Map](#9-library-dependency-map)
10. [Architecture & Integration Plan](#10-architecture--integration-plan)
11. [Sprint Breakdown](#11-sprint-breakdown)

---

## 1. Feature Map

### Module 1: Blender 3D Cookbook (Character Pipeline)

| Book Chapter | Feature | GestureCAD Component | Priority |
|---|---|---|---|
| Ch 1: Base Mesh | Skin modifier, vertex extrusion | `lib/mesh-modeling.ts` | P0 |
| Ch 2: Sculpting | Brush deformation, dynamic topology | `lib/sculpting/` | P1 |
| Ch 3: Polygonal Modeling | Knife, loop cut, inset, bevel | `lib/mesh-edit.ts` | P0 |
| Ch 4: Retopology | Quad remeshing, shrinkwrap | `lib/retopology.ts` | P2 |
| Ch 5: UV Unwrapping | Auto-UV, seam marking, UDIM | `lib/uv-mapping.ts` | P1 |
| Ch 6: Rigging | Armature, IK, Rigify | `lib/rigging/` | P1 |
| Ch 7: Skinning | Weight painting, mesh deform | `lib/skinning.ts` | P1 |
| Ch 8: Shape Keys | Morph targets, drivers | `lib/morph-targets.ts` | P2 |
| Ch 9: Animation | Keyframes, Graph Editor, NLA | `lib/animation/` | P1 |
| Ch 10-11: Textures | Painting, baking, UDIM | `lib/texturing/` | P2 |
| Ch 12-13: Materials | PBR, SSS, node editor | `lib/materials/` | P1 |
| Ch 14: Lighting/Render | IBL, compositing, path tracing | `lib/rendering/` | P1 |

### Module 2: Incredible Machines (Mechanical Modeling)

| Feature | GestureCAD Component | Priority |
|---|---|---|
| Hard-surface modeling | `lib/mesh-modeling.ts` (shared) | P0 |
| Boolean operations | `lib/boolean-ops.ts` (existing) | P0 |
| Mechanical precision tools | `lib/constraints.ts` (existing) | P1 |

### Module 3: By Example (Project Workflows)

| Feature | GestureCAD Component | Priority |
|---|---|---|
| Scene management | `lib/scene-graph.ts` | P1 |
| Asset library / instancing | `lib/asset-library.ts` | P2 |
| Game engine integration | `apps/xr/` (existing) | P2 |

---

## 2. Mesh Modeling System

### 2.1 Core Data Structure: Half-Edge Mesh

The **single most important architectural decision** for this feature set. A half-edge data structure enables loop cuts, knife tool, bevel, adjacency queries, and topology manipulation.

```typescript
interface HalfEdge {
  vertex: number;        // target vertex index
  face: number;          // incident face (-1 if boundary)
  next: number;          // next half-edge in face loop
  prev: number;          // previous half-edge in face loop
  twin: number;          // opposite half-edge
}

interface HalfEdgeMesh {
  vertices: Float32Array;     // positions [x,y,z, x,y,z, ...]
  halfEdges: HalfEdge[];
  faceStart: number[];        // first half-edge per face
}
```

**Math:** Euler's formula V - E + F = 2 for manifold validation. All topology operations must maintain manifold consistency.

### 2.2 Skin Modifier (Base Mesh from Skeleton)

**Algorithm:** Sweep a cross-section polygon along skeleton edges using Frenet frames.

1. For each skeleton edge, compute tangent `T`, normal `N`, binormal `B = T × N`
2. Generate circular cross-sections at each vertex (radius = vertex influence)
3. Connect cross-sections with quad strips
4. Handle branching via spherical interpolation at junction vertices

**Library:** Custom implementation on `THREE.BufferGeometry`. Use `THREE.ExtrudeGeometry` for simpler path extrusions.

**Runs:** Client-side, no backend needed.

### 2.3 Edit Mode Tools

| Tool | Algorithm | Library |
|---|---|---|
| **Vertex/Edge/Face Select** | BVH-accelerated raycasting | `three-mesh-bvh` |
| **Extrude** | Duplicate boundary, connect with quads | Custom (half-edge) |
| **Subdivide** | Split edges at midpoint, create new faces | Custom (half-edge) |
| **Loop Cut** | Traverse edge loop via half-edge twin/next | Custom (half-edge) |
| **Knife** | Ray-face intersection, insert vertices/edges | `three-mesh-bvh` + custom |
| **Inset** | Scale face verts toward centroid, connect | Custom (half-edge) |
| **Bevel** | Offset edges, create chamfer faces | Custom (half-edge) |
| **Mirror** | Reflect vertices across plane, weld boundary | `BufferGeometryUtils` |
| **Subdivision Surface** | Catmull-Clark: face points → edge points → vertex adjustment | Custom or `SubdivisionModifier` |

### 2.4 Key Dependencies

```
npm: three-mesh-bvh     — BVH raycasting (10-100x faster than Three.js Raycaster on dense meshes)
npm: manifold-3d         — Watertight boolean operations (Google, WASM)
built-in: BufferGeometryUtils — Merge, mirror operations
```

---

## 3. Digital Sculpting & Retopology

### 3.1 Sculpting Brushes

Each brush = raycast → find affected vertices (within brush radius) → apply deformation kernel.

| Brush | Algorithm | Math |
|---|---|---|
| **Grab** | Translate vertices by drag delta, falloff by distance | `v += delta * falloff(dist/radius)` |
| **Smooth** | Laplacian smoothing — average with neighbors | `v = Σ(neighbors) / N` |
| **Inflate** | Displace along vertex normal | `v += normal * strength * falloff` |
| **Pinch** | Move vertices toward brush center | `v += (center - v) * strength * falloff` |
| **Crease** | Displace along normal + pinch | Combined inflate + pinch |
| **Flatten** | Project to average plane of brush area | `v -= dot(v - avg, planeN) * planeN` |

**Falloff functions:** Smooth (`cos²`), Linear, Sharp (`1-t²`), Constant

**Spatial indexing:** `three-mesh-bvh` for O(log n) vertex queries within brush radius.

**Performance target:** <500K vertices for 60fps. Use `geometry.attributes.position.needsUpdate = true` selectively. Web Workers for topology changes.

### 3.2 Dynamic Topology (DynTopo)

Adaptive mesh refinement during sculpting:

1. After each brush stroke, check edge lengths in affected region
2. **Split** edges longer than threshold (detail size)
3. **Collapse** edges shorter than threshold × 0.5
4. Retriangulate affected faces
5. Update BVH incrementally

**Math:** Edge length threshold = `detailSize / (2^subdivLevel)`. Maintain Delaunay criterion for triangle quality.

### 3.3 Multiresolution Sculpting

Store displacement maps per subdivision level. Subdivide with Catmull-Clark, store delta from subdivided position.

```
level_0: base mesh (low-poly control cage)
level_1: subdivide level_0, store displacements
level_2: subdivide level_1, store displacements
```

Navigate levels freely; edits at any level propagate via displacement reconstruction.

### 3.4 Retopology

| Method | Library | Notes |
|---|---|---|
| **Instant Meshes** (auto quad remesh) | WASM port (self-host, not on npm) | Position/orientation field → integer grid → quad extraction |
| **Shrinkwrap** | `three-mesh-bvh` `.closestPointToPoint()` | Project vertices onto target surface |
| **Manual retopo** (snap to surface) | `three-mesh-bvh` + custom | Grease Pencil → edge-loop planning |

**Performance:** Instant Meshes WASM: ~2x native overhead, ~100K tris in seconds. Run in Web Worker.

---

## 4. UV Unwrapping & Texturing

### 4.1 UV Unwrapping

**Primary library:** `xatlas` (npm) — WASM port of the industry-standard unwrapper (used in UE5).

**Algorithm:** LSCM (Least Squares Conformal Maps) + chart packing.

```typescript
import xatlas from 'xatlas';

// Generate UVs for a BufferGeometry
const result = xatlas.generateAtlas(
  positions,  // Float32Array
  indices,    // Uint32Array
  normals     // Float32Array
);
// result.uvs → assign to geometry.attributes.uv
```

| Feature | Implementation |
|---|---|
| **Seam marking** | User marks edges → split mesh at seams → pass to xatlas |
| **Smart UV Project** | Angle-based island separation → xatlas packing |
| **UDIM tiles** | Partition xatlas output into 1001+ tile spaces, each with own texture |
| **UV island editing** | Custom 2D editor: translate/rotate/scale UV islands in [0,1] space |

### 4.2 Texture Painting

**Algorithm:** Raycast mesh → barycentric interpolation to get UV coord → paint into 2D texture.

```typescript
// Brush stroke pipeline:
1. raycaster.intersectObject(mesh)        // get face, UV
2. uv = barycentricInterpolate(hit)       // exact UV position
3. ctx.beginPath(); ctx.arc(uv.x * texW, uv.y * texH, brushSize, 0, 2π)
4. canvasTexture.needsUpdate = true       // push to GPU
```

**Vertex color painting:** Direct manipulation of `BufferGeometry.attributes.color` with `vertexColors: true`.

### 4.3 Texture Baking

| Bake Type | Method |
|---|---|
| **Normal map** | For each low-res texel: find hi-res surface point, compute tangent-space normal delta |
| **AO** | Cast rays from each texel into hemisphere, accumulate occlusion |
| **Color/Diffuse** | Render hi-res mesh colors to low-res UV layout |

Render to `WebGLRenderTarget` mapped to UV space. For heavy AO: use WebGPU compute or `gpu.js`.

---

## 5. Materials & Shaders

### 5.1 PBR Material System

Three.js `MeshPhysicalMaterial` covers the full PBR pipeline:

| Property | Use Case |
|---|---|
| `metalness`, `roughness` | Metal/dielectric materials |
| `clearcoat`, `clearcoatRoughness` | Lacquer, car paint |
| `sheen`, `sheenRoughness` | Fabric, velvet |
| `transmission`, `ior`, `thickness` | Glass, liquid, eyes |
| `subsurfaceColor` (via custom) | Skin SSS |
| `emissive`, `emissiveIntensity` | Glow, self-illumination |

### 5.2 Specialized Shaders from Book

| Shader | Three.js Approach |
|---|---|
| **Reptile skin** | `MeshPhysicalMaterial` + normal map (scales) + SSS via `three-custom-shader-material` |
| **Eye shader** | `MeshPhysicalMaterial` with `transmission`, `ior: 1.376`, refraction via env map |
| **Armor/Metal** | `MeshPhysicalMaterial` with `metalness: 1.0`, roughness map for wear |

### 5.3 Node-Based Shader Editor

**No production-ready "Blender Shader Editor for the web" exists.** Must build custom:

- **Graph UI:** `reactflow` (npm) for node graph rendering and interaction
- **Compilation:** Traverse node graph → generate GLSL fragment shader
- **Integration:** Feed generated GLSL to `three-custom-shader-material` (npm) which extends `MeshPhysicalMaterial`

**Architecture:**
```
ReactFlow UI → Node Graph JSON → GLSL Compiler → ShaderMaterial
```

---

## 6. Rigging & Skinning

### 6.1 Armature/Skeleton System

**Three.js built-in:** `THREE.Bone`, `THREE.Skeleton`, `THREE.SkinnedMesh`

```typescript
// R3F skeleton creation
const bones: THREE.Bone[] = [];
const root = new THREE.Bone();     // root
const spine = new THREE.Bone();    // child
root.add(spine);
spine.position.set(0, 1, 0);
const skeleton = new THREE.Skeleton(bones);
```

### 6.2 IK Solvers

| Solver | Algorithm | Library | Best For |
|---|---|---|---|
| **CCD** | Cyclic Coordinate Descent | `THREE.CCDIKSolver` (examples/jsm) | Simple chains, legs |
| **FABRIK** | Forward And Backward Reaching IK | Custom implementation | Arms, tentacles |

**Math (CCD):** For each joint from effector to root: rotate joint to minimize angle between effector and target. Iterate 8-16 times per frame.

**Constraints** (must implement custom):
- Copy Rotation: `bone.quaternion.copy(source.quaternion)`
- Limit Rotation: Clamp Euler angles per axis
- Track-To: `bone.lookAt(target)`

### 6.3 Skinning / Weight Assignment

| Method | Implementation |
|---|---|
| **Linear Blend Skinning (LBS)** | Three.js `SkinnedMesh` built-in (GPU, 4 influences/vertex) |
| **Dual Quaternion** | Custom `ShaderMaterial` — avoids "candy wrapper" artifact |
| **Auto weights** | Heat diffusion — no JS lib, use backend (Build123d/OpenCASCADE) or Blender export |
| **Weight painting** | Custom UI: raycast → modify `skinWeight` attribute per vertex |

### 6.4 Shape Keys / Morph Targets

```typescript
// Three.js morph targets
geometry.morphAttributes.position = [targetPositions];
mesh.morphTargetInfluences[0] = 0.5; // 50% blend

// Drivers: link morph weight to bone rotation
useFrame(() => {
  mesh.morphTargetInfluences[0] = Math.max(0, jawBone.rotation.x / 0.5);
});
```

**Performance:** Keep active morph targets < 8. Use `morphTargetsRelative: true` for additive blending.

### 6.5 Human Meta-Rig / Auto-Rigging

| Approach | Library/Service | Notes |
|---|---|---|
| **Mixamo** | Adobe service (API) | Upload mesh → auto-rig → download FBX/glTF |
| **VRM Standard** | `@pixiv/three-vrm` (npm) | 55-bone humanoid standard, optimized for real-time |
| **Ready Player Me** | `@readyplayerme/rpm-react-sdk` (npm) | Pre-rigged avatars |
| **Rigify export** | Blender → glTF pipeline | Best quality, manual workflow |

---

## 7. Animation System

### 7.1 Keyframe Animation

Three.js `AnimationMixer` + `AnimationClip` + `KeyframeTrack`:

```typescript
// R3F animation via drei
const { actions } = useAnimations(gltf.animations, ref);
actions['walk']?.play();
actions['idle']?.crossFadeTo(actions['walk'], 0.3);
```

**Interpolation:** Linear, Cubic Bezier (via `bezier-easing` npm), Quaternion SLERP for rotations.

### 7.2 Graph Editor

**No off-the-shelf npm package.** Must build custom:

- **Rendering:** Canvas2D or SVG for bezier curve visualization
- **Interaction:** Drag keyframe handles, adjust tangents
- **Data model:** Array of `{time, value, inTangent, outTangent}` per property

### 7.3 NLA (Non-Linear Animation)

Use `AnimationAction.weight` for blending multiple clips:

```typescript
walkAction.weight = 0.7;
runAction.weight = 0.3;
// Both play simultaneously, weighted blend
```

`crossFadeTo()` for smooth transitions. Stack actions additively for layered animation.

### 7.4 Walk Cycle

Procedural walk cycle formula:
```
hip_y = amplitude * sin(2π * frequency * t)
leg_angle = max_angle * sin(2π * frequency * t + phase)
arm_angle = -max_angle * 0.5 * sin(2π * frequency * t + phase)
```

Or import pre-made walk cycles via Mixamo/glTF.

---

## 8. Lighting, Rendering & Compositing

### 8.1 Lighting

| Type | Three.js / R3F | Library |
|---|---|---|
| **IBL/HDRI** | `<Environment preset="studio" />` | `@react-three/drei` |
| **Three-point rig** | `<Stage>` component | `@react-three/drei` |
| **Area lights** | `RectAreaLight` + `<Lightformer>` | Built-in + drei |
| **Soft shadows** | `<AccumulativeShadows>`, `<ContactShadows>` | `@react-three/drei` |

### 8.2 Rendering

| Mode | Library | Notes |
|---|---|---|
| **Real-time rasterization** | Three.js WebGL/WebGPU | Default, 60fps |
| **Path tracing** | `three-gpu-pathtracer` (npm) | Progressive, convergence to noise-free |
| **Frame capture** | `CCapture.js` / `canvas.toDataURL()` | Playblast equivalent |
| **Render layers** | `THREE.Layers` (32 layers) | Per-object visibility masking |

### 8.3 Post-Processing / Compositing

**Primary library:** `@react-three/postprocessing` (wraps `postprocessing` npm)

| Effect | Use |
|---|---|
| **Bloom** | Glow, emissive highlights |
| **DOF** | Depth of field (bokeh) |
| **ToneMapping** | ACES, Reinhard, Cineon |
| **Vignette** | Edge darkening |
| **ChromaticAberration** | Lens distortion |
| **LUT3DEffect** | Color grading via `.cube` LUT files |
| **SSAO** | Screen-space ambient occlusion |
| **SSR** | Screen-space reflections |

### 8.4 Scene Management

| Feature | Implementation |
|---|---|
| **Instancing** | `<Instances>` / `<Merged>` from drei |
| **Grouping** | `THREE.Group` / `<group>` in R3F |
| **Asset library** | glTF files loaded with `useGLTF`, cloned with `<Clone>` |
| **Scene hierarchy** | Zustand store for selection/visibility state |

---

## 9. Library Dependency Map

### Critical (Must Install)

| Package | Purpose | Size |
|---|---|---|
| `three-mesh-bvh` | Fast raycasting, sculpt spatial queries | ~50KB |
| `xatlas` | UV unwrapping (WASM) | ~400KB |
| `manifold-3d` | Boolean operations, mesh refinement (WASM) | ~300KB |
| `@react-three/postprocessing` | Post-processing pipeline | ~80KB |
| `three-gpu-pathtracer` | Offline path tracing | ~120KB |
| `three-custom-shader-material` | Extend PBR with custom GLSL | ~10KB |
| `reactflow` | Node-based shader editor UI | ~150KB |
| `bezier-easing` | Animation curve interpolation | ~3KB |

### Optional / Self-Host (WASM)

| Package | Purpose | Notes |
|---|---|---|
| Instant Meshes WASM | Auto quad retopology | No npm, self-host WASM build |
| libigl WASM | Laplacian deform, mesh processing | No npm, Emscripten build |
| `@pixiv/three-vrm` | VRM humanoid avatar support | npm available |
| `@readyplayerme/rpm-react-sdk` | Pre-rigged avatars | npm available |

### Already in Project

| Package | Extends to |
|---|---|
| `three` / `@react-three/fiber` | All rendering, scene graph |
| `@react-three/drei` | Lighting, animation hooks, instancing |
| `Build123d` (Python backend) | Auto-rigging, complex geometry ops |

---

## 10. Architecture & Integration Plan

### Frontend Architecture

```
apps/web/
├── lib/
│   ├── mesh/
│   │   ├── half-edge.ts          # Half-edge data structure
│   │   ├── mesh-modeling.ts      # Extrude, subdivide, mirror
│   │   ├── mesh-edit.ts          # Edit mode tools (knife, loop cut, bevel)
│   │   └── skin-modifier.ts     # Skeleton → mesh generation
│   ├── sculpting/
│   │   ├── brush-engine.ts       # Brush raycast + deformation kernels
│   │   ├── brushes.ts            # Grab, smooth, inflate, pinch, etc.
│   │   ├── dynamic-topo.ts       # Adaptive subdivision during sculpt
│   │   └── multires.ts           # Multiresolution sculpting
│   ├── uv/
│   │   ├── uv-unwrap.ts          # xatlas integration
│   │   ├── uv-editor.ts          # 2D UV island editor
│   │   └── seam-marking.ts       # Edge seam selection
│   ├── texturing/
│   │   ├── texture-paint.ts      # 3D texture painting
│   │   ├── texture-bake.ts       # Normal/AO/color baking
│   │   └── vertex-colors.ts      # Vertex color painting
│   ├── materials/
│   │   ├── material-presets.ts   # PBR presets (skin, metal, glass, eye)
│   │   ├── shader-graph.ts       # Node graph → GLSL compiler
│   │   └── shader-nodes.ts       # Node definitions (Mix, Noise, etc.)
│   ├── rigging/
│   │   ├── armature.ts           # Bone hierarchy creation/editing
│   │   ├── ik-solver.ts          # CCD + FABRIK IK
│   │   ├── constraints.ts        # Bone constraints
│   │   └── auto-rig.ts           # Mixamo/VRM integration
│   ├── skinning/
│   │   ├── weight-paint.ts       # Weight painting UI logic
│   │   ├── auto-weights.ts       # Heat diffusion auto-weighting
│   │   └── morph-targets.ts      # Shape key management + drivers
│   ├── animation/
│   │   ├── timeline.ts           # Keyframe timeline data model
│   │   ├── graph-editor.ts       # Bezier curve editor logic
│   │   ├── nla-mixer.ts          # Action stacking and blending
│   │   └── procedural.ts         # Procedural walk cycle, etc.
│   └── rendering/
│       ├── lighting-rigs.ts      # Three-point, studio, IBL presets
│       ├── path-tracer.ts        # three-gpu-pathtracer integration
│       ├── post-processing.ts    # Effect presets and compositing
│       └── scene-export.ts       # Frame capture, render sequences
├── components/
│   ├── sculpting/
│   │   └── sculpt-overlay.tsx    # Brush cursor, pressure UI
│   ├── uv-editor/
│   │   └── uv-editor-panel.tsx   # 2D UV editing canvas
│   ├── shader-editor/
│   │   └── shader-graph.tsx      # ReactFlow-based node editor
│   ├── animation/
│   │   ├── timeline-panel.tsx    # Keyframe timeline UI
│   │   └── graph-editor.tsx      # Curve editor canvas
│   ├── rigging/
│   │   └── bone-editor.tsx       # Armature editing in viewport
│   └── weight-paint/
│       └── weight-paint-overlay.tsx
```

### Backend Extensions (FastAPI)

```
apps/api/
├── routers/
│   ├── mesh_ops.py         # Heavy mesh operations (retopology, auto-UV fallback)
│   └── rigging.py          # Auto-rigging via Build123d/OCC
├── services/
│   ├── retopo_service.py   # Instant Meshes integration
│   ├── bake_service.py     # Server-side texture baking for heavy scenes
│   └── auto_rig_service.py # Mixamo API proxy, skeleton fitting
```

### Gesture Integration

All new tools map to the existing gesture engine:

| Gesture | Tool Mapping |
|---|---|
| **Pinch + Drag** | Sculpt brush stroke |
| **Two-finger pinch** | Brush size adjustment |
| **Spread fingers** | Switch brush type (radial menu) |
| **Fist** | Smooth brush (quick access) |
| **Point** | Vertex/edge/face select |
| **Open palm drag** | Camera orbit (existing) |
| **Thumbs up** | Confirm / apply modifier |

---

## 11. Sprint Breakdown

### Phase 1: Mesh Editing Foundation (Sprints 3-4)

- Half-edge data structure implementation
- Edit mode: vertex/edge/face selection via `three-mesh-bvh`
- Extrude, subdivide, merge operations
- Mirror modifier
- Catmull-Clark subdivision surface
- Skin modifier (skeleton → mesh)

### Phase 2: Sculpting (Sprints 5-6)

- Brush engine with BVH spatial queries
- 6 core brushes: Grab, Smooth, Inflate, Pinch, Crease, Flatten
- Dynamic topology (edge split/collapse)
- Multiresolution sculpting (displacement stack)
- Sculpt gesture mappings

### Phase 3: UV & Texturing (Sprint 7)

- xatlas WASM integration for auto-UV
- Seam marking tool
- UV editor panel (2D island manipulation)
- 3D texture painting (raycast → UV → canvas)
- Vertex color painting

### Phase 4: Materials & Shaders (Sprint 8)

- PBR material presets (skin, metal, glass, eye, armor)
- `three-custom-shader-material` integration
- Node-based shader editor (ReactFlow → GLSL compiler)
- Texture baking (normal, AO, color maps)

### Phase 5: Rigging & Skinning (Sprints 9-10)

- Bone hierarchy creation/editing
- CCD & FABRIK IK solvers
- Bone constraints (copy rotation, limit, track-to)
- Linear Blend Skinning setup
- Weight painting UI
- Shape keys / morph targets with drivers
- VRM / Mixamo auto-rig integration

### Phase 6: Animation (Sprints 11-12)

- Keyframe timeline panel
- AnimationMixer integration via `useAnimations`
- Graph editor (bezier curve UI)
- NLA action mixing and blending
- Procedural walk cycle generator
- Animation export (glTF)

### Phase 7: Lighting, Rendering & Compositing (Sprint 13)

- IBL / HDRI environment maps
- Three-point lighting presets
- `three-gpu-pathtracer` integration for offline renders
- Post-processing pipeline (bloom, DOF, SSAO, color grading)
- Frame capture / render sequences
- Scene layer management

### Phase 8: Polish & Integration (Sprint 14)

- Asset library (load/save glTF scenes)
- Instancing for complex scenes
- Performance optimization (LOD, frustum culling)
- Gesture mappings for all new tools
- E2E test coverage for new features

---

## Key Technical Decisions

1. **Half-edge mesh is foundational** — must be built first; all mesh editing, sculpting, and UV tools depend on it
2. **Client-side first** — everything except retopology and auto-rigging runs in-browser
3. **WASM for heavy compute** — xatlas, manifold-3d, Instant Meshes
4. **Web Workers for blocking ops** — retopology, baking, heavy sculpting topology changes
5. **Gesture-native UX** — every tool must have a natural gesture mapping, not just mouse/keyboard ports
6. **glTF as interchange format** — all import/export through glTF 2.0 (supports morph targets, skinning, materials)
7. **Progressive enhancement** — basic modeling first, sculpting and animation are additive features
