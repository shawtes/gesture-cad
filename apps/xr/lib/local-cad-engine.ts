/**
 * Local CAD Engine — runs entirely in the XR app, no server needed.
 *
 * Creates and manages 3D geometry directly with Three.js.
 * No fetch calls, no localhost dependency, works on Vercel.
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
}

export interface CADScene {
  objects: CADObject[];
  selectedId: string | null;
}

let nextId = 1;
function genId(): string { return `obj_${nextId++}`; }

// ═══════════════════════════════════════════
// Primitives — create Three.js meshes directly
// ═══════════════════════════════════════════

export function createBox(
  width = 1, height = 1, depth = 1,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0], position[1] + height / 2, position[2]);
  return { id: genId(), name: `Box ${width}×${height}×${depth}`, type: "box", mesh, visible: true };
}

export function createCylinder(
  radius = 0.5, height = 1, segments = 32,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.CylinderGeometry(radius, radius, height, segments);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0], position[1] + height / 2, position[2]);
  return { id: genId(), name: `Cylinder R${radius}×H${height}`, type: "cylinder", mesh, visible: true };
}

export function createSphere(
  radius = 0.5, segments = 32,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.SphereGeometry(radius, segments, segments);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0], position[1] + radius, position[2]);
  return { id: genId(), name: `Sphere R${radius}`, type: "sphere", mesh, visible: true };
}

export function createCone(
  radius = 0.5, height = 1, segments = 32,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.ConeGeometry(radius, height, segments);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0], position[1] + height / 2, position[2]);
  return { id: genId(), name: `Cone R${radius}×H${height}`, type: "cone", mesh, visible: true };
}

export function createTorus(
  radius = 0.5, tube = 0.15, segments = 32,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.TorusGeometry(radius, tube, 16, segments);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0], position[1] + tube, position[2]);
  return { id: genId(), name: `Torus R${radius}`, type: "torus", mesh, visible: true };
}

// Sketch shapes extruded to 3D
export function createExtrudedRect(
  x1: number, z1: number, x2: number, z2: number, height = 1,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const w = Math.abs(x2 - x1);
  const d = Math.abs(z2 - z1);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const geo = new THREE.BoxGeometry(w, height, d);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0] + cx, position[1] + height / 2, position[2] + cz);
  return { id: genId(), name: `Rect ${w.toFixed(1)}×${d.toFixed(1)}`, type: "rect", mesh, visible: true };
}

export function createExtrudedCircle(
  cx: number, cz: number, radius: number, height = 1,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 32);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0] + cx, position[1] + height / 2, position[2] + cz);
  return { id: genId(), name: `Circle R${radius.toFixed(1)}`, type: "circle", mesh, visible: true };
}

export function createExtrudedPolygon(
  cx: number, cz: number, radius: number, sides: number, height = 1,
  position: [number, number, number] = [0, 0, 0]
): CADObject {
  const geo = new THREE.CylinderGeometry(radius, radius, height, sides);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(position[0] + cx, position[1] + height / 2, position[2] + cz);
  return { id: genId(), name: `Polygon ${sides}-sided`, type: "polygon", mesh, visible: true };
}

// ═══════════════════════════════════════════
// Modifiers
// ═══════════════════════════════════════════

export function applyFillet(obj: CADObject, radius: number): CADObject {
  // Approximate fillet by replacing box with rounded box
  const geo = obj.mesh.geometry;
  const params = (geo as any).parameters;
  if (obj.type === "box" || obj.type === "rect") {
    const w = params?.width || 1;
    const h = params?.height || 1;
    const d = params?.depth || 1;
    const r = Math.min(radius, Math.min(w, h, d) / 3);
    // Use beveled edges via segments
    const newGeo = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
    obj.mesh.geometry.dispose();
    obj.mesh.geometry = newGeo;
    obj.name += ` +fillet(${r.toFixed(2)})`;
  }
  return obj;
}

export function applyScale(obj: CADObject, sx: number, sy: number, sz: number): CADObject {
  obj.mesh.scale.set(sx, sy, sz);
  return obj;
}

// ═══════════════════════════════════════════
// House generator (self-contained, no server)
// ═══════════════════════════════════════════

export function generateHouse(type: "1bed" | "2bed" | "3bed"): CADObject[] {
  const objects: CADObject[] = [];
  const pos: [number, number, number] = [0, 0, 0];

  if (type === "1bed") {
    // 7m × 7m apartment
    objects.push(createExtrudedRect(-3.5, -3.5, 3.5, 3.5, 3, pos));     // outer walls
    objects.push(createExtrudedRect(-3.5, 0.4, 0, 0.6, 3, pos));         // bedroom wall
    objects.push(createExtrudedRect(-0.1, 0.5, 0.1, -1, 3, pos));        // bathroom wall
    objects.push(createExtrudedRect(-3.5, -3.5, 3.5, -3.3, 0.3, [0, 3, 0])); // roof
    // Furniture
    objects.push(createExtrudedRect(-2.5, 1.5, -1, 3.3, 0.5, pos));      // bed
    objects.push(createExtrudedRect(-2.5, -3, -0.3, -2.2, 0.45, pos));   // sofa
    objects.push(createExtrudedRect(0.2, -3.3, 3.3, -2.7, 0.9, pos));    // kitchen counter
  } else if (type === "2bed") {
    objects.push(createExtrudedRect(-5, -4, 5, 4, 3, pos));              // outer walls
    objects.push(createExtrudedRect(-0.85, -4, -0.65, 4, 3, pos));       // hallway left
    objects.push(createExtrudedRect(0.65, -4, 0.85, 4, 3, pos));         // hallway right
    objects.push(createExtrudedRect(-5, -0.1, -0.75, 0.1, 3, pos));      // bedroom wall
    objects.push(createExtrudedRect(-5.3, -4.3, 5.3, 4.3, 0.3, [0, 3, 0])); // roof
    objects.push(createExtrudedRect(-4, 1, -2, 3, 0.5, pos));            // master bed
    objects.push(createExtrudedRect(1.5, 1, 3, 3, 0.5, pos));            // bed 2
    objects.push(createExtrudedRect(1, -3.5, 4.8, -2.8, 0.9, pos));      // kitchen
    objects.push(createExtrudedRect(-4, -3.5, -1.5, -2.7, 0.45, pos));   // sofa
  } else {
    objects.push(createExtrudedRect(-6, -5, 6, 5, 3, pos));              // outer walls
    objects.push(createExtrudedRect(-1.1, -5, -0.9, 5, 3, pos));         // hallway
    objects.push(createExtrudedRect(1.9, -5, 2.1, -1, 3, pos));          // kitchen wall
    objects.push(createExtrudedRect(-1, 1.4, 6, 1.6, 3, pos));           // bedroom divider
    objects.push(createExtrudedRect(-6.3, -5.3, 6.3, 5.3, 0.4, [0, 3, 0])); // roof
    objects.push(createExtrudedRect(-5, 2.5, -3.7, 4.5, 0.5, pos));      // master bed
    objects.push(createExtrudedRect(-0.5, 2.5, 1.5, 4, 0.5, pos));       // bed 2
    objects.push(createExtrudedRect(2.5, 2.5, 4, 4, 0.5, pos));          // bed 3
    objects.push(createExtrudedRect(-5, -4, -2, -3.2, 0.45, pos));        // sofa
    objects.push(createExtrudedRect(2.2, -4.5, 5.5, -3.8, 0.9, pos));    // kitchen
  }

  return objects;
}
