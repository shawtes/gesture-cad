/**
 * Bone Hierarchy / Armature System
 *
 * Pure math bone hierarchy with local/world matrix propagation.
 * No Three.js dependency — outputs plain objects compatible with THREE.Bone/Skeleton.
 */

// ─── Types ────────────────────────────────────────────────

export interface Bone {
  id: string;
  name: string;
  parentId: string | null;
  head: [number, number, number];
  tail: [number, number, number];
  roll: number;
  children: string[];
  connected: boolean;
  /** Column-major 4x4 flat array */
  localMatrix: number[];
  /** Column-major 4x4 flat array */
  worldMatrix: number[];
}

// ─── Math Helpers ─────────────────────────────────────────

/** Multiply two column-major 4x4 matrices: result = a * b */
export function mat4Multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

/** Create a quaternion from an axis and angle (radians) */
export function quatFromAxisAngle(
  axis: [number, number, number],
  angle: number,
): [number, number, number, number] {
  const halfAngle = angle * 0.5;
  const s = Math.sin(halfAngle);
  const len = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
  if (len < 1e-10) return [0, 0, 0, 1];
  const nx = axis[0] / len;
  const ny = axis[1] / len;
  const nz = axis[2] / len;
  return [nx * s, ny * s, nz * s, Math.cos(halfAngle)];
}

/** Build a 4x4 column-major matrix from translation + quaternion rotation */
export function mat4FromTranslationRotation(
  t: [number, number, number],
  q: [number, number, number, number],
): number[] {
  // Normalize quaternion to prevent non-uniform scale in resulting matrix
  const qLen = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
  const [x, y, z, w] = qLen > 1e-10
    ? [q[0]/qLen, q[1]/qLen, q[2]/qLen, q[3]/qLen]
    : [0, 0, 0, 1];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  return [
    1 - (yy + zz), xy + wz,       xz - wy,       0,
    xy - wz,       1 - (xx + zz), yz + wx,       0,
    xz + wy,       yz - wx,       1 - (xx + yy), 0,
    t[0],           t[1],           t[2],           1,
  ];
}

