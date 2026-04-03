/**
 * GestureCAD Scripting API
 *
 * Unity-style programmatic control for creating 3D models.
 * Can be used by:
 * - Claude AI (via terminal cad-commands)
 * - Users (via terminal script commands)
 * - Custom automation scripts
 *
 * Design inspired by:
 * - Unity: GameObject.CreatePrimitive(), transform.position
 * - Three.js: new BoxGeometry(), mesh.position.set()
 * - OpenSCAD: cube(), cylinder(), translate(), union()
 *
 * Usage:
 *   const scene = new CADScene();
 *   const box = scene.box(2, 1, 3);         // width, height, depth
 *   box.position(0, 0, 0);                   // set position
 *   const hole = scene.cylinder(0.5, 2);     // radius, height
 *   hole.position(0, 0, 0);
 *   scene.subtract(box, hole);               // boolean subtract
 *   scene.fillet(box, 0.1);                  // round edges
 *   scene.exportSTL();                       // download
 */

import {
  createRect, createCircle, createLine, createPolygon,
  createEllipse, createSlot, createArc, createPoint,
  type SketchEntity,
} from "./sketch-entities";
import {
  extrudeEntityToMesh, generateHelixMesh,
  createExtrudeFeature, createFilletFeature, createChamferFeature,
  type TessellatedMesh, type Feature,
} from "./features";
import { linearPattern, circularPattern } from "./pattern-ops";
import { performBoolean } from "./boolean-ops";

// ═══════════════════════════════════════════
// Scene Graph Types
// ═══════════════════════════════════════════

export interface CADObject {
  id: string;
  name: string;
  entity: SketchEntity | null;
  mesh: TessellatedMesh | null;
  feature: Feature | null;
  position: [number, number, number];
  rotation: [number, number, number];
  plane: "xz" | "xy" | "yz";
  children: CADObject[];
}

let objectCounter = 0;
function nextObjectId(): string {
  return `cad_obj_${++objectCounter}`;
}

// ═══════════════════════════════════════════
// CADObject Builder (fluent API)
// ═══════════════════════════════════════════

export class CADObjectBuilder {
  private obj: CADObject;

  constructor(name: string, entity: SketchEntity | null, plane: "xz" | "xy" | "yz" = "xz") {
    this.obj = {
      id: nextObjectId(),
      name,
      entity,
      mesh: null,
      feature: null,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      plane,
      children: [],
    };
  }

  /** Set world position */
  pos(x: number, y: number, z: number): this {
    this.obj.position = [x, y, z];
    return this;
  }

  /** Set rotation in degrees */
  rot(x: number, y: number, z: number): this {
    this.obj.rotation = [x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180];
    return this;
  }

  /** Set which plane this was sketched on */
  onPlane(plane: "xz" | "xy" | "yz"): this {
    this.obj.plane = plane;
    if (this.obj.entity) (this.obj.entity as any).plane = plane;
    return this;
  }

  /** Extrude the sketch entity into 3D */
  extrude(height: number): this {
    if (this.obj.entity) {
      (this.obj.entity as any).plane = this.obj.plane;
      this.obj.mesh = extrudeEntityToMesh(this.obj.entity, height);
      if (this.obj.mesh) {
        this.obj.feature = createExtrudeFeature(
          [this.obj.entity.id],
          { distance: height, direction: "up" },
          this.obj.mesh
        );
        this.obj.feature.name = this.obj.name;
      }
    }
    return this;
  }

  /** Get the built object */
  build(): CADObject {
    return this.obj;
  }

  /** Get the mesh for rendering */
  getMesh(): TessellatedMesh | null {
    return this.obj.mesh;
  }

  /** Get the feature for the feature tree */
  getFeature(): Feature | null {
    return this.obj.feature;
  }
}

// ═══════════════════════════════════════════
// CADScene — Unity-style scene manager
// ═══════════════════════════════════════════

export class CADScene {
  private objects: CADObject[] = [];
  private features: Feature[] = [];

  // ─── Primitive Creators (like Unity's CreatePrimitive) ───

