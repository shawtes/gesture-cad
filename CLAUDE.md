# CLAUDE.md — GestureCAD

## Project Overview

GestureCAD — hand-gesture-controlled CAD application using MediaPipe + Three.js + FastAPI + OpenCASCADE.

## Architecture

- Turborepo monorepo with pnpm
- apps/web: Next.js 15 + React 19 + Three.js via @react-three/fiber + @react-three/drei
- apps/api: FastAPI Python backend with Build123d geometry engine
- packages/cad-types: Shared TypeScript geometry types (Vec3, GeometryData, FeatureNode, etc.)
- packages/gesture-types: Gesture vocabulary types (StaticGesture, TemporalGesture, GestureToolMapping, etc.)

## Build & Run Commands

- `pnpm install` — install all dependencies
- `pnpm dev` — start all apps (web on :3000)
- `pnpm build` — build all packages
- `cd apps/api && uvicorn main:app --reload --port 8000` — start API server
- `npx playwright test` — run E2E tests
- `pnpm test` — run unit tests (Vitest)

## Code Conventions

- TypeScript strict mode
- React functional components only, no class components
- Use React Context + useReducer for state (no external state libs in Sprint 1)
- Three.js via R3F declarative components, not imperative Three.js
- Shared types in packages/, never duplicate type definitions
- Inline styles via style objects (no CSS modules yet)
- Dark theme: bg #0a0a0a, accent #3b82f6, success #22c55e, error #ef4444

## Key Patterns

- Gesture → Tool mapping via DEFAULT_GESTURE_MAPPINGS from @gesture-cad/gesture-types
- Sketch entities stored as immutable array with undo/redo stack
- Viewport raycasting on invisible XZ plane for sketch input
- MediaPipe HandLandmarker with GPU delegate, VIDEO running mode

## Testing

- E2E: Playwright with Page Object Model pattern
- Unit: Vitest for frontend, pytest for backend
- Visual regression: Playwright screenshots with maxDiffPixelRatio 0.01
- Run `npx playwright test` from project root

## File Organization

```
gesture-cad/
├── apps/web/           # Next.js frontend
│   ├── app/            # App Router pages
│   ├── components/     # React components
│   │   ├── viewport/   # 3D viewport (scene, sketch-plane, sketch-renderer)
│   │   ├── gesture/    # Hand tracking overlay
│   │   └── toolbar/    # Toolbar and status bar
│   ├── lib/            # Shared utilities (store, sketch-entities, api-client)
│   └── workers/        # Web Workers (future)
├── apps/api/           # FastAPI backend
│   ├── routers/        # API route handlers
│   └── services/       # Business logic
├── packages/
│   ├── cad-types/      # Shared geometry types
│   └── gesture-types/  # Gesture vocabulary types
├── e2e/                # Playwright E2E tests
│   ├── pages/          # Page Object Models
│   └── *.spec.ts       # Test specs
└── docs/               # Sprint plan, architecture docs
```

## Sprint Status

- Sprint 1: IN PROGRESS — Core Interactive Loop + 2D Sketch Foundation
- See docs/SPRINT_PLAN.md for full roadmap
