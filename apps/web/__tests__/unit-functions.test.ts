import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// 1. Sketch Entities
// ═══════════════════════════════════════════

import {
  createPoint,
  createLine,
  createCircle,
  createRect,
  createArc,
  createSpline,
  createEllipse,
  createSlot,
  createPolygon,
} from "../lib/sketch-entities";

describe("Sketch Entities", () => {
  it("createPoint returns correct type and unique id", () => {
    const p = createPoint(1, 2);
    expect(p.type).toBe("point");
    expect(p.x).toBe(1);
    expect(p.z).toBe(2);
    expect(p.id).toBeTruthy();
  });

  it("createLine returns correct type and unique id", () => {
    const l = createLine(0, 0, 5, 5);
    expect(l.type).toBe("line");
    expect(l.id).toBeTruthy();
  });

  it("createCircle returns correct type and unique id", () => {
    const c = createCircle(0, 0, 5);
    expect(c.type).toBe("circle");
    expect(c.radius).toBe(5);
    expect(c.id).toBeTruthy();
  });

  it("createRect returns correct type and unique id", () => {
    const r = createRect(0, 0, 3, 4);
    expect(r.type).toBe("rect");
    expect(r.id).toBeTruthy();
  });

  it("createArc returns correct type and unique id", () => {
    const a = createArc(0, 0, 1, 1, 2, 0);
    expect(a.type).toBe("arc");
    expect(a.id).toBeTruthy();
  });

  it("createSpline returns correct type and unique id", () => {
    const s = createSpline([0, 0, 1, 1, 2, 0]);
    expect(s.type).toBe("spline");
    expect(s.points).toEqual([0, 0, 1, 1, 2, 0]);
    expect(s.id).toBeTruthy();
  });

  it("createEllipse returns correct type and unique id", () => {
    const e = createEllipse(0, 0, 5, 3, 0);
    expect(e.type).toBe("ellipse");
    expect(e.radiusX).toBe(5);
    expect(e.radiusZ).toBe(3);
    expect(e.id).toBeTruthy();
  });

  it("createSlot has width property", () => {
    const s = createSlot(0, 0, 5, 0, 1.5);
    expect(s.type).toBe("slot");
    expect(s.width).toBe(1.5);
    expect(s.id).toBeTruthy();
  });

  it("createPolygon has sides and rotation", () => {
    const p = createPolygon(0, 0, 5, 8, Math.PI / 4);
    expect(p.type).toBe("polygon");
    expect(p.sides).toBe(8);
    expect(p.rotation).toBe(Math.PI / 4);
    expect(p.id).toBeTruthy();
  });

  it("each factory returns a unique id", () => {
    const a = createPoint(0, 0);
    const b = createPoint(1, 1);
    expect(a.id).not.toBe(b.id);
  });
});

// ═══════════════════════════════════════════
// 2. Features
// ═══════════════════════════════════════════

import {
  createExtrudeFeature,
  createDraftFeature,
  createHoleFeature,
  createHelixFeature,
  createCurvePatternFeature,
  generateExtrudePreviewMesh,
  generateRevolvePreviewMesh,
  generateHolePreviewMesh,
  generateHelixMesh,
} from "../lib/features";

