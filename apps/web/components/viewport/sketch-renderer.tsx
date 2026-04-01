"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useCADState } from "@/lib/store";
import type {
  SketchEntity,
  SketchPoint,
  SketchLine,
  SketchCircle,
  SketchRect,
  SketchArc,
  SketchSpline,
} from "@/lib/sketch-entities";

const POINT_COLOR = "#22c55e";
const LINE_COLOR = "#3b82f6";
const CIRCLE_COLOR = "#3b82f6";
const RECT_COLOR = "#3b82f6";
const ARC_COLOR = "#8b5cf6";
const SPLINE_COLOR = "#f59e0b";
const Y_OFFSET = 0.01; // Slight elevation above grid

function PointEntity({ entity }: { entity: SketchPoint }) {
  return (
    <mesh position={[entity.x, Y_OFFSET, entity.z]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color={POINT_COLOR} />
    </mesh>
  );
}

function LineEntity({ entity }: { entity: SketchLine }) {
  const points: [number, number, number][] = [
    [entity.x1, Y_OFFSET, entity.z1],
    [entity.x2, Y_OFFSET, entity.z2],
  ];
  return <Line points={points} color={LINE_COLOR} lineWidth={2} />;
}

function CircleEntity({ entity }: { entity: SketchCircle }) {
  const points = useMemo(() => {
    const segments = 64;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push([
        entity.cx + Math.cos(angle) * entity.radius,
        Y_OFFSET,
        entity.cz + Math.sin(angle) * entity.radius,
      ]);
    }
    return pts;
  }, [entity.cx, entity.cz, entity.radius]);

  return <Line points={points} color={CIRCLE_COLOR} lineWidth={2} />;
}

function RectEntity({ entity }: { entity: SketchRect }) {
  const points: [number, number, number][] = [
    [entity.x1, Y_OFFSET, entity.z1],
    [entity.x2, Y_OFFSET, entity.z1],
    [entity.x2, Y_OFFSET, entity.z2],
    [entity.x1, Y_OFFSET, entity.z2],
    [entity.x1, Y_OFFSET, entity.z1], // close loop
  ];
  return <Line points={points} color={RECT_COLOR} lineWidth={2} />;
}

function ArcEntity({ entity }: { entity: SketchArc }) {
  const points = useMemo(() => {
    // Approximate arc through 3 points using quadratic interpolation
    const segments = 32;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Quadratic Bezier through start, mid, end
      const u = 1 - t;
      const x = u * u * entity.x1 + 2 * u * t * entity.mx + t * t * entity.x2;
      const z = u * u * entity.z1 + 2 * u * t * entity.mz + t * t * entity.z2;
      pts.push([x, Y_OFFSET, z]);
    }
    return pts;
  }, [entity]);
  return <Line points={points} color={ARC_COLOR} lineWidth={2} />;
}

function SplineEntity({ entity }: { entity: SketchSpline }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const cp = entity.points;
    if (cp.length < 4) {
      // Less than 2 control points — just draw straight lines
      for (let i = 0; i < cp.length; i += 2) {
        pts.push([cp[i], Y_OFFSET, cp[i + 1]]);
      }
      return pts;
    }
    // Catmull-Rom spline interpolation
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
        pts.push([x, Y_OFFSET, z]);
      }
    }
    return pts;
  }, [entity.points]);
  return <Line points={points} color={SPLINE_COLOR} lineWidth={2} />;
}

function EntityComponent({ entity }: { entity: SketchEntity }) {
  switch (entity.type) {
    case "point":
      return <PointEntity entity={entity} />;
    case "line":
      return <LineEntity entity={entity} />;
    case "circle":
      return <CircleEntity entity={entity} />;
    case "rect":
      return <RectEntity entity={entity} />;
    case "arc":
      return <ArcEntity entity={entity} />;
    case "spline":
      return <SplineEntity entity={entity} />;
  }
}

export function SketchRenderer() {
  const { entities } = useCADState();
  return (
    <group>
      {entities.map((entity) => (
        <EntityComponent key={entity.id} entity={entity} />
      ))}
    </group>
  );
}
