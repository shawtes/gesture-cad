# Blender 3D Pipeline — Implementation Plan

Based on: `docs/BLENDER_3D_PIPELINE_RESEARCH.md`

## Current State vs Target

| Area | Current GestureCAD | Blender Target | Gap |
|------|:------------------:|:--------------:|:---:|
| Mesh Data Structure | TessellatedMesh (flat arrays) | Half-Edge Mesh | 🔴 Major |
| Mesh Editing | None (extrude only) | Vertex/Edge/Face select, extrude, subdivide, loop cut, knife, inset, bevel | 🔴 Major |
| Sculpting | None | 6 brushes, dynamic topology, multiresolution | 🔴 Major |
| UV Mapping | None | xatlas auto-UV, seam marking, UV editor | 🔴 Major |
| Texturing | None | 3D paint, vertex colors, baking | 🔴 Major |
| Materials | 10 basic presets | Full PBR, SSS, glass, node editor | 🟡 Partial |
| Rigging | None | Bones, IK solvers, constraints | 🔴 Major |
| Skinning | None | Weight paint, morph targets, auto-rig | 🔴 Major |
| Animation | None | Keyframes, graph editor, NLA mixing | 🔴 Major |
| Rendering | Basic Three.js | Path tracing, post-processing, compositing | 🟡 Partial |
| Scene Management | Feature tree | Scene graph, instancing, asset library | 🟡 Partial |

---

## 8-Phase Implementation Plan

### Phase 1: Half-Edge Mesh Foundation (2 weeks)
**Priority: P0 — Everything depends on this**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 1.1 | `lib/mesh/half-edge.ts` | Half-edge data structure (Vertex, HalfEdge, Face, Loop) | 3d |
| 1.2 | `lib/mesh/half-edge.ts` | Euler operators (split edge, merge, collapse) | 2d |
| 1.3 | `lib/mesh/half-edge.ts` | Convert TessellatedMesh ↔ HalfEdgeMesh | 1d |
| 1.4 | `lib/mesh/half-edge.ts` | Manifold validation (Euler-Poincaré) | 1d |
| 1.5 | Install `three-mesh-bvh` | BVH-accelerated raycasting for selection | 1d |
| 1.6 | `components/viewport/edit-mode.tsx` | Edit mode: vertex/edge/face selection | 3d |

**Dependencies:** None (foundational)
**npm install:** `three-mesh-bvh`

### Phase 2: Mesh Edit Tools (2 weeks)
**Priority: P0**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 2.1 | `lib/mesh/mesh-edit.ts` | Extrude faces/edges (duplicate + connect) | 2d |
| 2.2 | `lib/mesh/mesh-edit.ts` | Subdivide (split edges, create faces) | 1d |
| 2.3 | `lib/mesh/mesh-edit.ts` | Loop cut (traverse edge loops via half-edge) | 2d |
| 2.4 | `lib/mesh/mesh-edit.ts` | Knife tool (ray-face intersection, insert edges) | 2d |
| 2.5 | `lib/mesh/mesh-edit.ts` | Inset faces (scale toward centroid) | 1d |
| 2.6 | `lib/mesh/mesh-edit.ts` | Bevel edges (offset + chamfer faces) | 2d |
| 2.7 | `lib/mesh/mesh-edit.ts` | Mirror modifier (reflect + weld boundary) | 1d |
| 2.8 | `lib/mesh/mesh-edit.ts` | Catmull-Clark subdivision surface | 2d |
| 2.9 | `lib/mesh/skin-modifier.ts` | Skin modifier (skeleton → mesh via Frenet frames) | 2d |

**Dependencies:** Phase 1 (half-edge mesh)

