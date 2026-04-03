"use client";

import { useRef, useCallback } from "react";
import { createLine, createSpline } from "@/lib/sketch-entities";
import { useCADDispatch, useCADState } from "@/lib/store";

/**
 * Freehand Drawing — trace lines in space by pinching and moving.
 *
 * When the user pinches and drags, this collects screen positions,
 * projects them to the sketch plane, and creates either:
 * - A series of connected line segments (for straight-ish strokes)
 * - A spline (for smooth curves)
 */

interface FreehandPoint {
  x: number; // sketch coordinates
  z: number;
  time: number;
}

const MIN_SEGMENT_LENGTH = 0.15; // Minimum distance between points to record
const SIMPLIFY_ANGLE_THRESHOLD = 0.15; // Radians — collapse nearly-straight segments

export function useFreehandDraw() {
  const dispatch = useCADDispatch();
  const { sketchPlane } = useCADState();
  const pointsRef = useRef<FreehandPoint[]>([]);
  const isDrawingRef = useRef(false);
  const planeRef = useRef(sketchPlane);
  planeRef.current = sketchPlane;

  const startStroke = useCallback(() => {
    pointsRef.current = [];
    isDrawingRef.current = true;
  }, []);

  const addPoint = useCallback((sketchX: number, sketchZ: number) => {
    if (!isDrawingRef.current) return;

    const points = pointsRef.current;
    const now = performance.now();

    // Skip if too close to last point
    if (points.length > 0) {
      const last = points[points.length - 1];
      const dist = Math.hypot(sketchX - last.x, sketchZ - last.z);
      if (dist < MIN_SEGMENT_LENGTH) return;
    }

    points.push({ x: sketchX, z: sketchZ, time: now });
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = pointsRef.current;
    if (points.length < 2) {
      pointsRef.current = [];
      return;
    }

    // Simplify: remove points that are nearly collinear
    const simplified = simplifyPoints(points);

    if (simplified.length === 2) {
      // Just a line
      const entity = createLine(
        simplified[0].x, simplified[0].z,
        simplified[1].x, simplified[1].z
      );
      (entity as any).plane = planeRef.current;
      dispatch({ type: "ADD_ENTITY", entity });
    } else if (simplified.length >= 3) {
      // Create a spline from the points
      const flat: number[] = [];
      for (const p of simplified) {
        flat.push(p.x, p.z);
      }
      const entity = createSpline(flat);
      (entity as any).plane = planeRef.current;
      dispatch({ type: "ADD_ENTITY", entity });
    }

    pointsRef.current = [];
  }, [dispatch]);

  const isActive = useCallback(() => isDrawingRef.current, []);
  const getPoints = useCallback(() => pointsRef.current, []);

  return { startStroke, addPoint, endStroke, isActive, getPoints };
}

/** Remove nearly-collinear points to simplify a stroke */
function simplifyPoints(points: FreehandPoint[]): FreehandPoint[] {
  if (points.length <= 2) return points;

  const result: FreehandPoint[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const angle1 = Math.atan2(curr.z - prev.z, curr.x - prev.x);
    const angle2 = Math.atan2(next.z - curr.z, next.x - curr.x);
    const angleDiff = Math.abs(angle2 - angle1);

    // Keep point if direction changes significantly
    if (angleDiff > SIMPLIFY_ANGLE_THRESHOLD) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}
