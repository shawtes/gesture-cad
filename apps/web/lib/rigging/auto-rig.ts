/**
 * Auto-Rigging System
 *
 * Automatic humanoid skeleton placement and VRM bone mapping.
 * Uses mesh bounding box to estimate body proportions.
 */

import type { HalfEdgeMesh } from '../mesh/half-edge';
import { Armature } from './armature';
import type { SkinWeightData } from '../skinning/weight-paint';
import { autoWeight } from '../skinning/weight-paint';

// ─── VRM Standard Bone Names ──────────────────────────────

export const VRM_BONE_NAMES: readonly string[] = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftEye',
  'rightEye',
  'jaw',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
  // Finger bones
  'leftThumbProximal',
  'leftThumbIntermediate',
  'leftThumbDistal',
  'leftIndexProximal',
  'leftIndexIntermediate',
  'leftIndexDistal',
  'leftMiddleProximal',
  'leftMiddleIntermediate',
  'leftMiddleDistal',
  'leftRingProximal',
  'leftRingIntermediate',
  'leftRingDistal',
  'leftLittleProximal',
  'leftLittleIntermediate',
  'leftLittleDistal',
  'rightThumbProximal',
  'rightThumbIntermediate',
  'rightThumbDistal',
  'rightIndexProximal',
  'rightIndexIntermediate',
  'rightIndexDistal',
  'rightMiddleProximal',
  'rightMiddleIntermediate',
  'rightMiddleDistal',
  'rightRingProximal',
  'rightRingIntermediate',
  'rightRingDistal',
  'rightLittleProximal',
  'rightLittleIntermediate',
  'rightLittleDistal',
] as const;

// ─── Mesh Bounding Box ───────────────────────────────────

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

