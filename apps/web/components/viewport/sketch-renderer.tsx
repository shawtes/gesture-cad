"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useCADState, type SketchPlaneId } from "@/lib/store";
import type {
  SketchEntity,
  SketchPoint,
  SketchLine,
  SketchCircle,
  SketchRect,
  SketchArc,
  SketchSpline,
  SketchEllipse,
  SketchSlot,
  SketchPolygon,
} from "@/lib/sketch-entities";

const POINT_COLOR = "#22c55e";
const LINE_COLOR = "#3b82f6";
const CIRCLE_COLOR = "#3b82f6";
const RECT_COLOR = "#3b82f6";
const ARC_COLOR = "#8b5cf6";
const SPLINE_COLOR = "#f59e0b";
const ELLIPSE_COLOR = "#06b6d4";  // Cyan for ellipses
const SLOT_COLOR = "#14b8a6";    // Teal for slots
const POLYGON_COLOR = "#a855f7"; // Purple for polygons
const HOVER_COLOR = "#fbbf24";    // Amber highlight when hovered
const SELECTED_COLOR = "#f97316"; // Orange when selected
const CONSTRUCTION_COLOR = "#6366f1"; // Indigo for construction lines
const OFFSET = 0.01; // Slight elevation above grid

/**
 * Map 2D sketch coordinates (x, z) to 3D world coordinates
 * based on the active sketch plane.
 */
function to3D(sx: number, sz: number, plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [sx, OFFSET, sz];
    case "xy": return [sx, sz, OFFSET];
    case "yz": return [OFFSET, sz, sx];
    default:   return [sx, OFFSET, sz]; // 3d/custom → XZ mapping
  }
}

interface EntityStyleProps {
  isHovered: boolean;
  isSelected: boolean;
}

/** Resolve the display color based on hover/selection/construction state */
function resolveColor(baseColor: string, { isHovered, isSelected }: EntityStyleProps): string {
  if (isSelected) return SELECTED_COLOR;
  if (isHovered) return HOVER_COLOR;
  return baseColor;
}

/** Get the base color for an entity, accounting for construction mode */
function getEntityColor(entity: SketchEntity): string {
  if (entity.isConstruction) return CONSTRUCTION_COLOR;
  switch (entity.type) {
    case "point": return POINT_COLOR;
    case "line": return LINE_COLOR;
    case "circle": return CIRCLE_COLOR;
    case "rect": return RECT_COLOR;
    case "arc": return ARC_COLOR;
    case "spline": return SPLINE_COLOR;
    case "ellipse": return ELLIPSE_COLOR;
    case "slot": return SLOT_COLOR;
    case "polygon": return POLYGON_COLOR;
  }
}

function resolveLineWidth({ isHovered, isSelected }: EntityStyleProps): number {
  if (isSelected) return 4;
  if (isHovered) return 3;
  return 2;
}

function PointEntity({ entity, plane, style }: { entity: SketchPoint; plane: SketchPlaneId; style: EntityStyleProps }) {
  const scale = style.isHovered || style.isSelected ? 1.5 : 1;
  return (
    <mesh position={to3D(entity.x, entity.z, plane)} scale={scale}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={resolveColor(POINT_COLOR, style)} />
    </mesh>
  );
}

function LineEntity({ entity, plane, style }: { entity: SketchLine; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points: [number, number, number][] = [
    to3D(entity.x1, entity.z1, plane),
    to3D(entity.x2, entity.z2, plane),
  ];
  return <Line points={points} color={resolveColor(LINE_COLOR, style)} lineWidth={resolveLineWidth(style)} />;
}

function CircleEntity({ entity, plane, style }: { entity: SketchCircle; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points = useMemo(() => {
    const segments = 64;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(to3D(
        entity.cx + Math.cos(angle) * entity.radius,
        entity.cz + Math.sin(angle) * entity.radius,
        plane
      ));
    }
    return pts;
  }, [entity.cx, entity.cz, entity.radius, plane]);

  return <Line points={points} color={resolveColor(CIRCLE_COLOR, style)} lineWidth={resolveLineWidth(style)} />;
}

function RectEntity({ entity, plane, style }: { entity: SketchRect; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points: [number, number, number][] = [
    to3D(entity.x1, entity.z1, plane),
    to3D(entity.x2, entity.z1, plane),
    to3D(entity.x2, entity.z2, plane),
    to3D(entity.x1, entity.z2, plane),
    to3D(entity.x1, entity.z1, plane),
  ];
  return <Line points={points} color={resolveColor(RECT_COLOR, style)} lineWidth={resolveLineWidth(style)} />;
}

function ArcEntity({ entity, plane, style }: { entity: SketchArc; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points = useMemo(() => {
    const segments = 32;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const u = 1 - t;
      const x = u * u * entity.x1 + 2 * u * t * entity.mx + t * t * entity.x2;
      const z = u * u * entity.z1 + 2 * u * t * entity.mz + t * t * entity.z2;
      pts.push(to3D(x, z, plane));
    }
    return pts;
  }, [entity, plane]);
  return <Line points={points} color={resolveColor(ARC_COLOR, style)} lineWidth={resolveLineWidth(style)} />;
}

function SplineEntity({ entity, plane, style }: { entity: SketchSpline; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const cp = entity.points;
    if (cp.length < 4) {
      for (let i = 0; i < cp.length; i += 2) {
        pts.push(to3D(cp[i], cp[i + 1], plane));
      }
      return pts;
    }
    const n = cp.length / 2;
    const segments = 16;
    for (let i = 0; i < n - 1; i++) {
      const p0x = cp[Math.max(0, i - 1) * 2], p0z = cp[Math.max(0, i - 1) * 2 + 1];
      const p1x = cp[i * 2], p1z = cp[i * 2 + 1];
      const p2x = cp[(i + 1) * 2], p2z = cp[(i + 1) * 2 + 1];
      const p3x = cp[Math.min(n - 1, i + 2) * 2], p3z = cp[Math.min(n - 1, i + 2) * 2 + 1];
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1x) + (-p0x + p2x) * t + (2 * p0x - 5 * p1x + 4 * p2x - p3x) * t2 + (-p0x + 3 * p1x - 3 * p2x + p3x) * t3);
        const z = 0.5 * ((2 * p1z) + (-p0z + p2z) * t + (2 * p0z - 5 * p1z + 4 * p2z - p3z) * t2 + (-p0z + 3 * p1z - 3 * p2z + p3z) * t3);
        pts.push(to3D(x, z, plane));
      }
    }
    return pts;
  }, [entity.points, plane]);
  return <Line points={points} color={resolveColor(SPLINE_COLOR, style)} lineWidth={resolveLineWidth(style)} />;
}

