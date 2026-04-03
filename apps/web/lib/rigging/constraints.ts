/**
 * Bone Constraints System
 *
 * Applies motion constraints to bones (copy rotation, limit location, track-to, etc.).
 * Separate from sketch constraints in ../constraints.ts.
 */

import type { Bone, Armature } from './armature';

// ─── Types ────────────────────────────────────────────────

export type BoneConstraintType =
  | 'copy_rotation'
  | 'copy_location'
  | 'copy_scale'
  | 'limit_rotation'
  | 'limit_location'
  | 'track_to'
  | 'damped_track'
  | 'stretch_to';

export interface BoneConstraint {
  id: string;
  type: BoneConstraintType;
  boneId: string;
  targetBoneId?: string;
  /** 0..1 blend factor */
  influence: number;
  params: Record<string, unknown>;
}

// ─── Vector / Matrix Helpers ──────────────────────────────

type Vec3 = [number, number, number];

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vecLerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function vecLength(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vecNormalize(v: Vec3): Vec3 {
  const len = vecLength(v);
  if (len < 1e-10) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Constraint Appliers ──────────────────────────────────

function applyCopyLocation(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  const newHead = vecLerp(bone.head, target.head, influence);
  const offset = vecSub(bone.tail, bone.head);
  return {
    ...bone,
    head: newHead,
    tail: vecAdd(newHead, offset),
  };
}

function applyCopyRotation(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  // Approximate rotation copy via matching bone direction
  const boneDir = vecNormalize(vecSub(bone.tail, bone.head));
  const targetDir = vecNormalize(vecSub(target.tail, target.head));
  const blendedDir = vecNormalize(vecLerp(boneDir, targetDir, influence));
  const boneLen = vecLength(vecSub(bone.tail, bone.head));

  return {
    ...bone,
    tail: vecAdd(bone.head, vecScale(blendedDir, boneLen)),
  };
}

function applyCopyScale(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  const targetLen = vecLength(vecSub(target.tail, target.head));
  const boneLen = vecLength(vecSub(bone.tail, bone.head));
  if (boneLen < 1e-10) return bone;

  const scaleFactor = 1 + (targetLen / boneLen - 1) * influence;
  const dir = vecNormalize(vecSub(bone.tail, bone.head));

  return {
    ...bone,
    tail: vecAdd(bone.head, vecScale(dir, boneLen * scaleFactor)),
  };
}

function applyLimitRotation(
  bone: Bone,
  params: Record<string, unknown>,
  influence: number,
): Bone {
  const minX = (params['minX'] as number) ?? -Math.PI;
  const maxX = (params['maxX'] as number) ?? Math.PI;
  const minY = (params['minY'] as number) ?? -Math.PI;
  const maxY = (params['maxY'] as number) ?? Math.PI;
  const minZ = (params['minZ'] as number) ?? -Math.PI;
  const maxZ = (params['maxZ'] as number) ?? Math.PI;

  const dir = vecSub(bone.tail, bone.head);
  const boneLen = vecLength(dir);
  if (boneLen < 1e-10) return bone;

  // Compute approximate Euler angles from direction
  const n = vecNormalize(dir);
  const pitch = Math.asin(clamp(-n[2], -1, 1));
  const yaw = Math.atan2(n[0], n[1]);

  const clampedPitch = clamp(pitch, minX, maxX);
  const clampedYaw = clamp(yaw, minY, maxY);
  // Roll clamping reserved for future use: clamp(0, minZ, maxZ)

  const blendedPitch = pitch + (clampedPitch - pitch) * influence;
  const blendedYaw = yaw + (clampedYaw - yaw) * influence;

  const newDir: Vec3 = [
    Math.sin(blendedYaw) * Math.cos(blendedPitch) * boneLen,
    Math.cos(blendedYaw) * Math.cos(blendedPitch) * boneLen,
    -Math.sin(blendedPitch) * boneLen,
  ];

  return {
    ...bone,
    tail: vecAdd(bone.head, newDir),
  };
}

function applyLimitLocation(
  bone: Bone,
  params: Record<string, unknown>,
  influence: number,
): Bone {
  const minX = (params['minX'] as number) ?? -Infinity;
  const maxX = (params['maxX'] as number) ?? Infinity;
  const minY = (params['minY'] as number) ?? -Infinity;
  const maxY = (params['maxY'] as number) ?? Infinity;
  const minZ = (params['minZ'] as number) ?? -Infinity;
  const maxZ = (params['maxZ'] as number) ?? Infinity;

  const clamped: Vec3 = [
    clamp(bone.head[0], minX, maxX),
    clamp(bone.head[1], minY, maxY),
    clamp(bone.head[2], minZ, maxZ),
  ];

  const newHead = vecLerp(bone.head, clamped, influence);
  const offset = vecSub(bone.tail, bone.head);

  return {
    ...bone,
    head: newHead,
    tail: vecAdd(newHead, offset),
  };
}

function applyTrackTo(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  const boneLen = vecLength(vecSub(bone.tail, bone.head));
  const toTarget = vecNormalize(vecSub(target.head, bone.head));
  const currentDir = vecNormalize(vecSub(bone.tail, bone.head));
  const blendedDir = vecNormalize(vecLerp(currentDir, toTarget, influence));

  return {
    ...bone,
    tail: vecAdd(bone.head, vecScale(blendedDir, boneLen)),
  };
}

function applyDampedTrack(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  // Damped track is similar to track-to but applies a single rotation
  // to align bone axis with target direction
  return applyTrackTo(bone, target, influence);
}

function applyStretchTo(
  bone: Bone,
  target: Bone,
  influence: number,
): Bone {
  const origDir = vecNormalize(vecSub(bone.tail, bone.head));
  const toTarget = vecSub(target.head, bone.head);
  const targetDir = vecNormalize(toTarget);
  const targetDist = vecLength(toTarget);

  const blendedDir = vecNormalize(vecLerp(origDir, targetDir, influence));
  const origLen = vecLength(vecSub(bone.tail, bone.head));
  const blendedLen = origLen + (targetDist - origLen) * influence;

  return {
    ...bone,
    tail: vecAdd(bone.head, vecScale(blendedDir, blendedLen)),
  };
}

// ─── Public API ───────────────────────────────────────────

/**
 * Apply a single constraint to a bone.
 * Returns a new Bone with updated positions.
 */
export function applyConstraint(
  bone: Bone,
  constraint: BoneConstraint,
  armature: Armature,
): Bone {
  if (constraint.influence <= 0) return bone;

  const target = constraint.targetBoneId
    ? armature.bones.get(constraint.targetBoneId)
    : undefined;

  switch (constraint.type) {
    case 'copy_location':
      if (!target) return bone;
      return applyCopyLocation(bone, target, constraint.influence);

    case 'copy_rotation':
      if (!target) return bone;
      return applyCopyRotation(bone, target, constraint.influence);

    case 'copy_scale':
      if (!target) return bone;
      return applyCopyScale(bone, target, constraint.influence);

    case 'limit_rotation':
      return applyLimitRotation(bone, constraint.params, constraint.influence);

    case 'limit_location':
      return applyLimitLocation(bone, constraint.params, constraint.influence);

    case 'track_to':
      if (!target) return bone;
      return applyTrackTo(bone, target, constraint.influence);

    case 'damped_track':
      if (!target) return bone;
      return applyDampedTrack(bone, target, constraint.influence);

    case 'stretch_to':
      if (!target) return bone;
      return applyStretchTo(bone, target, constraint.influence);

    default:
      return bone;
  }
}

/**
 * Apply all constraints in dependency order.
 * Constraints targeting other bones are applied after the target bone's constraints.
 */
export function applyAllConstraints(
  armature: Armature,
  constraints: BoneConstraint[],
): void {
  // Build dependency graph: bone → constraints that affect it
  const boneConstraints = new Map<string, BoneConstraint[]>();
  for (const c of constraints) {
    const list = boneConstraints.get(c.boneId) ?? [];
    list.push(c);
    boneConstraints.set(c.boneId, list);
  }

  // Topological sort: process bones whose target dependencies are already resolved
  const processed = new Set<string>();
  const queue: string[] = [];

  // Start with bones that have no target dependencies
  for (const [boneId, boneCs] of boneConstraints) {
    const allTargetsResolved = boneCs.every(
      (c) => !c.targetBoneId || !boneConstraints.has(c.targetBoneId),
    );
    if (allTargetsResolved) queue.push(boneId);
  }

  // Also include bones with no constraints
  for (const boneId of armature.bones.keys()) {
    if (!boneConstraints.has(boneId)) {
      processed.add(boneId);
    }
  }

  // Process queue
  const maxIter = constraints.length + armature.bones.size;
  let safetyCounter = 0;

  while (queue.length > 0 && safetyCounter < maxIter) {
    safetyCounter++;
    const boneId = queue.shift()!;
    if (processed.has(boneId)) continue;

    const boneCs = boneConstraints.get(boneId) ?? [];
    let bone = armature.bones.get(boneId);
    if (!bone) continue;

    for (const c of boneCs) {
      bone = applyConstraint(bone, c, armature);
    }

    armature.bones.set(boneId, bone);
    processed.add(boneId);

    // Enqueue bones that depend on this bone
    for (const [depBoneId, depCs] of boneConstraints) {
      if (processed.has(depBoneId)) continue;
      const ready = depCs.every(
        (c) => !c.targetBoneId || processed.has(c.targetBoneId),
      );
      if (ready) queue.push(depBoneId);
    }
  }

  // Handle any remaining (circular dependencies: apply anyway)
  for (const [boneId, boneCs] of boneConstraints) {
    if (processed.has(boneId)) continue;
    let bone = armature.bones.get(boneId);
    if (!bone) continue;
    for (const c of boneCs) {
      bone = applyConstraint(bone, c, armature);
    }
    armature.bones.set(boneId, bone);
  }
}