/** Identity 4x4 matrix (column-major) */
function mat4Identity(): number[] {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/** Compute a bone's local matrix from head, tail, and roll */
function computeBoneLocalMatrix(bone: Bone): number[] {
  const dx = bone.tail[0] - bone.head[0];
  const dy = bone.tail[1] - bone.head[1];
  const dz = bone.tail[2] - bone.head[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-10) return mat4FromTranslationRotation(bone.head, [0, 0, 0, 1]);

  // Y-axis = bone direction
  const yAxis: [number, number, number] = [dx / len, dy / len, dz / len];

  // Choose a reference vector that is not parallel to yAxis
  const ref: [number, number, number] =
    Math.abs(yAxis[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0];

  // Z-axis = cross(yAxis, ref), normalized
  let zx = yAxis[1] * ref[2] - yAxis[2] * ref[1];
  let zy = yAxis[2] * ref[0] - yAxis[0] * ref[2];
  let zz = yAxis[0] * ref[1] - yAxis[1] * ref[0];
  const zLen = Math.sqrt(zx * zx + zy * zy + zz * zz);
  zx /= zLen; zy /= zLen; zz /= zLen;

  // X-axis = cross(yAxis, zAxis)
  let xx = yAxis[1] * zz - yAxis[2] * zy;
  let xy = yAxis[2] * zx - yAxis[0] * zz;
  let xz = yAxis[0] * zy - yAxis[1] * zx;
  const xLen = Math.sqrt(xx * xx + xy * xy + xz * xz);
  xx /= xLen; xy /= xLen; xz /= xLen;

  // Apply roll around Y-axis
  const cr = Math.cos(bone.roll);
  const sr = Math.sin(bone.roll);
  const rxX = xx * cr + zx * sr;
  const rxY = xy * cr + zy * sr;
  const rxZ = xz * cr + zz * sr;
  const rzX = -xx * sr + zx * cr;
  const rzY = -xy * sr + zy * cr;
  const rzZ = -xz * sr + zz * cr;

  // Column-major 4x4
  return [
    rxX,         rxY,         rxZ,         0,
    yAxis[0],    yAxis[1],    yAxis[2],    0,
    rzX,         rzY,         rzZ,         0,
    bone.head[0], bone.head[1], bone.head[2], 1,
  ];
}

// ─── Armature Class ───────────────────────────────────────

let boneIdCounter = 0;

export class Armature {
  bones: Map<string, Bone> = new Map();
  rootBoneIds: string[] = [];

  addBone(
    name: string,
    head: [number, number, number],
    tail: [number, number, number],
    parentId?: string,
  ): Bone {
    const id = `bone_${boneIdCounter++}`;
    const bone: Bone = {
      id,
      name,
      parentId: parentId ?? null,
      head: [...head],
      tail: [...tail],
      roll: 0,
      children: [],
      connected: parentId != null,
      localMatrix: mat4Identity(),
      worldMatrix: mat4Identity(),
    };

    this.bones.set(id, bone);

    if (parentId != null) {
      const parent = this.bones.get(parentId);
      if (parent) {
        parent.children.push(id);
      }
    } else {
      this.rootBoneIds.push(id);
    }

    bone.localMatrix = computeBoneLocalMatrix(bone);
    return bone;
  }

  removeBone(id: string): void {
    const bone = this.bones.get(id);
    if (!bone) return;

    // Reparent children to bone's parent
    for (const childId of bone.children) {
      const child = this.bones.get(childId);
      if (child) {
        child.parentId = bone.parentId;
        if (bone.parentId) {
          const parent = this.bones.get(bone.parentId);
          if (parent) parent.children.push(childId);
        } else {
          this.rootBoneIds.push(childId);
        }
      }
    }

    // Remove from parent's children
    if (bone.parentId) {
      const parent = this.bones.get(bone.parentId);
      if (parent) {
        parent.children = parent.children.filter((c) => c !== id);
      }
    }

    // Remove from root list
    this.rootBoneIds = this.rootBoneIds.filter((r) => r !== id);

    this.bones.delete(id);
  }

  /** Walk from endBoneId to root, returning the chain (end first, root last) */
  getBoneChain(endBoneId: string): Bone[] {
    const chain: Bone[] = [];
    let currentId: string | null = endBoneId;

    while (currentId != null) {
      const bone = this.bones.get(currentId);
      if (!bone) break;
      chain.push(bone);
      currentId = bone.parentId;
    }

    return chain;
  }

  /** Propagate transforms from root bones to leaves (depth-first) */
  updateWorldMatrices(): void {
    const propagate = (boneId: string, parentWorld: number[]): void => {
      const bone = this.bones.get(boneId);
      if (!bone) return;

      bone.localMatrix = computeBoneLocalMatrix(bone);
      bone.worldMatrix = mat4Multiply(parentWorld, bone.localMatrix);

      for (const childId of bone.children) {
        propagate(childId, bone.worldMatrix);
      }
    };

    const identity = mat4Identity();
    for (const rootId of this.rootBoneIds) {
      propagate(rootId, identity);
    }
  }
}

// ─── Three.js Export Utility ──────────────────────────────

export interface ThreeBoneData {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion xyzw
  children: ThreeBoneData[];
}

export function armatureToThreeSkeleton(
  armature: Armature,
): { bones: ThreeBoneData[]; rootBone: ThreeBoneData | null } {
  const boneDataMap = new Map<string, ThreeBoneData>();

  // Create ThreeBoneData for each bone
  for (const [id, bone] of armature.bones) {
    const data: ThreeBoneData = {
      name: bone.name,
      position: [...bone.head],
      rotation: [0, 0, 0, 1],
      children: [],
    };
    boneDataMap.set(id, data);
  }

  // Link parent-child
  for (const [id, bone] of armature.bones) {
    const data = boneDataMap.get(id)!;
    for (const childId of bone.children) {
      const childData = boneDataMap.get(childId);
      if (childData) {
        // Child position relative to parent
        const parent = armature.bones.get(id)!;
        childData.position = [
          childData.position[0] - parent.head[0],
          childData.position[1] - parent.head[1],
          childData.position[2] - parent.head[2],
        ];
        data.children.push(childData);
      }
    }
  }

  const allBones: ThreeBoneData[] = [];
  for (const data of boneDataMap.values()) {
    allBones.push(data);
  }

  const rootBone =
    armature.rootBoneIds.length > 0
      ? boneDataMap.get(armature.rootBoneIds[0]) ?? null
      : null;

  return { bones: allBones, rootBone };
}