function EllipseEntity({ entity, plane, style }: { entity: SketchEllipse; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points = useMemo(() => {
    const segments = 64;
    const pts: [number, number, number][] = [];
    const cos = Math.cos(entity.rotation);
    const sin = Math.sin(entity.rotation);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Local ellipse point
      const lx = entity.radiusX * Math.cos(angle);
      const lz = entity.radiusZ * Math.sin(angle);
      // Rotate and translate
      const wx = entity.cx + lx * cos - lz * sin;
      const wz = entity.cz + lx * sin + lz * cos;
      pts.push(to3D(wx, wz, plane));
    }
    return pts;
  }, [entity.cx, entity.cz, entity.radiusX, entity.radiusZ, entity.rotation, plane]);

  const baseColor = entity.isConstruction ? CONSTRUCTION_COLOR : ELLIPSE_COLOR;
  return <Line points={points} color={resolveColor(baseColor, style)} lineWidth={resolveLineWidth(style)} />;
}

function SlotEntity({ entity, plane, style }: { entity: SketchSlot; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points: [number, number, number][] = [];
  const { x1, z1, x2, z2, width } = entity;
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len * width, nz = dx / len * width;
  const segments = 16;

  // Top semicircle around point 2
  for (let i = 0; i <= segments; i++) {
    const a = Math.atan2(nz, nx) + (i / segments) * Math.PI;
    points.push(to3D(x2 + Math.cos(a) * width, z2 + Math.sin(a) * width, plane));
  }
  // Bottom semicircle around point 1
  for (let i = 0; i <= segments; i++) {
    const a = Math.atan2(nz, nx) + Math.PI + (i / segments) * Math.PI;
    points.push(to3D(x1 + Math.cos(a) * width, z1 + Math.sin(a) * width, plane));
  }
  points.push(points[0]); // close

  const baseColor = entity.isConstruction ? CONSTRUCTION_COLOR : SLOT_COLOR;
  return <Line points={points} color={resolveColor(baseColor, style)} lineWidth={resolveLineWidth(style)} />;
}

function PolygonEntity({ entity, plane, style }: { entity: SketchPolygon; plane: SketchPlaneId; style: EntityStyleProps }) {
  const points: [number, number, number][] = [];
  const { cx, cz, radius, sides, rotation } = entity;

  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    points.push(to3D(cx + radius * Math.cos(a), cz + radius * Math.sin(a), plane));
  }

  const baseColor = entity.isConstruction ? CONSTRUCTION_COLOR : POLYGON_COLOR;
  return <Line points={points} color={resolveColor(baseColor, style)} lineWidth={resolveLineWidth(style)} />;
}

function EntityComponent({ entity, plane, style }: { entity: SketchEntity; plane: SketchPlaneId; style: EntityStyleProps }) {
  switch (entity.type) {
    case "point":
      return <PointEntity entity={entity} plane={plane} style={style} />;
    case "line":
      return <LineEntity entity={entity} plane={plane} style={style} />;
    case "circle":
      return <CircleEntity entity={entity} plane={plane} style={style} />;
    case "rect":
      return <RectEntity entity={entity} plane={plane} style={style} />;
    case "arc":
      return <ArcEntity entity={entity} plane={plane} style={style} />;
    case "spline":
      return <SplineEntity entity={entity} plane={plane} style={style} />;
    case "ellipse":
      return <EllipseEntity entity={entity} plane={plane} style={style} />;
    case "slot":
      return <SlotEntity entity={entity} plane={plane} style={style} />;
    case "polygon":
      return <PolygonEntity entity={entity} plane={plane} style={style} />;
  }
}

export function SketchRenderer() {
  const { entities, sketchPlane, selectedEntityIds, hoveredEntityId } = useCADState();
  return (
    <group>
      {entities.map((entity) => (
        <EntityComponent
          key={entity.id}
          entity={entity}
          plane={entity.plane ?? sketchPlane}
          style={{
            isHovered: entity.id === hoveredEntityId,
            isSelected: selectedEntityIds.includes(entity.id),
          }}
        />
      ))}
    </group>
  );
}
