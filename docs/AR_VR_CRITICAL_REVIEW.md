# AR/VR CAD Simulator — Critical Technical Review

**Reviewer:** Claude (Code Review)  
**Date:** April 2026  
**Reviewing:** Shaw Tesfaye's Feasibility Report v1.0.0

---

## 1. Feasibility Assessment: VALIDATED WITH CAVEATS

The core thesis is correct — WebXR + Three.js + Quest 3 passthrough IS a viable path. However, the report has several optimistic assumptions that need correction:

### 1.1 What's Accurate
- WebXR `immersive-ar` on Quest 3 Browser — **CONFIRMED**, works since Horizon OS v62+
- WebXR Hand Input API (25 joints) — **CONFIRMED**, supported in Quest Browser
- Three.js stereoscopic rendering via `renderer.xr.enabled` — **CONFIRMED**
- GLB as preferred format — **CORRECT**, GPU-optimized, single-file
- Cook-Torrance BRDF in `MeshStandardMaterial` — **CORRECT**
- 6-10 week estimate for solo engineer — **OPTIMISTIC but possible** for prototype

### 1.2 Corrections Needed

**Correction 1: @react-three/xr v6 API has changed significantly**
The report doesn't mention that R3F/XR v6 uses a fundamentally different architecture than v5. The new API uses `<XR>` component wrapper, not `<VRButton>`. Hand tracking is via `useXRInputSourceState('hand', 'right')`, not raw WebXR joint queries.

**Correction 2: "300K poly budget per frame" is misleading**
Quest 3's XR2 Gen 2 can handle 500K-1M triangles in WebGL2 at 72fps with basic shading. The bottleneck is draw calls (keep under 100), not poly count. Use instancing and merged geometries.

**Correction 3: Gaussian Splatting in WebXR is experimental**
KHR_gaussian_splatting was proposed but NOT ratified as of April 2026. The .splat format works via custom loaders (`@mkkellogg/gaussian-splats-3d`), but integration with WebXR stereoscopic rendering has performance concerns (sorting per-eye is 2x cost).

**Correction 4: Quest 3 Depth API is NOT available via WebXR**
The WebXR Depth Sensing Module exists but Quest Browser exposes LIMITED depth data. Full Scene Understanding (mesh API) requires Native SDK (OpenXR), not WebXR. Route C (on-device TSDF) requires a native app, not a web app.

**Correction 5: opencascade.js is ~30MB, not 20MB**
The WASM bundle is 30-33MB. This is significant for mobile/Quest browser initial load. Server-side conversion is strongly preferred for production.

### 1.3 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| WebXR hand tracking latency on Quest 3 | Medium | Use prediction + smoothing (Kalman filter) |
| Large WASM bundles slow Quest browser | High | Lazy-load, use CDN with caching headers |
| Gaussian Splatting perf in stereo | High | Fall back to mesh if FPS < 72 |
| No persistent spatial anchors in WebXR | Medium | Use `localStorage` + QR code re-localization |
| STEP conversion fidelity loss | Medium | Server-side high-res tessellation |

---

## 2. Architecture Decision: What to Build

### 2.1 The Pivot Strategy

We're NOT starting from scratch. The existing GestureCAD codebase provides:
- **~2,000 lines of reusable library code** (store, entities, features, file-io, rendering, etc.)
- **Hand gesture classification** (MediaPipe → gesture strings)
- **Sketch entities and constraint system**
- **File import/export (STL)**
- **Feature tree and parameter panel**
- **107 Playwright tests**

The pivot adds a **new app** in the monorepo: `apps/xr/` — the WebXR viewer.
It imports shared packages from `packages/` and reuses `apps/web/lib/`.

### 2.2 Recommended Architecture

```
gesture-cad/
├── apps/
│   ├── web/          # Existing 2D/3D CAD (desktop, Sprint 1-30)
│   ├── xr/           # NEW: WebXR AR/VR viewer for Quest
│   │   ├── app/      # Next.js pages (XR entry point)
│   │   ├── components/
│   │   │   ├── xr-session/    # WebXR session management
│   │   │   ├── hand-tracking/ # WebXR hand input (25 joints)
│   │   │   ├── model-viewer/  # GLB/GLTF viewer with grab/rotate/scale
│   │   │   ├── drawing/       # 3D annotation splines
│   │   │   └── scanning/      # Gaussian splat viewer
│   │   └── lib/
│   │       ├── gestures.ts    # WebXR gesture classification
│   │       ├── grab.ts        # Object manipulation math
│   │       └── annotations.ts # 3D drawing persistence
│   └── api/          # Existing FastAPI (add scanning endpoints)
├── packages/
│   ├── cad-types/    # Shared (reuse)
│   └── gesture-types/ # Shared (reuse)
```

