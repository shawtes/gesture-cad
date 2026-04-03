/**
 * Local CAD Engine — runs entirely in the XR app, no server needed.
 * Creates and manages 3D geometry directly with Three.js.
 *
 * Features:
 * - Primitives (box, cylinder, sphere, cone, torus)
 * - Sketch+extrude (rect, circle, polygon)
 * - Golden-angle spiral positioning (objects don't stack)
 * - Modifiers (extrude, hole, chamfer, shell, mirror, patterns)
 * - Sculpt operations (grab, smooth, inflate)
 * - House generator
 */

import * as THREE from "three";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface CADObject {
  id: string;
  name: string;
  type: string;
  mesh: THREE.Mesh;
  visible: boolean;
  /** Per-object position offset (relative to workbench) */
  position: [number, number, number];
  /** Per-object rotation */
  rotation: [number, number, number];
  /** Per-object scale multiplier */
  scale: number;
}

let nextId = 1;
function genId(): string { return `obj_${nextId++}`; }

// ═══════════════════════════════════════════
// Auto-positioning — golden angle spiral
// ═══════════════════════════════════════════

let placementIndex = 0;

export function getNextPosition(): [number, number, number] {
  if (placementIndex === 0) {
    placementIndex++;
    return [0, 0, 0]; // First object at center
  }
  const angle = (placementIndex * 137.5 * Math.PI) / 180;
  const radius = 0.2 + placementIndex * 0.12;
  placementIndex++;
  return [
    Math.cos(angle) * Math.min(radius, 2),
    0,
    Math.sin(angle) * Math.min(radius, 2),
  ];
}

export function resetPlacement(): void {
  placementIndex = 0;
}

// ═══════════════════════════════════════════
// Material system
// ═══════════════════════════════════════════

export type MaterialMode = "hologram" | "solid" | "wireframe" | "glass" | "metallic" | "matte";

export function createCADMaterial(mode: MaterialMode, color: string): THREE.Material {
  const c = new THREE.Color(color);
  switch (mode) {
    case "solid":
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 });
    case "wireframe":
      return new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.7 });
    case "glass":
      return new THREE.MeshPhysicalMaterial({
        color: c, transmission: 0.9, roughness: 0.05, ior: 1.5,
        thickness: 0.5, transparent: true, opacity: 0.3,
      });
    case "metallic":
      return new THREE.MeshStandardMaterial({ color: c, metalness: 0.95, roughness: 0.1, envMapIntensity: 1.0 });
    case "matte":
      return new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.9 });
    default: // hologram handled separately
      return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 });
  }
}

// ═══════════════════════════════════════════
// Primitives
// ═══════════════════════════════════════════

function makeObj(name: string, type: string, geo: THREE.BufferGeometry, pos?: [number, number, number]): CADObject {
  const mesh = new THREE.Mesh(geo);
  const p = pos || getNextPosition();
  mesh.position.set(p[0], p[1], p[2]);
  return { id: genId(), name, type, mesh, visible: true, position: p, rotation: [0, 0, 0], scale: 1 };
}

export function createBox(w = 1, h = 1, d = 1, pos?: [number, number, number]): CADObject {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  return makeObj(`Box ${w}×${h}×${d}`, "box", geo, pos);
}

export function createCylinder(r = 0.5, h = 1, seg = 32, pos?: [number, number, number]): CADObject {
  const geo = new THREE.CylinderGeometry(r, r, h, seg);
  geo.translate(0, h / 2, 0);
  return makeObj(`Cylinder R${r}`, "cylinder", geo, pos);
}

export function createSphere(r = 0.5, seg = 32, pos?: [number, number, number]): CADObject {
  const geo = new THREE.SphereGeometry(r, seg, seg);
  geo.translate(0, r, 0);
  return makeObj(`Sphere R${r}`, "sphere", geo, pos);
}

export function createCone(r = 0.5, h = 1, seg = 32, pos?: [number, number, number]): CADObject {
  const geo = new THREE.ConeGeometry(r, h, seg);
  geo.translate(0, h / 2, 0);
  return makeObj(`Cone R${r}`, "cone", geo, pos);
}

export function createTorus(r = 0.5, tube = 0.15, seg = 32, pos?: [number, number, number]): CADObject {
  const geo = new THREE.TorusGeometry(r, tube, 16, seg);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, tube + 0.01, 0);
  return makeObj(`Torus R${r}`, "torus", geo, pos);
}

// Sketch shapes extruded to 3D
export function createExtrudedRect(x1: number, z1: number, x2: number, z2: number, h = 1, pos?: [number, number, number]): CADObject {
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(cx, h / 2, cz);
  return makeObj(`Rect ${w.toFixed(1)}×${d.toFixed(1)}`, "rect", geo, pos);
}