### Phase 3: Sculpting (2 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 3.1 | `lib/sculpting/brush-engine.ts` | Brush raycast + vertex query via BVH | 2d |
| 3.2 | `lib/sculpting/brushes.ts` | Grab brush (translate with falloff) | 1d |
| 3.3 | `lib/sculpting/brushes.ts` | Smooth brush (Laplacian smoothing) | 1d |
| 3.4 | `lib/sculpting/brushes.ts` | Inflate brush (displace along normals) | 1d |
| 3.5 | `lib/sculpting/brushes.ts` | Pinch, Crease, Flatten brushes | 1d |
| 3.6 | `lib/sculpting/dynamic-topo.ts` | Adaptive edge split/collapse during sculpt | 3d |
| 3.7 | `lib/sculpting/multires.ts` | Displacement stack per subdivision level | 2d |
| 3.8 | `components/sculpting/sculpt-overlay.tsx` | Brush cursor, size slider, pressure | 1d |
| 3.9 | Gesture mapping | Pinch+drag=stroke, two-finger=size, fist=smooth | 1d |

**Dependencies:** Phase 1 (BVH raycasting)
**Performance target:** <500K verts at 60fps

### Phase 4: UV & Texturing (1.5 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 4.1 | Install `xatlas` | WASM UV unwrapper | 0.5d |
| 4.2 | `lib/uv/uv-unwrap.ts` | xatlas integration (positions+indices → UVs) | 1d |
| 4.3 | `lib/uv/seam-marking.ts` | Edge seam selection tool | 1d |
| 4.4 | `components/uv-editor/uv-editor-panel.tsx` | 2D UV island editor | 2d |
| 4.5 | `lib/texturing/texture-paint.ts` | Raycast → UV → canvas paint | 2d |
| 4.6 | `lib/texturing/vertex-colors.ts` | Vertex color painting | 1d |
| 4.7 | `lib/texturing/texture-bake.ts` | Normal/AO/color bake to WebGLRenderTarget | 2d |

**Dependencies:** Phase 1 (half-edge for seam edges)
**npm install:** `xatlas`

### Phase 5: Materials & Shaders (1.5 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 5.1 | `lib/materials/material-presets.ts` | PBR presets: skin, metal, glass, eye, armor, fabric | 1d |
| 5.2 | Install `three-custom-shader-material` | Custom GLSL on MeshPhysicalMaterial | 0.5d |
| 5.3 | `lib/materials/shader-graph.ts` | Node graph → GLSL fragment shader compiler | 3d |
| 5.4 | `lib/materials/shader-nodes.ts` | Node types: Mix, Noise, Fresnel, Normal Map, etc. | 2d |
| 5.5 | Install `reactflow` | Node graph UI | 0.5d |
| 5.6 | `components/shader-editor/shader-graph.tsx` | ReactFlow-based shader node editor | 3d |

**Dependencies:** None (existing material system extends)
**npm install:** `three-custom-shader-material`, `reactflow`

### Phase 6: Rigging & Skinning (2 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 6.1 | `lib/rigging/armature.ts` | Bone hierarchy (THREE.Bone + Skeleton) | 2d |
| 6.2 | `components/rigging/bone-editor.tsx` | Visual bone creation/editing in viewport | 2d |
| 6.3 | `lib/rigging/ik-solver.ts` | CCD IK solver (iterate joints to target) | 2d |
| 6.4 | `lib/rigging/ik-solver.ts` | FABRIK solver (forward+backward reaching) | 1d |
| 6.5 | `lib/rigging/constraints.ts` | Copy rotation, limit rotation, track-to | 1d |
| 6.6 | `lib/skinning/weight-paint.ts` | Weight painting (raycast → modify skinWeight) | 2d |
| 6.7 | `lib/skinning/morph-targets.ts` | Shape keys with drivers (morph → bone rotation) | 1d |
| 6.8 | `lib/rigging/auto-rig.ts` | VRM/Mixamo integration for auto-rigging | 2d |

**Dependencies:** Phase 1 (mesh), Phase 2 (edit tools for weight adjust)
**npm install:** `@pixiv/three-vrm` (optional)

