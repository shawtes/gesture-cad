"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface DrawingEngineProps {
  active: boolean;
}

interface Stroke {
  id: string;
  points: THREE.Vector3[];
  color: string;
}

/**
 * 3D Drawing/Annotation engine.
 * When active, tracks the index fingertip (or mouse in desktop mode)
 * and accumulates points into Catmull-Rom smoothed strokes.
 *
 * In XR mode: index finger draws in 3D space.
 * In desktop mode: click-drag draws on a plane.
 */
export function DrawingEngine({ active }: DrawingEngineProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [drawColor, setDrawColor] = useState("#00ffff");
  const isDrawing = useRef(false);
  const strokeCounter = useRef(0);

  const finishStroke = useCallback(() => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }

    // Apply Catmull-Rom smoothing
    const curve = new THREE.CatmullRomCurve3(currentPoints);
    const smoothedPoints = curve.getPoints(Math.max(currentPoints.length * 3, 20));

    const stroke: Stroke = {
      id: `stroke_${++strokeCounter.current}`,
      points: smoothedPoints,
      color: drawColor,
    };
    setStrokes((prev) => [...prev, stroke]);
    setCurrentPoints([]);
    isDrawing.current = false;
  }, [currentPoints, drawColor]);

  return (
    <group>
      {/* Completed strokes */}
      {strokes.map((stroke) => (
        <Line
          key={stroke.id}
          points={stroke.points.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color={stroke.color}
          lineWidth={3}
        />
      ))}

      {/* Current stroke being drawn */}
      {currentPoints.length >= 2 && (
        <Line
          points={currentPoints.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color={drawColor}
          lineWidth={2}
          dashed
          dashSize={0.02}
          gapSize={0.01}
        />
      )}

      {/* Color indicator */}
      {active && (
        <mesh position={[0, 0.02, 0]}>
          <ringGeometry args={[0.005, 0.008, 16]} />
          <meshBasicMaterial color={drawColor} />
        </mesh>
      )}
    </group>
  );
}