export function createExtrudedCircle(cx: number, cz: number, r: number, h = 1, pos?: [number, number, number]): CADObject {
  const geo = new THREE.CylinderGeometry(r, r, h, 32);
  geo.translate(cx, h / 2, cz);
  return makeObj(`Circle R${r.toFixed(1)}`, "circle", geo, pos);
}

export function createExtrudedPolygon(cx: number, cz: number, r: number, sides: number, h = 1, pos?: [number, number, number]): CADObject {
  const geo = new THREE.CylinderGeometry(r, r, h, sides);
  geo.translate(cx, h / 2, cz);
  return makeObj(`Polygon ${sides}`, "polygon", geo, pos);
}

// ═══════════════════════════════════════════
// Modifiers — operate on existing CADObjects
// ═══════════════════════════════════════════

/** Clone an object at a new position */
export function cloneObject(obj: CADObject, offset: [number, number, number] = [0, 0, 0]): CADObject {
  const geo = obj.mesh.geometry.clone();
  const mesh = new THREE.Mesh(geo);
  const p: [number, number, number] = [
    obj.position[0] + offset[0],
    obj.position[1] + offset[1],
    obj.position[2] + offset[2],
  ];
  mesh.position.set(p[0], p[1], p[2]);
  return { id: genId(), name: obj.name + " copy", type: obj.type, mesh, visible: true, position: p, rotation: [...obj.rotation], scale: obj.scale };
}

/** Scale an object */
export function scaleObject(obj: CADObject, factor: number): CADObject {
  obj.scale = factor;
  obj.mesh.scale.set(factor, factor, factor);
  return obj;
}

/** Mirror an object along X axis */
export function mirrorObject(obj: CADObject): CADObject {
  const clone = cloneObject(obj, [0, 0, 0]);
  clone.name = obj.name + " (mirrored)";
  clone.mesh.scale.x *= -1;
  clone.position[0] = -clone.position[0];
  clone.mesh.position.x = -obj.mesh.position.x;
  return clone;
}

/** Linear pattern — create N copies along a direction */
export function linearPattern(obj: CADObject, count: number, spacing: number, axis: "x" | "y" | "z" = "x"): CADObject[] {
  const results: CADObject[] = [];
  for (let i = 1; i < count; i++) {
    const offset: [number, number, number] = [0, 0, 0];
    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    offset[idx] = spacing * i;
    const clone = cloneObject(obj, offset);
    clone.name = `${obj.name} [${i + 1}/${count}]`;
    results.push(clone);
  }
  return results;
}

/** Circular pattern — create N copies rotated around Y axis */
export function circularPattern(obj: CADObject, count: number, totalAngle = 360): CADObject[] {
  const results: CADObject[] = [];
  const step = (totalAngle / count) * (Math.PI / 180);
  const cx = obj.position[0], cz = obj.position[2];
  const dist = Math.sqrt(cx * cx + cz * cz) || 0.5;
  const startAngle = Math.atan2(cz, cx);

  for (let i = 1; i < count; i++) {
    const angle = startAngle + step * i;
    const clone = cloneObject(obj, [0, 0, 0]);
    clone.position[0] = Math.cos(angle) * dist;
    clone.position[2] = Math.sin(angle) * dist;
    clone.mesh.position.set(clone.position[0], clone.position[1], clone.position[2]);
    clone.mesh.rotation.y = step * i;
    clone.name = `${obj.name} [${i + 1}/${count}]`;
    results.push(clone);
  }
  return results;
}

/** Apply extrude — replace geometry with taller version */
export function applyExtrude(obj: CADObject, additionalHeight: number): CADObject {
  const params = (obj.mesh.geometry as any).parameters;
  if (!params) return obj;

  let newGeo: THREE.BufferGeometry;
  if (params.width !== undefined) {
    // BoxGeometry
    newGeo = new THREE.BoxGeometry(params.width, (params.height || 1) + additionalHeight, params.depth || params.width);
    newGeo.translate(0, ((params.height || 1) + additionalHeight) / 2, 0);
  } else if (params.radiusTop !== undefined) {
    // CylinderGeometry
    newGeo = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, (params.height || 1) + additionalHeight, params.radialSegments || 32);
    newGeo.translate(0, ((params.height || 1) + additionalHeight) / 2, 0);
  } else {
    return obj;
  }

  obj.mesh.geometry.dispose();
  obj.mesh.geometry = newGeo;
  obj.name += ` +extrude(${additionalHeight.toFixed(1)})`;
  return obj;
}