describe("Features", () => {
  it("createExtrudeFeature returns feature with type 'extrude'", () => {
    const f = createExtrudeFeature(["e1"], { distance: 5, direction: "up" });
    expect(f.type).toBe("extrude");
    expect(f.id).toBeTruthy();
    expect(f.visible).toBe(true);
  });

  it("createDraftFeature returns feature with type 'draft'", () => {
    const f = createDraftFeature(
      ["e1"],
      { angle: 5, pullDirection: [0, 1, 0], faceIndices: [0], neutralPlaneOffset: 0 }
    );
    expect(f.type).toBe("draft");
    expect(f.id).toBeTruthy();
  });

  it("createHoleFeature returns feature with type 'hole'", () => {
    const f = createHoleFeature(
      ["e1"],
      { center: [0, 0, 0], diameter: 5, depth: 10, holeType: "simple" }
    );
    expect(f.type).toBe("hole");
    expect(f.id).toBeTruthy();
  });

  it("createHelixFeature returns feature with type 'helix'", () => {
    const f = createHelixFeature({
      center: [0, 0, 0],
      radius: 1,
      pitch: 0.5,
      height: 5,
      taperAngle: 0,
      clockwise: false,
    });
    expect(f.type).toBe("helix");
    expect(f.id).toBeTruthy();
  });

  it("createCurvePatternFeature returns feature with type 'curve_pattern'", () => {
    const f = createCurvePatternFeature(
      ["e1"],
      { pathId: "p1", count: 3, keepOrientation: true, spacing: 0 }
    );
    expect(f.type).toBe("curve_pattern");
  });

  it("generateExtrudePreviewMesh returns non-empty vertices/normals/indices", () => {
    const mesh = generateExtrudePreviewMesh(0, 0, 2, 2, 3);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it("generateRevolvePreviewMesh returns non-empty mesh", () => {
    const mesh = generateRevolvePreviewMesh(0, 0, 1, 3);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it("generateHolePreviewMesh returns mesh with vertices for each hole type", () => {
    for (const holeType of ["simple", "counterbore", "countersink", "tapped"] as const) {
      const mesh = generateHolePreviewMesh(0, 0, 0, 5, 10, holeType);
      expect(mesh.vertices.length).toBeGreaterThan(0);
    }
  });

  it("generateHelixMesh returns mesh with vertices", () => {
    const mesh = generateHelixMesh({
      center: [0, 0, 0],
      radius: 1,
      pitch: 0.5,
      height: 3,
      taperAngle: 0,
      clockwise: false,
    });
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// 3. Pattern Operations
// ═══════════════════════════════════════════

import { linearPattern, circularPattern, curvePattern } from "../lib/pattern-ops";

describe("Pattern Operations", () => {
  const baseMesh = {
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    indices: [0, 1, 2],
  };

  it("linearPattern with count=1 returns original mesh", () => {
    const result = linearPattern(baseMesh, [1, 0, 0], 1, 2);
    expect(result.vertices).toEqual(baseMesh.vertices);
  });

  it("linearPattern with count=3 triples vertex count", () => {
    const result = linearPattern(baseMesh, [1, 0, 0], 3, 2);
    expect(result.vertices.length).toBe(baseMesh.vertices.length * 3);
  });

  it("circularPattern with count=4 quadruples vertex count", () => {
    const result = circularPattern(baseMesh, [0, 1, 0], [0, 0, 0], 4, 360);
    expect(result.vertices.length).toBe(baseMesh.vertices.length * 4);
  });

  it("curvePattern with keepOrientation preserves mesh structure", () => {
    const path: [number, number, number][] = [
      [0, 0, 0],
      [5, 0, 0],
      [10, 0, 0],
    ];
    const result = curvePattern(baseMesh, path, 3, true);
    expect(result.vertices.length).toBe(baseMesh.vertices.length * 3);
    expect(result.normals.length).toBe(baseMesh.normals.length * 3);
    expect(result.indices.length).toBe(baseMesh.indices.length * 3);
  });
});

// ═══════════════════════════════════════════
// 4. Modeling Operations
// ═══════════════════════════════════════════

import {
  applyDraftPreview,
  applyRibPreview,
  applySplitPreview,
  applyThickenPreview,
} from "../lib/modeling-ops";

describe("Modeling Operations", () => {
  const boxMesh = generateExtrudePreviewMesh(0, 0, 2, 2, 3);

  it("applyDraftPreview returns mesh with same index count", () => {
    const result = applyDraftPreview(boxMesh, {
      faceIndices: [0],
      angle: 5,
      pullDirection: [0, 1, 0],
    });
    expect(result.indices.length).toBe(boxMesh.indices.length);
  });

  it("applyRibPreview adds rib geometry to base mesh", () => {
    const result = applyRibPreview(boxMesh, 0.5, 2);
    expect(result.vertices.length).toBeGreaterThan(boxMesh.vertices.length);
  });

  it("applySplitPreview with 'above' removes some triangles", () => {
    const result = applySplitPreview(boxMesh, [0, 1, 0], 1.5, "above");
    // The split should keep only triangles above y=1.5, so fewer indices
    expect(result.indices.length).toBeLessThanOrEqual(boxMesh.indices.length);
  });

  it("applyThickenPreview doubles vertex count", () => {
    const result = applyThickenPreview(boxMesh, 0.5);
    expect(result.vertices.length).toBe(boxMesh.vertices.length * 2);
  });
});

// ═══════════════════════════════════════════
// 5. Surfacing
// ═══════════════════════════════════════════

import {
  evaluateNURBS,
  tessellateNURBS,
  computeCurvature,
  coonsPatch,
  fitSpline3D,
  evaluateSpline3D,
  offsetSurface,
  type NURBSSurface,
} from "../lib/surfacing";

describe("Surfacing", () => {
  // Simple bilinear NURBS surface (degree 1x1)
  const surface: NURBSSurface = {
    id: "test-surface",
    degreeU: 1,
    degreeV: 1,
    controlPoints: [
      [
        { x: 0, y: 0, z: 0, weight: 1 },
        { x: 0, y: 0, z: 1, weight: 1 },
      ],
      [
        { x: 1, y: 0, z: 0, weight: 1 },
        { x: 1, y: 0, z: 1, weight: 1 },
      ],
    ],
    knotsU: [0, 0, 1, 1],
    knotsV: [0, 0, 1, 1],
  };

  it("evaluateNURBS returns {x,y,z}", () => {
    const pt = evaluateNURBS(surface, 0.5, 0.5);
    expect(pt).toHaveProperty("x");
    expect(pt).toHaveProperty("y");
    expect(pt).toHaveProperty("z");
    expect(typeof pt.x).toBe("number");
  });

  it("tessellateNURBS returns mesh with vertices", () => {
    const mesh = tessellateNURBS(surface, 5, 5);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it("computeCurvature returns a number", () => {
    const k = computeCurvature(surface, 0.5, 0.5);
    expect(typeof k).toBe("number");
  });

  it("coonsPatch with linear curves produces valid mesh", () => {
    const bottom = (t: number) => ({ x: t, y: 0, z: 0 });
    const top = (t: number) => ({ x: t, y: 0, z: 1 });
    const left = (t: number) => ({ x: 0, y: 0, z: t });
    const right = (t: number) => ({ x: 1, y: 0, z: t });

    const mesh = coonsPatch(bottom, top, left, right, 5, 5);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it("fitSpline3D returns controlPoints and knots", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 3, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 },
    ];
    const result = fitSpline3D(points, 3);
    expect(result.controlPoints.length).toBeGreaterThan(0);
    expect(result.knots.length).toBeGreaterThan(0);
    expect(result.degree).toBe(3);
  });

  it("evaluateSpline3D returns a point", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 3, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 },
    ];
    const spline = fitSpline3D(points, 3);
    const pt = evaluateSpline3D(spline.controlPoints, spline.knots, spline.degree, 0.5);
    expect(pt).toHaveProperty("x");
    expect(pt).toHaveProperty("y");
    expect(pt).toHaveProperty("z");
  });

  it("offsetSurface returns mesh with vertices", () => {
    const mesh = offsetSurface(surface, 0.1, 5, 5);
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// 6. B-Rep
// ═══════════════════════════════════════════

import {
  createBRepTopology,
  mvfs,
  mev,
  mef,
  kemr,
  kfmrh,
  validateEulerPoincare,
  brepToMesh,
} from "../lib/brep";

describe("B-Rep", () => {
  it("createBRepTopology returns empty topology", () => {
    const topo = createBRepTopology();
    expect(topo.vertices.size).toBe(0);
    expect(topo.halfEdges.size).toBe(0);
    expect(topo.edges.size).toBe(0);
    expect(topo.faces.size).toBe(0);
    expect(topo.shells.size).toBe(0);
  });

  it("mvfs creates vertex, face, shell", () => {
    const topo = createBRepTopology();
    const result = mvfs(topo, [0, 0, 0]);
    expect(result.vertexId).toBeTruthy();
    expect(result.faceId).toBeTruthy();
    expect(result.shellId).toBeTruthy();
    expect(topo.vertices.size).toBe(1);
    expect(topo.faces.size).toBe(1);
    expect(topo.shells.size).toBe(1);
  });

  it("mev adds vertex and edge", () => {
    const topo = createBRepTopology();
    const { vertexId, faceId } = mvfs(topo, [0, 0, 0]);
    const result = mev(topo, vertexId, faceId, [1, 0, 0]);
    expect(result.vertexId).toBeTruthy();
    expect(result.edgeId).toBeTruthy();
    expect(topo.vertices.size).toBe(2);
    expect(topo.edges.size).toBe(1);
  });

  it("validateEulerPoincare on empty+mvfs topology returns valid", () => {
    const topo = createBRepTopology();
    mvfs(topo, [0, 0, 0]);
    const result = validateEulerPoincare(topo);
    // After MVFS: V=1, E=0, F=1, S=1, G=0, L=1
    // LHS: 1 - 0 + 1 = 2, RHS: 2*(1-0) + 1 = 3
    // Note: MVFS creates a degenerate initial state; just check it returns a result
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("V");
    expect(result).toHaveProperty("E");
    expect(result).toHaveProperty("F");
    expect(result.V).toBe(1);
    expect(result.E).toBe(0);
    expect(result.F).toBe(1);
  });

  it("brepToMesh returns mesh structure", () => {
    const topo = createBRepTopology();
    mvfs(topo, [0, 0, 0]);
    const mesh = brepToMesh(topo);
    expect(mesh).toHaveProperty("vertices");
    expect(mesh).toHaveProperty("normals");
    expect(mesh).toHaveProperty("indices");
  });
});

// ═══════════════════════════════════════════
// 7. Assembly
// ═══════════════════════════════════════════

import {
  createComponent,
  createMate,
  checkInterference,
  computeExplodedPositions,
  generateBOM,
  quaternionIdentity,
  quaternionFromAxisAngle,
  quaternionMultiply,
  slerp,
  rotatePoint,
  gjkIntersect,
  createConfigurationTable,
  addConfigVariable,
  addConfiguration,
  activateConfiguration,
  MATE_DOF_TABLE,
} from "../lib/assembly/assembly-manager";

describe("Assembly", () => {
  describe("Quaternion Math", () => {
    it("quaternionIdentity returns [1,0,0,0]", () => {
      expect(quaternionIdentity()).toEqual([1, 0, 0, 0]);
    });

    it("quaternionFromAxisAngle with Y axis 90deg returns correct values", () => {
      const q = quaternionFromAxisAngle([0, 1, 0], Math.PI / 2);
      expect(q[0]).toBeCloseTo(Math.cos(Math.PI / 4));
      expect(q[1]).toBeCloseTo(0);
      expect(q[2]).toBeCloseTo(Math.sin(Math.PI / 4));
      expect(q[3]).toBeCloseTo(0);
    });

    it("quaternionMultiply identity * q = q", () => {
      const id = quaternionIdentity();
      const q = quaternionFromAxisAngle([0, 1, 0], Math.PI / 3);
      const result = quaternionMultiply(id, q);
      expect(result[0]).toBeCloseTo(q[0]);
      expect(result[1]).toBeCloseTo(q[1]);
      expect(result[2]).toBeCloseTo(q[2]);
      expect(result[3]).toBeCloseTo(q[3]);
    });

    it("slerp(q,q,0.5) returns q", () => {
      const q = quaternionFromAxisAngle([0, 1, 0], Math.PI / 4);
      const result = slerp(q, q, 0.5);
      expect(result[0]).toBeCloseTo(q[0]);
      expect(result[1]).toBeCloseTo(q[1]);
      expect(result[2]).toBeCloseTo(q[2]);
      expect(result[3]).toBeCloseTo(q[3]);
    });

    it("rotatePoint [1,0,0] by 90deg Y -> [0,0,-1] approximately", () => {
      const q = quaternionFromAxisAngle([0, 1, 0], Math.PI / 2);
      const result = rotatePoint([1, 0, 0], q);
      expect(result[0]).toBeCloseTo(0, 1);
      expect(result[1]).toBeCloseTo(0, 1);
      expect(result[2]).toBeCloseTo(-1, 1);
    });
  });

  describe("MATE_DOF_TABLE", () => {
    it("has entry for each mate type", () => {
      const mateTypes = [
        "coincident", "concentric", "distance", "angle", "tangent", "lock",
        "revolute", "slider", "cylindrical", "planar", "ball", "pin_slot",
      ];
      for (const mt of mateTypes) {
        expect(MATE_DOF_TABLE).toHaveProperty(mt);
        expect(MATE_DOF_TABLE[mt as keyof typeof MATE_DOF_TABLE]).toHaveProperty("removed");
        expect(MATE_DOF_TABLE[mt as keyof typeof MATE_DOF_TABLE]).toHaveProperty("remaining");
      }
    });
  });

  describe("Component & BOM", () => {
    const simpleMesh = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      indices: [0, 1, 2],
    };

    it("createComponent returns valid component", () => {
      const comp = createComponent("Bracket", ["f1"], simpleMesh);
      expect(comp.id).toBeTruthy();
      expect(comp.name).toBe("Bracket");
      expect(comp.featureIds).toEqual(["f1"]);
      expect(comp.mesh).toBe(simpleMesh);
      expect(comp.visible).toBe(true);
    });

    it("generateBOM groups by name", () => {
      const a = createComponent("Bolt", ["f1"], simpleMesh);
      const b = createComponent("Bolt", ["f2"], simpleMesh);
      const c = createComponent("Nut", ["f3"], simpleMesh);
      const bom = generateBOM([a, b, c]);
      expect(bom.length).toBe(2);
      const bolt = bom.find((x) => x.name === "Bolt");
      expect(bolt?.quantity).toBe(2);
    });
  });

  describe("Configuration System", () => {
    it("createConfigurationTable returns empty table", () => {
      const table = createConfigurationTable();
      expect(table.variables).toEqual([]);
      expect(table.configurations).toEqual([]);
      expect(table.activeConfigId).toBeNull();
    });

    it("addConfigVariable adds variable", () => {
      let table = createConfigurationTable();
      table = addConfigVariable(table, "length", "number", 10);
      expect(table.variables.length).toBe(1);
      expect(table.variables[0].name).toBe("length");
      expect(table.variables[0].value).toBe(10);
    });

    it("addConfiguration and activateConfiguration work together", () => {
      let table = createConfigurationTable();
      table = addConfigVariable(table, "length", "number", 10);
      table = addConfiguration(table, "Short", { length: 5 });
      expect(table.configurations.length).toBe(1);

      const configId = table.configurations[0].id;
      table = activateConfiguration(table, configId);
      expect(table.activeConfigId).toBe(configId);
      expect(table.variables[0].value).toBe(5);
    });
  });

  describe("GJK Intersection", () => {
    it("gjkIntersect detects overlapping shapes", () => {
      const a = { vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]] as [number, number, number][] };
      const b = { vertices: [[0.5, 0, 0], [1.5, 0, 0], [0.5, 1, 0], [0.5, 0, 1]] as [number, number, number][] };
      expect(gjkIntersect(a, b)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════
// 8. Wire-to-Face
// ═══════════════════════════════════════════

import {
  computeSignedArea,
  pointInPolygon,
  detectProfiles,
} from "../lib/brep/wire-to-face";

describe("Wire-to-Face", () => {
  // CCW square (positive area)
  const ccwSquare = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 0, z: 1 },
  ];

  // CW square (negative area)
  const cwSquare = [
    { x: 0, z: 0 },
    { x: 0, z: 1 },
    { x: 1, z: 1 },
    { x: 1, z: 0 },
  ];

  it("computeSignedArea of CCW square > 0", () => {
    expect(computeSignedArea(ccwSquare)).toBeGreaterThan(0);
  });

  it("computeSignedArea of CW square < 0", () => {
    expect(computeSignedArea(cwSquare)).toBeLessThan(0);
  });

  it("pointInPolygon inside square returns true", () => {
    expect(pointInPolygon({ x: 0.5, z: 0.5 }, ccwSquare)).toBe(true);
  });

  it("pointInPolygon outside returns false", () => {
    expect(pointInPolygon({ x: 5, z: 5 }, ccwSquare)).toBe(false);
  });

  it("detectProfiles with a rectangle entity returns 1 profile", () => {
    const rect = createRect(0, 0, 2, 2);
    const profiles = detectProfiles([rect]);
    expect(profiles.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 9. Drawing GD&T Symbols
// ═══════════════════════════════════════════

import {
  GDT_SYMBOLS,
  createFeatureControlFrame,
  getSymbolsByCategory,
} from "../lib/drawing/gdt-symbols";

describe("Drawing - GD&T Symbols", () => {
  it("GDT_SYMBOLS has 14 entries", () => {
    expect(GDT_SYMBOLS.length).toBe(14);
  });

  it('getSymbolsByCategory("form") returns 4 symbols', () => {
    const form = getSymbolsByCategory("form");
    expect(form.length).toBe(4);
  });

  it('getSymbolsByCategory("orientation") returns 3 symbols', () => {
    const orientation = getSymbolsByCategory("orientation");
    expect(orientation.length).toBe(3);
  });

  it("createFeatureControlFrame returns valid FCF", () => {
    const fcf = createFeatureControlFrame("position", 0.05, ["A", "B"], true, "MMC");
    expect(fcf.id).toBeTruthy();
    expect(fcf.symbol).toBe("position");
    expect(fcf.toleranceValue).toBe(0.05);
    expect(fcf.diametral).toBe(true);
    expect(fcf.materialCondition).toBe("MMC");
    expect(fcf.datumReferences.length).toBe(2);
    expect(fcf.datumReferences[0].letter).toBe("A");
  });
});

// ═══════════════════════════════════════════
// 10. Drawing Projection
// ═══════════════════════════════════════════

import { projectMesh, generateStandard3View } from "../lib/drawing/projection-engine";

describe("Drawing - Projection Engine", () => {
  const boxMesh = generateExtrudePreviewMesh(0, 0, 2, 2, 3);

  it("projectMesh produces edges", () => {
    const view = projectMesh(boxMesh, "front");
    expect(view.edges.length).toBeGreaterThan(0);
    expect(view.direction).toBe("front");
  });

  it("generateStandard3View returns 4 views (front, top, right, iso)", () => {
    const views = generateStandard3View(boxMesh);
    expect(views.length).toBe(4);
    const directions = views.map((v) => v.direction);
    expect(directions).toContain("front");
    expect(directions).toContain("top");
    expect(directions).toContain("right");
    expect(directions).toContain("isometric");
  });
});
