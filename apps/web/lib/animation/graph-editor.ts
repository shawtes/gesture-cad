// Bezier curve logic for graph editor

import type { Keyframe } from './timeline';

export interface CurvePoint {
  time: number;
  value: number;
  inHandle: [number, number];
  outHandle: [number, number];
}

/**
 * Evaluate a cubic bezier segment given four control point values and parameter t in [0,1].
 */
export function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;
  return oneMinusT3 * p0 + 3 * oneMinusT2 * t * p1 + 3 * oneMinusT * t2 * p2 + t3 * p3;
}

/**
 * Evaluate a piecewise bezier curve defined by an array of CurvePoints at parameter t (in time units).
 * Uses the outHandle of the left point and inHandle of the right point as bezier control offsets.
 */
export function evaluateBezierCurve(points: CurvePoint[], t: number): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].value;

  // Clamp to range
  if (t <= points[0].time) return points[0].value;
  if (t >= points[points.length - 1].time) return points[points.length - 1].value;

  // Find the segment containing t
  let segIdx = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (t >= points[i].time && t <= points[i + 1].time) {
      segIdx = i;
      break;
    }
  }

  const left = points[segIdx];
  const right = points[segIdx + 1];
  const dt = right.time - left.time;
  if (dt <= 0) return left.value;

  const localT = (t - left.time) / dt;

  // Bezier control points in value space
  const p0 = left.value;
  const p1 = left.value + left.outHandle[1];
  const p2 = right.value + right.inHandle[1];
  const p3 = right.value;

  return cubicBezier(p0, p1, p2, p3, localT);
}

/**
 * Convert an array of Keyframes to CurvePoints suitable for the graph editor.
 */
export function fitBezierToKeyframes(keyframes: Keyframe[]): CurvePoint[] {
  return keyframes.map((kf) => ({
    time: kf.time,
    value: kf.value,
    inHandle: [kf.inTangent[0], kf.inTangent[1]],
    outHandle: [kf.outTangent[0], kf.outTangent[1]],
  }));
}

/**
 * Sample a bezier curve at evenly spaced intervals.
 * Returns an array of `samples` values from startTime to endTime (inclusive).
 */
export function sampleCurve(
  points: CurvePoint[],
  startTime: number,
  endTime: number,
  samples: number
): number[] {
  if (samples < 1) return [];
  if (samples === 1) return [evaluateBezierCurve(points, startTime)];

  const result: number[] = [];
  const step = (endTime - startTime) / (samples - 1);

  for (let i = 0; i < samples; i++) {
    const t = startTime + step * i;
    result.push(evaluateBezierCurve(points, t));
  }

  return result;
}