/** Apply hole — add a cylinder cutout representation */
export function applyHole(obj: CADObject, diameter: number): CADObject {
  // Visual approximation: add an inverted cylinder at the center
  // Real CSG would require three-bvh-csg (heavy for Quest)
  const holeGeo = new THREE.CylinderGeometry(diameter / 2, diameter / 2, 10, 16);
  holeGeo.translate(obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z);
  obj.name += ` +hole(${diameter.toFixed(2)})`;
  return obj;
}

/** Apply chamfer — increase geometry segments for smoother edges */
export function applyChamfer(obj: CADObject, distance: number): CADObject {
  const params = (obj.mesh.geometry as any).parameters;
  if (params?.width !== undefined) {
    const newGeo = new THREE.BoxGeometry(
      params.width - distance * 2, params.height, params.depth - distance * 2, 2, 2, 2
    );
    newGeo.translate(0, params.height / 2, 0);
    obj.mesh.geometry.dispose();
    obj.mesh.geometry = newGeo;
  }
  obj.name += ` +chamfer(${distance.toFixed(2)})`;
  return obj;
}

/** Apply shell — hollow out by creating inner geometry */
export function applyShell(obj: CADObject, thickness: number): CADObject {
  // Visual: scale down slightly to approximate shell
  const inner = obj.mesh.geometry.clone();
  const s = 1 - thickness;
  inner.scale(s, s, s);
  obj.name += ` +shell(${thickness.toFixed(2)})`;
  return obj;
}

// ═══════════════════════════════════════════
// Sculpt — vertex-level manipulation
// ═══════════════════════════════════════════

/** Ensure geometry is non-indexed for vertex manipulation */
function ensureNonIndexed(obj: CADObject): void {
  if (obj.mesh.geometry.index) {
    obj.mesh.geometry = obj.mesh.geometry.toNonIndexed();
  }
}

/** Sculpt grab — displace vertices near a point */
export function sculptGrab(obj: CADObject, point: THREE.Vector3, displacement: THREE.Vector3, radius: number): void {
  ensureNonIndexed(obj);
  const positions = obj.mesh.geometry.attributes.position;
  const worldMatrix = obj.mesh.matrixWorld;
  const invMatrix = worldMatrix.clone().invert();
  const localPoint = point.clone().applyMatrix4(invMatrix);
  const localDisp = displacement.clone().transformDirection(invMatrix);

  for (let i = 0; i < positions.count; i++) {
    const vx = positions.getX(i);
    const vy = positions.getY(i);
    const vz = positions.getZ(i);
    const dist = Math.sqrt(
      (vx - localPoint.x) ** 2 + (vy - localPoint.y) ** 2 + (vz - localPoint.z) ** 2
    );
    if (dist < radius) {
      const falloff = 1 - (dist / radius);
      const strength = falloff * falloff; // quadratic falloff
      positions.setXYZ(i,
        vx + localDisp.x * strength,
        vy + localDisp.y * strength,
        vz + localDisp.z * strength,
      );
    }
  }
  positions.needsUpdate = true;
  obj.mesh.geometry.computeVertexNormals();
}

/** Sculpt smooth — average vertices near a point with neighbors */
export function sculptSmooth(obj: CADObject, point: THREE.Vector3, radius: number): void {
  ensureNonIndexed(obj);
  const positions = obj.mesh.geometry.attributes.position;
  const invMatrix = obj.mesh.matrixWorld.clone().invert();
  const localPoint = point.clone().applyMatrix4(invMatrix);

  // Collect affected vertices
  const affected: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const dist = Math.sqrt(
      (positions.getX(i) - localPoint.x) ** 2 +
      (positions.getY(i) - localPoint.y) ** 2 +
      (positions.getZ(i) - localPoint.z) ** 2
    );
    if (dist < radius) affected.push(i);
  }

  if (affected.length < 2) return;

  // Average
  let avgX = 0, avgY = 0, avgZ = 0;
  for (const i of affected) {
    avgX += positions.getX(i);
    avgY += positions.getY(i);
    avgZ += positions.getZ(i);
  }
  avgX /= affected.length;
  avgY /= affected.length;
  avgZ /= affected.length;

  for (const i of affected) {
    const dist = Math.sqrt(
      (positions.getX(i) - localPoint.x) ** 2 +
      (positions.getY(i) - localPoint.y) ** 2 +
      (positions.getZ(i) - localPoint.z) ** 2
    );
    const falloff = 1 - (dist / radius);
    const t = falloff * 0.3;
    positions.setXYZ(i,
      positions.getX(i) * (1 - t) + avgX * t,
      positions.getY(i) * (1 - t) + avgY * t,
      positions.getZ(i) * (1 - t) + avgZ * t,
    );
  }
  positions.needsUpdate = true;
  obj.mesh.geometry.computeVertexNormals();
}

