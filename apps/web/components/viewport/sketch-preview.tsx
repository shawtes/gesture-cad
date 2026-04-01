"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useCADState } from "@/lib/store";

const PREVIEW_COLOR = "#60a5fa"; // lighter blue for ghost preview
const PREVIEW_OPACITY = 0.5;
const Y_OFFSET = 0.02;

interface SketchPreviewProps {
  firstClick: { x: number; z: number } | null;
  cursor: { x: number; z: number } | null;
}

/**
 * Renders a ghost preview of the entity being drawn
 * (between first click and current cursor position).
 */
export function SketchPreview({ firstClick, cursor }: SketchPreviewProps) {
  const { activeTool } = useCADState();

  if (!firstClick || !cursor) return null;

  if (activeTool === "line") {
    return (
      <Line
        points={[
          [firstClick.x, Y_OFFSET, firstClick.z],
          [cursor.x, Y_OFFSET, cursor.z],
        ]}
        color={PREVIEW_COLOR}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    );
  }

  if (activeTool === "circle") {
    const radius = Math.hypot(cursor.x - firstClick.x, cursor.z - firstClick.z);
    if (radius < 0.01) return null;
    const segments = 64;
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push([
        firstClick.x + Math.cos(angle) * radius,
        Y_OFFSET,
        firstClick.z + Math.sin(angle) * radius,
      ]);
    }
    return (
      <Line
        points={points}
        color={PREVIEW_COLOR}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    );
  }

  if (activeTool === "rect") {
    const points: [number, number, number][] = [
      [firstClick.x, Y_OFFSET, firstClick.z],
      [cursor.x, Y_OFFSET, firstClick.z],
      [cursor.x, Y_OFFSET, cursor.z],
      [firstClick.x, Y_OFFSET, cursor.z],
      [firstClick.x, Y_OFFSET, firstClick.z],
    ];
    return (
      <Line
        points={points}
        color={PREVIEW_COLOR}
        lineWidth={1.5}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    );
  }

  return null;
}
