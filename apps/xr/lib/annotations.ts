/**
 * 3D Annotation system for XR CAD viewer.
 * Strokes are stored in model-local coordinates so they follow the model
 * when it's moved/rotated/scaled.
 */

import * as THREE from "three";

export interface AnnotationStroke {
  id: string;
  /** Points in model-local space */
  points: THREE.Vector3[];
  color: string;
  lineWidth: number;
  timestamp: number;
}

export interface AnnotationState {
  strokes: AnnotationStroke[];
  activeColor: string;
  activeLineWidth: number;
}

let strokeCounter = 0;

export function createAnnotationState(): AnnotationState {
  return {
    strokes: [],
    activeColor: "#00ffff",
    activeLineWidth: 3,
  };
}

/** Convert world-space points to model-local space using inverse model matrix. */
export function worldToLocal(
  worldPoints: THREE.Vector3[],
  modelMatrixInverse: THREE.Matrix4
): THREE.Vector3[] {
  return worldPoints.map((p) => p.clone().applyMatrix4(modelMatrixInverse));
}

/** Convert model-local points back to world space. */
export function localToWorld(
  localPoints: THREE.Vector3[],
  modelMatrix: THREE.Matrix4
): THREE.Vector3[] {
  return localPoints.map((p) => p.clone().applyMatrix4(modelMatrix));
}

/**
 * Apply Catmull-Rom smoothing to raw hand trajectory points.
 * Reduces MediaPipe/WebXR joint tracking noise (~3mm σ).
 */
export function smoothStroke(
  rawPoints: THREE.Vector3[],
  subdivisions: number = 3
): THREE.Vector3[] {
  if (rawPoints.length < 2) return rawPoints;
  if (rawPoints.length === 2) return rawPoints;

  const curve = new THREE.CatmullRomCurve3(rawPoints);
  const totalPoints = Math.max(rawPoints.length * subdivisions, 10);
  return curve.getPoints(totalPoints);
}

/**
 * Simplify a stroke by removing points that are too close together.
 * Reduces vertex count while preserving shape.
 */
export function simplifyStroke(
  points: THREE.Vector3[],
  minDistance: number = 0.003 // 3mm
): THREE.Vector3[] {
  if (points.length <= 2) return points;

  const result: THREE.Vector3[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].distanceTo(result[result.length - 1]) >= minDistance) {
      result.push(points[i]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/** Create a finished stroke from raw points. */
export function finalizeStroke(
  rawPoints: THREE.Vector3[],
  color: string,
  lineWidth: number,
  modelMatrixInverse?: THREE.Matrix4
): AnnotationStroke | null {
  if (rawPoints.length < 2) return null;

  // Simplify → smooth
  const simplified = simplifyStroke(rawPoints);
  const smoothed = smoothStroke(simplified);

  // Convert to model-local if model matrix provided
  const finalPoints = modelMatrixInverse
    ? worldToLocal(smoothed, modelMatrixInverse)
    : smoothed;

  return {
    id: `stroke_${++strokeCounter}_${Date.now()}`,
    points: finalPoints,
    color,
    lineWidth,
    timestamp: Date.now(),
  };
}

export const COLOR_PALETTE = [
  "#00ffff", // cyan (default)
  "#ff3366", // red-pink
  "#33ff66", // green
  "#ffcc00", // yellow
  "#ff6633", // orange
  "#cc33ff", // purple
  "#3399ff", // blue
  "#ffffff", // white
];

/** Measure distance between two 3D points. */
export function measure3D(
  pointA: THREE.Vector3,
  pointB: THREE.Vector3
): { distance: number; midpoint: THREE.Vector3; direction: THREE.Vector3 } {
  const distance = pointA.distanceTo(pointB);
  const midpoint = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(pointB, pointA).normalize();
  return { distance, midpoint, direction };
}