### Phase 7: Animation (2 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 7.1 | `lib/animation/timeline.ts` | Keyframe data model (time, value, tangents) | 1d |
| 7.2 | `components/animation/timeline-panel.tsx` | Keyframe timeline UI (scrub, add/delete keys) | 3d |
| 7.3 | `lib/animation/graph-editor.ts` | Bezier curve interpolation logic | 1d |
| 7.4 | `components/animation/graph-editor.tsx` | Visual curve editor (drag handles, adjust tangents) | 3d |
| 7.5 | `lib/animation/nla-mixer.ts` | Action stacking with weights | 1d |
| 7.6 | `lib/animation/procedural.ts` | Procedural walk cycle (sin-based joint rotation) | 1d |
| 7.7 | AnimationMixer integration | drei `useAnimations` for glTF playback | 1d |

**Dependencies:** Phase 6 (rigging for bone animation)
**npm install:** `bezier-easing`

### Phase 8: Rendering & Polish (1.5 weeks)
**Priority: P1**

| Task | File | Description | Est |
|------|------|-------------|:---:|
| 8.1 | Install `three-gpu-pathtracer` | Progressive path tracing | 0.5d |
| 8.2 | `lib/rendering/path-tracer.ts` | Path tracer integration with toggle | 1d |
| 8.3 | Install `@react-three/postprocessing` | Post-processing pipeline | 0.5d |
| 8.4 | `lib/rendering/post-processing.ts` | Effect presets (bloom, DOF, SSAO, LUT) | 1d |
| 8.5 | `lib/rendering/lighting-rigs.ts` | IBL/HDRI, three-point, studio presets | 1d |
| 8.6 | `lib/rendering/scene-export.ts` | Frame capture, render sequences | 1d |
| 8.7 | `lib/asset-library.ts` | glTF load/save, Clone, Instances | 2d |
| 8.8 | Performance pass | LOD, frustum culling, Web Worker offload | 2d |
| 8.9 | Gesture mappings | Map all new tools to hand gestures | 1d |

**Dependencies:** None (enhances existing rendering)
**npm install:** `three-gpu-pathtracer`, `@react-three/postprocessing`

---

## Dependencies (npm install order)

```bash
# Phase 1
pnpm add three-mesh-bvh

# Phase 4
pnpm add xatlas

# Phase 5
pnpm add three-custom-shader-material reactflow bezier-easing

# Phase 8
pnpm add three-gpu-pathtracer @react-three/postprocessing
```

Total new dependencies: 7 packages (~1.1MB)

---

## Total Effort Estimate

| Phase | Duration | Priority |
|-------|:--------:|:--------:|
| 1. Half-Edge Foundation | 2 weeks | P0 |
| 2. Mesh Edit Tools | 2 weeks | P0 |
| 3. Sculpting | 2 weeks | P1 |
| 4. UV & Texturing | 1.5 weeks | P1 |
| 5. Materials & Shaders | 1.5 weeks | P1 |
| 6. Rigging & Skinning | 2 weeks | P1 |
| 7. Animation | 2 weeks | P1 |
| 8. Rendering & Polish | 1.5 weeks | P1 |
| **Total** | **~14 weeks** | |

**Recommended start:** Phase 1 immediately (everything depends on half-edge mesh). Phases 3-7 can partially overlap.

---

## File Count Estimate

| Area | New Files | New Lines (est) |
|------|:---------:|:---------------:|
| Mesh (lib) | 5 | ~2,000 |
| Sculpting (lib+component) | 5 | ~1,500 |
| UV (lib+component) | 4 | ~1,200 |
| Texturing (lib) | 3 | ~800 |
| Materials (lib+component) | 5 | ~2,000 |
| Rigging (lib+component) | 6 | ~1,800 |
| Skinning (lib) | 3 | ~900 |
| Animation (lib+component) | 6 | ~2,000 |
| Rendering (lib) | 4 | ~1,000 |
| **Total** | **~41 new files** | **~13,200 lines** |
