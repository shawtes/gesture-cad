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
} from "@/lib/sketch-entities";

const POINT_COLOR = "#22c55e";
const LINE_COLOR = "#3b82f6";
const CIRCLE_COLOR = "#3b82f6";
const RECT_COLOR = "#3b82f6";
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
