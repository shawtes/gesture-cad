"use client";

import { Line } from "@react-three/drei";
import { useCADState, type SketchPlaneId } from "@/lib/store";

const PREVIEW_COLOR = "#60a5fa";
const OFFSET = 0.02;

interface SketchPreviewProps {
  firstClick: { x: number; z: number } | null;
  cursor: { x: number; z: number } | null;
}

/** Convert sketch 2D coords to 3D world coords on the given plane */
function to3D(sx: number, sz: number, plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [sx, OFFSET, sz];
    case "xy": return [sx, sz, OFFSET];
    case "yz": return [OFFSET, sz, sx];
    default:   return [sx, OFFSET, sz];
  }
}

export function SketchPreview({ firstClick, cursor }: SketchPreviewProps) {
  const { activeTool, sketchPlane } = useCADState();

  if (!firstClick || !cursor) return null;

  if (activeTool === "line") {
    return (
      <Line
        points={[to3D(firstClick.x, firstClick.z, sketchPlane), to3D(cursor.x, cursor.z, sketchPlane)]}
        color={PREVIEW_COLOR}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    );
  }

  if (activeTool === "circle" || activeTool === "ellipse") {
    const radiusX = activeTool === "circle"
      ? Math.hypot(cursor.x - firstClick.x, cursor.z - firstClick.z)
      : Math.abs(cursor.x - firstClick.x);
    const radiusZ = activeTool === "circle" ? radiusX : Math.abs(cursor.z - firstClick.z);
    if (radiusX < 0.01 && radiusZ < 0.01) return null;
    const segments = 64;
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(to3D(
        firstClick.x + Math.cos(angle) * radiusX,
        firstClick.z + Math.sin(angle) * radiusZ,
        sketchPlane
      ));
    }
    return <Line points={points} color={PREVIEW_COLOR} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />;
  }

  if (activeTool === "rect") {
    const points: [number, number, number][] = [
      to3D(firstClick.x, firstClick.z, sketchPlane),
      to3D(cursor.x, firstClick.z, sketchPlane),
      to3D(cursor.x, cursor.z, sketchPlane),
      to3D(firstClick.x, cursor.z, sketchPlane),
      to3D(firstClick.x, firstClick.z, sketchPlane),
    ];
    return <Line points={points} color={PREVIEW_COLOR} lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />;
  }

  return null;
}
