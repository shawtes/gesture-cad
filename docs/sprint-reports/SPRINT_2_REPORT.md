# Sprint 2 Report: Constraint Solver + Backend Integration

## 1. Requirements Traceability Matrix

| Req ID | Requirement | Status | Test ID | Evidence |
|--------|------------|--------|---------|----------|
| F2.1 | PlaneGCS WASM loads in browser | PASS | Build succeeds | WASM in public/wasm/ (496KB) |
| F2.2 | Auto-detect horizontal constraints | PASS | sprint2:13-23 | Near-horizontal line test |
| F2.3 | Auto-detect coincident constraints | PASS | Code review | detectCoincident() with 0.15 threshold |
| F2.4 | Auto-detect tangent constraints | DEFERRED | — | Sprint 4 |
| F2.5 | Auto-detect equal-length constraints | DEFERRED | — | Sprint 4 |
| F2.6 | Constraint icons at midpoints | PASS | Visual inspection | H/V/dot icons render |
| F2.7 | Backend /api/sketch endpoint | PASS | API test | POST /api/sketch/validate |
| F2.8 | Build123d wire construction | PARTIAL | geometry_service.py | Basic validation, full Build123d deferred |
| F2.9 | Constraint violation highlighting | PASS | sprint2:97 | Color-coded status |

## 2. Test Results

- **Total tests (cumulative):** 32
- **Sprint 2 tests:** 8
- **Passed:** 32/32
- **Failed:** 0
- **Pass rate:** 100%
- **Execution time:** ~56s

## 3. Non-Functional Requirements

| NFR | Target | Actual | Status |
|-----|--------|--------|--------|
| PlaneGCS solve time | < 16ms | ~5ms (simple cases) | PASS |
| Backend round-trip | < 200ms | ~50ms (local) | PASS |
| WASM bundle size | < 500KB gzipped | 496KB raw | PASS |

## 4. Architecture Decisions

- **Constraint solver:** PlaneGCS with graceful fallback to simple snapping
- **Auto-detection:** Angle threshold (5°) for H/V, distance threshold (0.15) for coincident
- **Undo/redo:** Constraints saved alongside entities in undo stack
- **Backend:** Pydantic models, geometry service with wire closure detection

## 5. Known Issues

- PlaneGCS dynamic import uses `webpackIgnore` — works in dev but may need adjustment for production edge cases
- Build123d not installed in Python env — geometry service uses basic validation
- Tangent and equal constraints deferred to Sprint 4

## 6. Sprint Velocity
- **Files created:** 7
- **Files modified:** 8
- **Lines added:** ~1,450
- **Cumulative E2E tests:** 32
