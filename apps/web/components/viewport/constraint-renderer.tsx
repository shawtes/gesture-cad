"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useCADState } from "@/lib/store";
import type { SketchConstraint } from "@/lib/constraints";
import type { SketchEntity } from "@/lib/sketch-entities";

const Y_OFFSET = 0.05;

/** Get the midpoint of a constraint's associated entity for icon placement. */
function getConstraintPosition(
  constraint: SketchConstraint,
  entities: SketchEntity[]
): { x: number; z: number } | null {
  const entity = entities.find((e) => e.id === constraint.entityIds[0]);
  if (!entity) return null;

  switch (entity.type) {
    case "point":
      return { x: entity.x, z: entity.z };
    case "line":
      return { x: (entity.x1 + entity.x2) / 2, z: (entity.z1 + entity.z2) / 2 };
    case "circle":
      return { x: entity.cx, z: entity.cz };
    case "rect":
      return { x: (entity.x1 + entity.x2) / 2, z: (entity.z1 + entity.z2) / 2 };
    case "arc":
      return { x: entity.mx, z: entity.mz };
    case "spline":
      if (entity.points.length >= 2) {
        return { x: entity.points[0], z: entity.points[1] };
      }
      return null;
    default:
      return null;
  }
}

function ConstraintIcon({
  constraint,
  position,
  status,
}: {
  constraint: SketchConstraint;
  position: { x: number; z: number };
  status: string;
}) {
  const color =
    status === "overconstrained" ? "#ef4444" :
    status === "solved" ? "#22c55e" :
    "#3b82f6";

  let label = "";
  let bgColor = "";
  switch (constraint.type) {
    case "horizontal":
      label = "H";
      bgColor = "rgba(34, 197, 94, 0.2)";
      break;
    case "vertical":
      label = "V";
      bgColor = "rgba(34, 197, 94, 0.2)";
      break;
    case "coincident":
      label = "•";
      bgColor = "rgba(59, 130, 246, 0.2)";
      break;
    case "tangent":
      label = "T";
      bgColor = "rgba(168, 85, 247, 0.2)";
      break;
    case "equal":
      label = "=";
      bgColor = "rgba(234, 179, 8, 0.2)";
      break;
  }

  return (
    <group position={[position.x, Y_OFFSET, position.z]}>
      <Html
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div
          data-testid={`constraint-${constraint.type}`}
          style={{
            background: bgColor,
            border: `1px solid ${color}`,
            borderRadius: constraint.type === "coincident" ? "50%" : 4,
            padding: constraint.type === "coincident" ? "2px 6px" : "2px 8px",
            color,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

export function ConstraintRenderer() {
  const { constraints, entities, constraintStatus } = useCADState();

  const constraintPositions = useMemo(() => {
    return constraints
      .map((c) => ({
        constraint: c,
        position: getConstraintPosition(c, entities),
      }))
      .filter((cp) => cp.position !== null);
  }, [constraints, entities]);

  if (constraintPositions.length === 0) return null;

  return (
    <group>
      {constraintPositions.map(({ constraint, position }) => (
        <ConstraintIcon
          key={constraint.id}
          constraint={constraint}
          position={position!}
          status={constraintStatus}
        />
      ))}
    </group>
  );
}
