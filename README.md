# GestureCAD

A premium CAD design application controlled by hand gestures. Uses MediaPipe Hands for real-time hand tracking and maps gestures to CAD operations like drawing, extruding, and navigating 3D space.

## Architecture

**Hybrid: Web Frontend + Python Backend**

- **Frontend**: Next.js + Three.js + MediaPipe Hands (real-time gesture tracking and 3D rendering)
- **Backend**: FastAPI + Build123d/OpenCASCADE (geometry engine, simulation, file export)
- **Communication**: WebSocket for real-time updates, REST for operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js via @react-three/fiber |
| Hand Tracking | MediaPipe Hands (21 landmarks, 30-60 FPS) |
| CAD Kernel | Replicad (WASM) + Build123d (server) |
| Constraint Solver | Solvespace |
| Frontend | Next.js (App Router) |
| Backend | FastAPI (Python) |
| Monorepo | Turborepo + pnpm |

## Gesture Controls

| Gesture | Action |
|---------|--------|
| Point (index finger) | Draw / place point |
| Pinch (thumb+index) | Confirm operation |
| Open palm | Pan viewport |
| Fist | Select object |
| Peace sign | Line tool |
| Three fingers | Circle tool |
| L-shape | Rectangle tool |
| Swipe left/right | Undo / Redo |
| Two-hand pinch | Zoom |
| Two-hand rotate | Orbit view |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Start API server
cd apps/api && uvicorn main:app --reload --port 8000
```

## Project Structure

```
gesture-cad/
├── apps/
│   ├── web/          # Next.js frontend (3D viewport + gesture tracking)
│   └── api/          # FastAPI backend (geometry engine + file export)
├── packages/
│   ├── cad-types/    # Shared geometry types
│   └── gesture-types/ # Gesture vocabulary types
└── turbo.json
```

## Roadmap

See the full [sprint plan](docs/SPRINT_PLAN.md) for the 30-sprint development roadmap covering:

- 2D Sketching with constraint solver
- 3D Modeling (extrude, revolve, sweep, loft, boolean ops)
- Parametric feature history tree
- Assembly with mates and interference detection
- FEA simulation (stress, thermal, modal)
- PBR rendering and animation
- Real-time collaboration
- STEP/STL/DXF/glTF import/export
- Sheet metal and weldments
- Topology optimization (generative design)

## License

MIT