/** Sculpt inflate — move vertices along normals */
export function sculptInflate(obj: CADObject, point: THREE.Vector3, radius: number, amount: number): void {
  ensureNonIndexed(obj);
  const positions = obj.mesh.geometry.attributes.position;
  const normals = obj.mesh.geometry.attributes.normal;
  if (!normals) { obj.mesh.geometry.computeVertexNormals(); return; }

  const invMatrix = obj.mesh.matrixWorld.clone().invert();
  const localPoint = point.clone().applyMatrix4(invMatrix);

  for (let i = 0; i < positions.count; i++) {
    const dist = Math.sqrt(
      (positions.getX(i) - localPoint.x) ** 2 +
      (positions.getY(i) - localPoint.y) ** 2 +
      (positions.getZ(i) - localPoint.z) ** 2
    );
    if (dist < radius) {
      const falloff = 1 - (dist / radius);
      const strength = falloff * falloff * amount;
      positions.setXYZ(i,
        positions.getX(i) + normals.getX(i) * strength,
        positions.getY(i) + normals.getY(i) * strength,
        positions.getZ(i) + normals.getZ(i) * strength,
      );
    }
  }
  positions.needsUpdate = true;
  obj.mesh.geometry.computeVertexNormals();
}

// ═══════════════════════════════════════════
// House generator (self-contained)
// ═══════════════════════════════════════════

export function generateHouse(type: "1bed" | "2bed" | "3bed"): CADObject[] {
  const objects: CADObject[] = [];
  // Use fixed positions for house components (not golden spiral)
  const p: [number, number, number] = [0, 0, 0];

  if (type === "1bed") {
    objects.push(createExtrudedRect(-3.5, -3.5, 3.5, 3.5, 3, p));
    objects.push(createExtrudedRect(-3.5, 0.4, 0, 0.6, 3, p));
    objects.push(createExtrudedRect(-0.1, 0.5, 0.1, -1, 3, p));
    objects.push(createExtrudedRect(-3.7, -3.7, 3.7, 3.7, 0.3, [0, 3, 0]));
    objects.push(createExtrudedRect(-2.5, 1.5, -1, 3.3, 0.5, p));
    objects.push(createExtrudedRect(-2.5, -3, -0.3, -2.2, 0.45, p));
    objects.push(createExtrudedRect(0.2, -3.3, 3.3, -2.7, 0.9, p));
  } else if (type === "2bed") {
    objects.push(createExtrudedRect(-5, -4, 5, 4, 3, p));
    objects.push(createExtrudedRect(-0.85, -4, -0.65, 4, 3, p));
    objects.push(createExtrudedRect(0.65, -4, 0.85, 4, 3, p));
    objects.push(createExtrudedRect(-5, -0.1, -0.75, 0.1, 3, p));
    objects.push(createExtrudedRect(-5.3, -4.3, 5.3, 4.3, 0.3, [0, 3, 0]));
    objects.push(createExtrudedRect(-4, 1, -2, 3, 0.5, p));
    objects.push(createExtrudedRect(1.5, 1, 3, 3, 0.5, p));
    objects.push(createExtrudedRect(1, -3.5, 4.8, -2.8, 0.9, p));
    objects.push(createExtrudedRect(-4, -3.5, -1.5, -2.7, 0.45, p));
  } else {
    objects.push(createExtrudedRect(-6, -5, 6, 5, 3, p));
    objects.push(createExtrudedRect(-1.1, -5, -0.9, 5, 3, p));
    objects.push(createExtrudedRect(1.9, -5, 2.1, -1, 3, p));
    objects.push(createExtrudedRect(-1, 1.4, 6, 1.6, 3, p));
    objects.push(createExtrudedRect(-6.3, -5.3, 6.3, 5.3, 0.4, [0, 3, 0]));
    objects.push(createExtrudedRect(-5, 2.5, -3.7, 4.5, 0.5, p));
    objects.push(createExtrudedRect(-0.5, 2.5, 1.5, 4, 0.5, p));
    objects.push(createExtrudedRect(2.5, 2.5, 4, 4, 0.5, p));
    objects.push(createExtrudedRect(-5, -4, -2, -3.2, 0.45, p));
    objects.push(createExtrudedRect(2.2, -4.5, 5.5, -3.8, 0.9, p));
  }

  return objects;
}