### 2.3 Technology Stack (Final)

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| 3D Engine | Three.js | 0.172 | Already in monorepo |
| React Renderer | @react-three/fiber | 9.5.0 | Already in monorepo |
| XR Runtime | @react-three/xr | 6.6.29 | Latest, R3F-native hand tracking |
| Utilities | @react-three/drei | 10.7.7 | Already in monorepo |
| Gaussian Splats | @mkkellogg/gaussian-splats-3d | 0.4.7 | Best Three.js splat renderer |
| CAD Import | occt-import-js | latest | STEP/IGES in browser |
| Hosting | Vercel | — | HTTPS required for WebXR |
| Scanning Backend | FastAPI + Nerfstudio | — | Video → .splat pipeline |
| Framework | Next.js 15 | 15.5.14 | Already in monorepo |

---

## 3. Sprint Plan: AR/VR CAD Simulator

### XR Sprint 1: WebXR Session + GLB Viewer (Week 1)
**Requirements:**
- WebXR `immersive-ar` session starts on Quest 3 browser
- Passthrough renders behind 3D content
- GLB drag-and-drop loads model into AR scene
- Model is spatially anchored (stays in place when you move)
- Controller-based grab/rotate/scale

### XR Sprint 2: Hand Tracking + Gesture Control (Week 2)
**Requirements:**
- WebXR Hand Input: 25 joints per hand visualized
- Pinch-to-select gesture (thumb-tip ↔ index-tip < 2cm)
- Grab gesture (all MCPs flexed) → grab and move model
- Bimanual scale (two-hand pinch distance)
- Bimanual rotate (two-hand grip axis rotation)

### XR Sprint 3: 3D Drawing / Annotation (Week 3)
**Requirements:**
- Index finger draws 3D splines in space
- Catmull-Rom smoothing on raw joint trajectory
- Annotations persist in model-local coordinate frame
- Color palette selection via hand UI panel
- Undo via gesture or button

### XR Sprint 4: CAD Format Pipeline (Week 4)
**Requirements:**
- Server-side STEP → GLB conversion (FastAPI + PythonOCC)
- Client-side STL import (reuse from web app)
- Cross-section plane (Three.js clipping planes)
- Measurement tool (ruler between two pinch points)
- Exploded view (animated component separation)

### XR Sprint 5: 3D Gaussian Splatting Viewer (Week 5)
**Requirements:**
- Load .splat files into AR scene
- Render Gaussian splats in stereo (WebXR dual viewport)
- Video upload → server-side Nerfstudio → .splat pipeline
- Splat-to-mesh conversion (SuGaR/Poisson) for editing

### XR Sprint 6: Integration + Polish (Week 6)
**Requirements:**
- Scan → View → Annotate → Export full workflow
- Multi-user collaboration (WebSocket cursor sharing)
- Performance profiling on Quest 3 (72fps target)
- Playwright tests for non-XR components
- Deployment to Vercel with HTTPS

---

## 4. What Existing Code We Reuse

| Module | From | Reuse Strategy |
|--------|------|---------------|
| Store (state management) | `apps/web/lib/store.ts` | Import directly or copy+adapt |
| Sketch entities | `apps/web/lib/sketch-entities.ts` | Shared package |
| Features | `apps/web/lib/features.ts` | Shared package |
| File I/O (STL) | `apps/web/lib/file-io.ts` | Shared package |
| PBR Materials | `apps/web/lib/rendering.ts` | Import directly |
| Parameters | `apps/web/lib/parameters.ts` | Import directly |
| Constraint solver | `apps/web/lib/constraint-solver.ts` | Shared package |
| Backend API | `apps/api/` | Add new endpoints |
| Playwright POM | `e2e/pages/cad-page.ts` | Extend for XR |
| Gesture types | `packages/gesture-types/` | Shared package |