  /** Create a box: width along X, height along Y, depth along Z */
  box(width: number, height: number, depth: number, name?: string): CADObjectBuilder {
    const hw = width / 2, hd = depth / 2;
    const entity = createRect(-hw, -hd, hw, hd);
    const builder = new CADObjectBuilder(name || `Box ${width}×${height}×${depth}`, entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a cylinder: radius, height */
  cylinder(radius: number, height: number, name?: string): CADObjectBuilder {
    const entity = createCircle(0, 0, radius);
    const builder = new CADObjectBuilder(name || `Cylinder R${radius}×H${height}`, entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a sphere (approximated as extruded circle) */
  sphere(radius: number, name?: string): CADObjectBuilder {
    const entity = createCircle(0, 0, radius);
    const builder = new CADObjectBuilder(name || `Sphere R${radius}`, entity);
    builder.extrude(radius * 2);
    return builder;
  }

  /** Create a polygon prism: sides, radius, height */
  polygon(sides: number, radius: number, height: number, name?: string): CADObjectBuilder {
    const entity = createPolygon(0, 0, radius, sides, 0);
    const builder = new CADObjectBuilder(name || `Polygon ${sides}-sided`, entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a cone (tapered cylinder) */
  cone(radius: number, height: number, name?: string): CADObjectBuilder {
    const entity = createCircle(0, 0, radius);
    const builder = new CADObjectBuilder(name || `Cone R${radius}`, entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a line extrusion (wall/plate) */
  wall(x1: number, z1: number, x2: number, z2: number, height: number, name?: string): CADObjectBuilder {
    const entity = createLine(x1, z1, x2, z2);
    const builder = new CADObjectBuilder(name || "Wall", entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a slot shape */
  slot(x1: number, z1: number, x2: number, z2: number, width: number, height: number, name?: string): CADObjectBuilder {
    const entity = createSlot(x1, z1, x2, z2, width);
    const builder = new CADObjectBuilder(name || "Slot", entity);
    builder.extrude(height);
    return builder;
  }

  /** Create a helix/spring */
  helix(radius: number, pitch: number, height: number, name?: string): CADObjectBuilder {
    const params = { center: [0, 0, 0] as [number, number, number], radius, pitch, height, taperAngle: 0, clockwise: false };
    const mesh = generateHelixMesh(params);
    const entity = createPoint(0, 0); // placeholder
    const builder = new CADObjectBuilder(name || `Helix R${radius}`, entity);
    (builder as any).obj.mesh = mesh;
    return builder;
  }

  // ─── Sketch on specific plane ───

  /** Start a sketch on XZ (top/ground) plane */
  sketchXZ(): SketchBuilder { return new SketchBuilder("xz"); }

  /** Start a sketch on XY (front) plane */
  sketchXY(): SketchBuilder { return new SketchBuilder("xy"); }

  /** Start a sketch on YZ (side) plane */
  sketchYZ(): SketchBuilder { return new SketchBuilder("yz"); }

  // ─── Boolean Operations ───

  /** Union (combine) two meshes */
  union(a: CADObjectBuilder, b: CADObjectBuilder): TessellatedMesh | null {
    const ma = a.getMesh(), mb = b.getMesh();
    if (!ma || !mb) return null;
    return performBoolean(ma, mb, "union");
  }

  /** Subtract b from a (cut) */
  subtract(a: CADObjectBuilder, b: CADObjectBuilder): TessellatedMesh | null {
    const ma = a.getMesh(), mb = b.getMesh();
    if (!ma || !mb) return null;
    return performBoolean(ma, mb, "subtract");
  }

  /** Intersect (keep only overlap) */
  intersect(a: CADObjectBuilder, b: CADObjectBuilder): TessellatedMesh | null {
    const ma = a.getMesh(), mb = b.getMesh();
    if (!ma || !mb) return null;
    return performBoolean(ma, mb, "intersect");
  }

  // ─── Patterns ───

  /** Linear pattern: repeat along a direction */
  linearRepeat(obj: CADObjectBuilder, direction: [number, number, number], count: number, spacing: number): TessellatedMesh | null {
    const mesh = obj.getMesh();
    if (!mesh) return null;
    return linearPattern(mesh, direction, count, spacing);
  }

  /** Circular pattern: repeat around an axis */
  circularRepeat(obj: CADObjectBuilder, axis: [number, number, number], count: number, angle: number = 360): TessellatedMesh | null {
    const mesh = obj.getMesh();
    if (!mesh) return null;
    return circularPattern(mesh, axis, [0, 0, 0], count, angle);
  }

  // ─── Scene Management ───

  /** Add an object to the scene */
  add(builder: CADObjectBuilder): CADObject {
    const obj = builder.build();
    this.objects.push(obj);
    if (obj.feature) this.features.push(obj.feature);
    return obj;
  }

  /** Get all features for the feature tree */
  getFeatures(): Feature[] {
    return this.features;
  }

  /** Get all objects */
  getObjects(): CADObject[] {
    return this.objects;
  }

  /** Clear the scene */
  clear(): void {
    this.objects = [];
    this.features = [];
  }
}

// ═══════════════════════════════════════════
// SketchBuilder — fluent API for 2D sketches
// ═══════════════════════════════════════════

export class SketchBuilder {
  private plane: "xz" | "xy" | "yz";
  private entities: SketchEntity[] = [];

  constructor(plane: "xz" | "xy" | "yz") {
    this.plane = plane;
  }

  rect(x1: number, z1: number, x2: number, z2: number): this {
    const e = createRect(x1, z1, x2, z2);
    (e as any).plane = this.plane;
    this.entities.push(e);
    return this;
  }

  circle(cx: number, cz: number, radius: number): this {
    const e = createCircle(cx, cz, radius);
    (e as any).plane = this.plane;
    this.entities.push(e);
    return this;
  }

  line(x1: number, z1: number, x2: number, z2: number): this {
    const e = createLine(x1, z1, x2, z2);
    (e as any).plane = this.plane;
    this.entities.push(e);
    return this;
  }

  polygon(cx: number, cz: number, radius: number, sides: number): this {
    const e = createPolygon(cx, cz, radius, sides, 0);
    (e as any).plane = this.plane;
    this.entities.push(e);
    return this;
  }

  /** Extrude the last entity and return a builder */
  extrude(height: number): CADObjectBuilder {
    const last = this.entities[this.entities.length - 1];
    if (!last) throw new Error("No entities to extrude");
    const builder = new CADObjectBuilder("Sketch Extrude", last, this.plane);
    builder.extrude(height);
    return builder;
  }

  /** Get all sketch entities */
  getEntities(): SketchEntity[] {
    return this.entities;
  }
}

// ═══════════════════════════════════════════
// Script Parser — converts text scripts to actions
// ═══════════════════════════════════════════

export interface ScriptAction {
  action: string;
  args: (string | number | boolean)[];
  line: number;
}

/**
 * Parse a simple scripting language into actions.
 *
 * Syntax:
 *   box 2 1 3           → create box (width=2, height=1, depth=3)
 *   cylinder 0.5 2       → create cylinder (radius=0.5, height=2)
 *   polygon 6 1 2        → create hexagonal prism (6 sides, radius=1, height=2)
 *   move 0 1 0            → move last object
 *   rotate 0 45 0         → rotate last object (degrees)
 *   plane xz              → set sketch plane
 *   extrude 3             → extrude last sketch entity
 *   fillet 0.1            → fillet last feature
 *   chamfer 0.1           → chamfer last feature
 *   hole 0.5 2            → add hole (diameter=0.5, depth=2)
 *   pattern linear 3 2 x  → linear pattern (count=3, spacing=2, along X)
 *   pattern circular 6    → circular pattern (count=6)
 *   union                  → combine last two
 *   subtract               → subtract last from previous
 *   repeat 4 { ... }      → repeat block 4 times
 *   var width 5           → define variable
 *   export stl             → export
 */
export function parseScript(script: string): ScriptAction[] {
  const actions: ScriptAction[] = [];
  const lines = script.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;

    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).map((a) => {
      const num = Number(a);
      if (!isNaN(num)) return num;
      if (a === "true") return true;
      if (a === "false") return false;
      return a;
    });

    actions.push({ action: cmd, args, line: i + 1 });
  }

  return actions;
}

/**
 * Convert script actions to cad-commands format (for terminal execution).
 */
export function scriptToCommands(actions: ScriptAction[]): any[] {
  const commands: any[] = [];

  for (const action of actions) {
    switch (action.action) {
      case "box": {
        const [w, h, d] = action.args as number[];
        const hw = (w || 1) / 2, hd = (d || 1) / 2;
        commands.push({ action: "comment", text: `--- Box ${w}×${h}×${d} ---` });
        commands.push({ action: "add_entity", type: "rect", params: { x1: -hw, z1: -hd, x2: hw, z2: hd } });
        commands.push({ action: "extrude_last", distance: h || 1 });
        break;
      }
      case "cylinder": {
        const [r, h] = action.args as number[];
        commands.push({ action: "comment", text: `--- Cylinder R${r}×H${h} ---` });
        commands.push({ action: "add_entity", type: "circle", params: { cx: 0, cz: 0, radius: r || 0.5 } });
        commands.push({ action: "extrude_last", distance: h || 1 });
        break;
      }
      case "polygon": {
        const [sides, r, h] = action.args as number[];
        commands.push({ action: "comment", text: `--- Polygon ${sides}-sided ---` });
        commands.push({ action: "add_entity", type: "polygon", params: { cx: 0, cz: 0, radius: r || 1, sides: sides || 6, rotation: 0 } });
        commands.push({ action: "extrude_last", distance: h || 1 });
        break;
      }
      case "plane": {
        commands.push({ action: "set_plane", plane: String(action.args[0] || "xz") });
        break;
      }
      case "move": {
        // Move is handled by setting position on the entity before extrude
        // For now, add as a transform command
        commands.push({ action: "comment", text: `Move to (${action.args.join(", ")})` });
        break;
      }
      case "fillet": {
        commands.push({ action: "apply_feature", type: "fillet", params: { radius: action.args[0] || 0.1 } });
        break;
      }
      case "chamfer": {
        commands.push({ action: "apply_feature", type: "chamfer", params: { distance: action.args[0] || 0.1 } });
        break;
      }
      case "hole": {
        const [diam, depth] = action.args as number[];
        commands.push({ action: "apply_feature", type: "hole", params: { diameter: diam || 0.5, depth: depth || 1, holeType: "simple" } });
        break;
      }
      case "pattern": {
        const type = String(action.args[0]);
        if (type === "linear") {
          const [, count, spacing, axis] = action.args;
          commands.push({ action: "apply_feature", type: "linear_pattern", params: { count: count || 3, spacing: spacing || 2, dirAxis: axis || "x" } });
        } else if (type === "circular") {
          commands.push({ action: "apply_feature", type: "circular_pattern", params: { count: action.args[1] || 6, angle: 360 } });
        }
        break;
      }
      case "union":
      case "subtract":
      case "intersect":
        commands.push({ action: "set_tool", tool: action.action });
        break;
      case "export":
        commands.push({ action: "export", format: String(action.args[0] || "stl") });
        break;
      case "helix": {
        const [r, p, h] = action.args as number[];
        commands.push({ action: "apply_feature", type: "helix", params: { radius: r || 1, pitch: p || 0.5, height: h || 3, taperAngle: 0, clockwise: false } });
        break;
      }
      case "shell": {
        commands.push({ action: "apply_feature", type: "shell", params: { thickness: action.args[0] || 0.2 } });
        break;
      }
      case "draft": {
        commands.push({ action: "apply_feature", type: "draft", params: { angle: action.args[0] || 3 } });
        break;
      }
      default:
        commands.push({ action: "comment", text: `Unknown: ${action.action} ${action.args.join(" ")}` });
    }
  }

  return commands;
}
