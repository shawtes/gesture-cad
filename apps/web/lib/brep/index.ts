export {
  type BRepTopology,
  type BRepVertex,
  type BRepHalfEdge,
  type BRepEdge,
  type BRepLoop,
  type BRepFace,
  type BRepShell,
  type BRepSolid,
  createBRepTopology,
  mvfs, mev, mef, kemr, kfmrh,
  validateEulerPoincare,
  brepToMesh,
} from "./half-edge";

export {
  type DetectedProfile,
  type Point2D,
  type WireEdge,
  detectProfiles,
  computeSignedArea,
  pointInPolygon,
  profileBounds,
} from "./wire-to-face";
