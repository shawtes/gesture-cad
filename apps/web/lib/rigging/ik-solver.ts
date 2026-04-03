/**
 * Inverse Kinematics Solvers
 *
 * Two IK solvers: CCD (Cyclic Coordinate Descent) and FABRIK
 * (Forward And Backward Reaching IK). Pure math, no Three.js.
 */

import type { Bone } from './armature';

// ─── Vector Utilities ─────────────────────────────────────

type Vec3 = [number, number, number];

export function vecSubtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vecCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function vecDistance(a: Vec3, b: Vec3): number {
  return vecLength(vecSubtract(a, b));
}

export function vecNormalize(v: Vec3): Vec3 {
  const len = vecLength(v);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function vecLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// ─── Internal Helpers ─────────────────────────────────────

/** Rotate a point around an axis through origin by angle (radians) using Rodrigues */
function rotatePointAroundAxis(
  point: Vec3,
  axis: Vec3,
  angle: number,
): Vec3 {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const k = vecNormalize(axis);
  const dot = vecDot(k, point);
  const cross = vecCross(k, point);

  return [
    point[0] * cosA + cross[0] * sinA + k[0] * dot * (1 - cosA),
    point[1] * cosA + cross[1] * sinA + k[1] * dot * (1 - cosA),
    point[2] * cosA + cross[2] * sinA + k[2] * dot * (1 - cosA),
  ];
}

/** Deep-clone a bone array so we don't mutate originals */
function cloneBones(bones: Bone[]): Bone[] {
  return bones.map((b) => ({
    ...b,
    head: [...b.head] as Vec3,
    tail: [...b.tail] as Vec3,
    children: [...b.children],
    localMatrix: [...b.localMatrix],
    worldMatrix: [...b.worldMatrix],
  }));
}

// ─── CCD Solver ───────────────────────────────────────────

/**
 * Cyclic Coordinate Descent IK.
 *
 * Iterates from the end effector toward the root. For each bone,
 * rotates it so the end effector moves closer to the target.
 *
 * @param bones - Bone chain ordered from root (index 0) to end effector (last).
 * @param targetPos - Target position in world space.
 * @param iterations - Max solver iterations (default 10).
 * @param tolerance - Distance threshold to stop early (default 0.001).
 * @returns Updated bone array with new head/tail positions.
 */
export function solveCCD(
  bones: Bone[],
  targetPos: Vec3,
  iterations: number = 10,
  tolerance: number = 0.001,
): Bone[] {
  if (bones.length === 0) return [];

  const result = cloneBones(bones);

  for (let iter = 0; iter < iterations; iter++) {
    const endEffector = result[result.length - 1].tail;
    if (vecDistance(endEffector, targetPos) < tolerance) break;

    // Iterate from end-effector bone back to root
    for (let i = result.length - 1; i >= 0; i--) {
      const bone = result[i];
      const pivot = bone.head;

      const currentEnd = result[result.length - 1].tail;
      const toEnd = vecSubtract(currentEnd, pivot);
      const toTarget = vecSubtract(targetPos, pivot);

      const toEndNorm = vecNormalize(toEnd);
      const toTargetNorm = vecNormalize(toTarget);

      // Compute rotation axis and angle
      const dot = Math.max(-1, Math.min(1, vecDot(toEndNorm, toTargetNorm)));
      const angle = Math.acos(dot);

      if (angle < 1e-6) continue;

      const axis = vecCross(toEndNorm, toTargetNorm);
      if (vecLength(axis) < 1e-10) continue;

      // Rotate all bones from i onward
      for (let j = i; j < result.length; j++) {
        const b = result[j];
        if (j > i || !bone.connected) {
          // Rotate head around pivot
          const relHead = vecSubtract(b.head, pivot);
          const rotHead = rotatePointAroundAxis(relHead, axis, angle);
          b.head = vecAdd(pivot, rotHead);
        }
        // Rotate tail around pivot
        const relTail = vecSubtract(b.tail, pivot);
        const rotTail = rotatePointAroundAxis(relTail, axis, angle);
        b.tail = vecAdd(pivot, rotTail);
      }
    }
  }

  return result;
}

// ─── FABRIK Solver ────────────────────────────────────────

/**
 * Forward And Backward Reaching IK (FABRIK).
 *
 * Forward pass: move end effector to target, propagate backward.
 * Backward pass: restore root position, propagate forward.
 *
 * @param bones - Bone chain ordered from root (index 0) to end effector (last).
 * @param targetPos - Target position in world space.
 * @param iterations - Max solver iterations (default 10).
 * @param tolerance - Distance threshold to stop early (default 0.001).
 * @returns Updated bone array with new head/tail positions.
 */
export function solveFABRIK(
  bones: Bone[],
  targetPos: Vec3,
  iterations: number = 10,
  tolerance: number = 0.001,
): Bone[] {
  if (bones.length === 0) return [];

  const result = cloneBones(bones);

  // Build joint positions: head of each bone + tail of last bone
  const joints: Vec3[] = [];
  for (const bone of result) {
    joints.push([...bone.head]);
  }
  joints.push([...result[result.length - 1].tail]);

  // Compute segment lengths
  const lengths: number[] = [];
  for (let i = 0; i < joints.length - 1; i++) {
    lengths.push(vecDistance(joints[i], joints[i + 1]));
  }

  const rootPos: Vec3 = [...joints[0]];

  for (let iter = 0; iter < iterations; iter++) {
    const endIdx = joints.length - 1;
    if (vecDistance(joints[endIdx], targetPos) < tolerance) break;

    // ── Forward pass: move end to target, propagate toward root ──
    joints[endIdx] = [...targetPos];
    for (let i = endIdx - 1; i >= 0; i--) {
      const dir = vecNormalize(vecSubtract(joints[i], joints[i + 1]));
      joints[i] = vecAdd(joints[i + 1], vecScale(dir, lengths[i]));
    }

    // ── Backward pass: restore root, propagate toward end ──
    joints[0] = [...rootPos];
    for (let i = 0; i < endIdx; i++) {
      const dir = vecNormalize(vecSubtract(joints[i + 1], joints[i]));
      joints[i + 1] = vecAdd(joints[i], vecScale(dir, lengths[i]));
    }
  }

  // Write joint positions back to bones
  for (let i = 0; i < result.length; i++) {
    result[i].head = [...joints[i]];
    result[i].tail = [...joints[i + 1]];
  }

  return result;
}
