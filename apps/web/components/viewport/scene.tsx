"use client";

import { useState, useEffect } from "react";
import { SketchPlane } from "./sketch-plane";
import { SketchRenderer } from "./sketch-renderer";
import { SketchPreview } from "./sketch-preview";
import { ConstraintRenderer } from "./constraint-renderer";
import { MeshRenderer } from "./mesh-renderer";
import { useCADState } from "@/lib/store";

interface SceneProps {
  /** Normalized hand position from gesture tracking */
  handPosition: { x: number; y: number } | null;
  /** Current gesture string */
  gesture: string;
}

export function Scene({ handPosition, gesture }: SceneProps) {
  const { activeTool } = useCADState();
  const [firstClick, setFirstClick] = useState<{ x: number; z: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);

  // Reset first click when tool changes
  useEffect(() => {
    setFirstClick(null);
    setCursor(null);
  }, [activeTool]);

  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect";

  return (
    <group>
      <SketchPlane
        firstClick={firstClick}
        onFirstClickChange={setFirstClick}
        onCursorMove={setCursor}
        handPosition={handPosition}
        gesture={gesture}
      />
      <SketchRenderer />
      <SketchPreview firstClick={firstClick} cursor={cursor} />
      <ConstraintRenderer />
      <MeshRenderer />

      {/* First-click indicator dot (amber) */}
      {firstClick && (
        <mesh position={[firstClick.x, 0.02, firstClick.z]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* 3D cursor — follows hand position or mouse on sketch plane */}
      {cursor && isSketchTool && (
        <group position={[cursor.x, 0.02, cursor.z]}>
          {/* Cursor dot */}
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#f472b6" opacity={0.8} transparent />
          </mesh>
          {/* Cursor ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.15, 32]} />
            <meshBasicMaterial color="#f472b6" opacity={0.4} transparent />
          </mesh>
        </group>
      )}

      {/* Origin axes indicator */}
      <axesHelper args={[3]} />
    </group>
  );
}
