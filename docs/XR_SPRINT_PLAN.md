# AR/VR CAD Simulator — XR Sprint Plan

## Overview
6 XR sprints building an immersive AR/VR CAD viewer for Meta Quest 3.
Built as `apps/xr/` in the GestureCAD monorepo, reusing shared packages.

**Stack:** Next.js 15 + React 19 + Three.js 0.172 + @react-three/fiber 9.5 + @react-three/xr 6.6.29

---

## XR Sprint 1: WebXR Session + GLB Viewer ✅ COMPLETE

**Status:** Shipped. 9 E2E tests passing.
- XR session management (Enter AR / Enter VR)
- GLB drag-and-drop with auto-center/scale
- View/Draw/Measure mode switching
- Desktop preview with OrbitControls
- Hand tracking component scaffold
- 3D drawing engine scaffold

---

## XR Sprint 2: Hand Tracking + Gesture Control

### Requirements
| ID | Requirement | Priority |
|----|------------|----------|
| XR-2.1 | WebXR hand joint visualization (25 joints × 2 hands) | Must |
| XR-2.2 | Pinch gesture detection (thumb-tip ↔ index-tip < 2cm) | Must |
| XR-2.3 | Grab gesture (all MCPs flexed > 60°) → grab/move model | Must |
| XR-2.4 | Bimanual scale (two-hand pinch distance delta) | Must |
| XR-2.5 | Bimanual rotate (two-hand grip axis rotation) | Must |
| XR-2.6 | Point gesture → ray-cast cursor for selection | Should |
| XR-2.7 | Open palm → reset transform | Could |

### Architecture
- `apps/xr/lib/xr-gestures.ts` — gesture detection from XR hand joint data
- `apps/xr/lib/grab-controller.ts` — object manipulation math (translate, rotate, scale)
- `apps/xr/components/hand-tracking/hand-tracker.tsx` — updated with gesture pipeline

### Implementation
1. `lib/xr-gestures.ts` — pinch, grab, point, palm detection from 25 joints
2. `lib/grab-controller.ts` — grab offset, bimanual scale/rotate math
3. Update `hand-tracker.tsx` — wire gesture detection, emit events
4. Update `model-viewer.tsx` — respond to grab/scale/rotate
5. E2E tests for desktop fallback interactions

---

## XR Sprint 3: 3D Drawing / Annotation

### Requirements
| ID | Requirement | Priority |
|----|------------|----------|
| XR-3.1 | Index fingertip draws 3D splines when in draw mode | Must |
| XR-3.2 | Catmull-Rom smoothing on raw joint trajectory | Must |
| XR-3.3 | Annotations persist in model-local coordinates | Must |
| XR-3.4 | Color palette UI panel (DOM overlay in XR) | Should |
| XR-3.5 | Undo last stroke via gesture or button | Must |
| XR-3.6 | Eraser mode (point at stroke, pinch to delete) | Should |

---

## XR Sprint 4: CAD Format Pipeline

### Requirements
| ID | Requirement | Priority |
|----|------------|----------|
| XR-4.1 | Server-side STEP → GLB conversion (FastAPI + cascadio/PythonOCC) | Must |
| XR-4.2 | Client-side STL import (reuse from web app file-io.ts) | Must |
| XR-4.3 | Cross-section plane (Three.js clipping planes, hand-positioned) | Must |
| XR-4.4 | Measurement tool (ruler between two pinch points) | Must |
| XR-4.5 | Exploded view (animated component separation) | Should |

---

## XR Sprint 5: 3D Gaussian Splatting Viewer

### Requirements
| ID | Requirement | Priority |
|----|------------|----------|
| XR-5.1 | Load .splat/.ksplat files into AR scene | Must |
| XR-5.2 | GaussianSplats3D DropInViewer in R3F scene | Must |
| XR-5.3 | Video upload → Nerfstudio Splatfacto → .splat API | Should |
| XR-5.4 | SuGaR mesh extraction from splats | Could |
| XR-5.5 | SPZ compressed format support | Should |

### Architecture
- Backend: FastAPI + Celery + Redis task queue
- Pipeline: Video → FFmpeg → COLMAP → gsplat/FastGS → .splat export
- Frontend: GaussianSplats3D DropInViewer in Three.js scene

---

## XR Sprint 6: Integration + Polish

### Requirements
| ID | Requirement | Priority |
|----|------------|----------|
| XR-6.1 | Full workflow: Scan → View → Annotate → Export | Must |
| XR-6.2 | Quest 3 Scene Understanding (planes, mesh) via RATK | Should |
| XR-6.3 | Performance profiling (72fps target) | Must |
| XR-6.4 | Deploy to Vercel with HTTPS | Must |
| XR-6.5 | Comprehensive Playwright tests | Must |
| XR-6.6 | Tutorial overlay for XR mode | Should |

---

## Technology Reference

| Library | Version | Purpose |
|---------|---------|---------|
| @react-three/xr | 6.6.29 | WebXR session, hand tracking, controllers |
| @mkkellogg/gaussian-splats-3d | 0.4.7 | Gaussian splat rendering in Three.js |
| Reality Accelerator Toolkit (RATK) | latest | Meta's plane/mesh/anchor manager |
| opencascade-tools | latest | STEP → GLB conversion |
| cascadio | latest | Python STEP → GLB (server-side) |
| Nerfstudio | 1.1.x | Splatfacto 3D reconstruction |
| gsplat | latest | CUDA Gaussian Splatting training |
| pycolmap | latest | Structure-from-Motion |