function computeBoundingBox(mesh: HalfEdgeMesh): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const v of mesh.vertices.values()) {
    const [x, y, z] = v.position;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  if (!isFinite(minX)) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

// ─── Auto-Rig Humanoid ──────────────────────────────────

/**
 * Auto-rig a humanoid mesh by detecting rough body proportions from
 * the bounding box and placing a standard humanoid skeleton.
 *
 * Assumes Y-up, mesh facing -Z, with origin at feet or center.
 */
export function autoRigHumanoid(
  mesh: HalfEdgeMesh,
): { armature: Armature; weights: SkinWeightData } {
  const bb = computeBoundingBox(mesh);
  const armature = new Armature();

  const cx = bb.center[0];
  const cz = bb.center[2];
  const height = bb.size[1];
  const bottom = bb.min[1];
  const width = bb.size[0];

  // Proportional placement (based on standard human proportions)
  const hipsY = bottom + height * 0.52;
  const spineY = bottom + height * 0.58;
  const chestY = bottom + height * 0.68;
  const neckY = bottom + height * 0.82;
  const headTopY = bottom + height;
  const shoulderY = bottom + height * 0.78;
  const elbowY = bottom + height * 0.62;
  const handY = bottom + height * 0.45;
  const kneeY = bottom + height * 0.28;
  const footY = bottom;
  const toeY = bottom;

  const shoulderSpread = width * 0.35;
  const hipSpread = width * 0.15;
  const toeForward = height * 0.08;

  // ─── Spine chain ───────────────────────────────
  const hips = armature.addBone(
    'hips',
    [cx, hipsY, cz],
    [cx, spineY, cz],
  );
  const spine = armature.addBone(
    'spine',
    [cx, spineY, cz],
    [cx, chestY, cz],
    hips.id,
  );
  const chest = armature.addBone(
    'chest',
    [cx, chestY, cz],
    [cx, shoulderY, cz],
    spine.id,
  );
  const neck = armature.addBone(
    'neck',
    [cx, neckY, cz],
    [cx, neckY + (headTopY - neckY) * 0.3, cz],
    chest.id,
  );
  armature.addBone(
    'head',
    [cx, neckY + (headTopY - neckY) * 0.3, cz],
    [cx, headTopY, cz],
    neck.id,
  );

  // ─── Left arm ──────────────────────────────────
  const lShoulder = armature.addBone(
    'leftShoulder',
    [cx, shoulderY, cz],
    [cx + shoulderSpread * 0.4, shoulderY, cz],
    chest.id,
  );
  const lUpperArm = armature.addBone(
    'leftUpperArm',
    [cx + shoulderSpread * 0.4, shoulderY, cz],
    [cx + shoulderSpread, elbowY, cz],
    lShoulder.id,
  );
  const lForearm = armature.addBone(
    'leftLowerArm',
    [cx + shoulderSpread, elbowY, cz],
    [cx + shoulderSpread * 1.1, handY, cz],
    lUpperArm.id,
  );
  armature.addBone(
    'leftHand',
    [cx + shoulderSpread * 1.1, handY, cz],
    [cx + shoulderSpread * 1.15, handY - height * 0.04, cz],
    lForearm.id,
  );

  // ─── Right arm ─────────────────────────────────
  const rShoulder = armature.addBone(
    'rightShoulder',
    [cx, shoulderY, cz],
    [cx - shoulderSpread * 0.4, shoulderY, cz],
    chest.id,
  );
  const rUpperArm = armature.addBone(
    'rightUpperArm',
    [cx - shoulderSpread * 0.4, shoulderY, cz],
    [cx - shoulderSpread, elbowY, cz],
    rShoulder.id,
  );
  const rForearm = armature.addBone(
    'rightLowerArm',
    [cx - shoulderSpread, elbowY, cz],
    [cx - shoulderSpread * 1.1, handY, cz],
    rUpperArm.id,
  );
  armature.addBone(
    'rightHand',
    [cx - shoulderSpread * 1.1, handY, cz],
    [cx - shoulderSpread * 1.15, handY - height * 0.04, cz],
    rForearm.id,
  );

  // ─── Left leg ──────────────────────────────────
  const lThigh = armature.addBone(
    'leftUpperLeg',
    [cx + hipSpread, hipsY, cz],
    [cx + hipSpread, kneeY, cz],
    hips.id,
  );
  const lShin = armature.addBone(
    'leftLowerLeg',
    [cx + hipSpread, kneeY, cz],
    [cx + hipSpread, footY, cz],
    lThigh.id,
  );
  const lFoot = armature.addBone(
    'leftFoot',
    [cx + hipSpread, footY, cz],
    [cx + hipSpread, footY, cz - toeForward],
    lShin.id,
  );
  armature.addBone(
    'leftToes',
    [cx + hipSpread, toeY, cz - toeForward],
    [cx + hipSpread, toeY, cz - toeForward * 1.5],
    lFoot.id,
  );

  // ─── Right leg ─────────────────────────────────
  const rThigh = armature.addBone(
    'rightUpperLeg',
    [cx - hipSpread, hipsY, cz],
    [cx - hipSpread, kneeY, cz],
    hips.id,
  );
  const rShin = armature.addBone(
    'rightLowerLeg',
    [cx - hipSpread, kneeY, cz],
    [cx - hipSpread, footY, cz],
    rThigh.id,
  );
  const rFoot = armature.addBone(
    'rightFoot',
    [cx - hipSpread, footY, cz],
    [cx - hipSpread, footY, cz - toeForward],
    rShin.id,
  );
  armature.addBone(
    'rightToes',
    [cx - hipSpread, toeY, cz - toeForward],
    [cx - hipSpread, toeY, cz - toeForward * 1.5],
    rFoot.id,
  );

  // Update world matrices
  armature.updateWorldMatrices();

  // Auto-generate skin weights
  const weights = autoWeight(mesh, armature);

  return { armature, weights };
}

// ─── VRM Bone Mapping ─────────────────────────────────────

/** Common name aliases to VRM standard names */
const NAME_ALIASES: Record<string, string> = {
  hips: 'hips',
  pelvis: 'hips',
  spine: 'spine',
  spine1: 'chest',
  chest: 'chest',
  upperchest: 'upperChest',
  neck: 'neck',
  head: 'head',
  lefteye: 'leftEye',
  righteye: 'rightEye',
  jaw: 'jaw',
  leftshoulder: 'leftShoulder',
  leftupperarm: 'leftUpperArm',
  leftlowerarm: 'leftLowerArm',
  leftforearm: 'leftLowerArm',
  lefthand: 'leftHand',
  rightshoulder: 'rightShoulder',
  rightupperarm: 'rightUpperArm',
  rightlowerarm: 'rightLowerArm',
  rightforearm: 'rightLowerArm',
  righthand: 'rightHand',
  leftupperleg: 'leftUpperLeg',
  leftthigh: 'leftUpperLeg',
  leftlowerleg: 'leftLowerLeg',
  leftshin: 'leftLowerLeg',
  leftfoot: 'leftFoot',
  lefttoes: 'leftToes',
  rightupperleg: 'rightUpperLeg',
  rightthigh: 'rightUpperLeg',
  rightlowerleg: 'rightLowerLeg',
  rightshin: 'rightLowerLeg',
  rightfoot: 'rightFoot',
  righttoes: 'rightToes',
};

/**
 * Map armature bone names to VRM standard bone names.
 * Returns Map<armatureBoneName, vrmBoneName>.
 */
export function mapToVRMBones(armature: Armature): Map<string, string> {
  const result = new Map<string, string>();

  for (const bone of armature.bones.values()) {
    const normalized = bone.name.toLowerCase().replace(/[\s_.-]/g, '');
    const vrmName = NAME_ALIASES[normalized];
    if (vrmName) {
      result.set(bone.name, vrmName);
    }
  }

  return result;
}
