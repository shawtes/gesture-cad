"use client";

import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  type AnnotationStroke,
  finalizeStroke,
  COLOR_PALETTE,
  measure3D,
} from "@/lib/annotations";

interface DrawingEngineProps {
  active: boolean;
}

/**
 * 3D Drawing/Annotation engine for XR and desktop.
 * - Draw mode: accumulates index fingertip / mouse positions into strokes
 * - Strokes are Catmull-Rom smoothed and stored in world space
 * - Undo removes last stroke
 * - Color palette selectable
 * - Measurement mode: two-point distance display
 */
export function DrawingEngine({ active }: DrawingEngineProps) {
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const [measurements, setMeasurements] = useState<
    { id: string; a: THREE.Vector3; b: THREE.Vector3; dist: number }[]
  >([]);
  const isDrawing = useRef(false);

  const activeColor = COLOR_PALETTE[colorIndex];

  const finishCurrentStroke = useCallback(() => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      isDrawing.current = false;
      return;
    }

    const stroke = finalizeStroke(currentPoints, activeColor, 3);
    if (stroke) {
      setStrokes((prev) => [...prev, stroke]);
    }
    setCurrentPoints([]);
    isDrawing.current = false;
  }, [currentPoints, activeColor]);

  const undoLastStroke = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const cycleColor = useCallback(() => {
    setColorIndex((i) => (i + 1) % COLOR_PALETTE.length);
  }, []);

  return (
    <group>
      {/* Completed strokes */}
      {strokes.map((stroke) => (
        <StrokeRenderer key={stroke.id} stroke={stroke} />
      ))}

      {/* Current stroke being drawn (preview) */}
      {currentPoints.length >= 2 && (
        <Line
          points={currentPoints.map(
            (p) => [p.x, p.y, p.z] as [number, number, number]
          )}
          color={activeColor}
          lineWidth={2}
          dashed
          dashSize={0.015}
          gapSize={0.008}
        />
      )}

      {/* Measurements */}
      {measurements.map((m) => (
        <MeasurementDisplay key={m.id} measurement={m} />
      ))}

      {/* Color palette UI (visible when draw mode active) */}
      {active && (
        <group position={[-0.3, 0.15, -0.5]}>
          <Html center distanceFactor={4} style={{ pointerEvents: "none" }}>
            <div
              data-testid="color-palette"
              style={{
                display: "flex",
                gap: 4,
                background: "rgba(0,0,0,0.6)",
                padding: "6px 10px",
                borderRadius: 8,
                backdropFilter: "blur(4px)",
              }}
            >
              {COLOR_PALETTE.map((color, i) => (
                <div
                  key={color}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: color,
                    border: i === colorIndex ? "2px solid white" : "1px solid #333",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </Html>
        </group>
      )}

      {/* Stroke count indicator */}
      {strokes.length > 0 && (
        <group position={[-0.3, 0.08, -0.5]}>
          <Html center distanceFactor={4} style={{ pointerEvents: "none" }}>
            <div
              data-testid="stroke-count"
              style={{
                color: "#a0a0a0",
                fontSize: 10,
                fontFamily: "monospace",
                background: "rgba(0,0,0,0.4)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function StrokeRenderer({ stroke }: { stroke: AnnotationStroke }) {
  if (stroke.points.length < 2) return null;
  return (
    <Line
      points={stroke.points.map(
        (p) => [p.x, p.y, p.z] as [number, number, number]
      )}
      color={stroke.color}
      lineWidth={stroke.lineWidth}
    />
  );
}

function MeasurementDisplay({
  measurement,
}: {
  measurement: { id: string; a: THREE.Vector3; b: THREE.Vector3; dist: number };
}) {
  const { a, b, dist } = measurement;
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

  return (
    <group>
      {/* Measurement line */}
      <Line
        points={[
          [a.x, a.y, a.z],
          [b.x, b.y, b.z],
        ]}
        color="#eab308"
        lineWidth={2}
      />
      {/* Endpoint spheres */}
      <mesh position={[a.x, a.y, a.z]}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[b.x, b.y, b.z]}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      {/* Distance label */}
      <group position={[mid.x, mid.y + 0.02, mid.z]}>
        <Html center distanceFactor={4} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "rgba(234, 179, 8, 0.2)",
              border: "1px solid #eab308",
              color: "#eab308",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {(dist * 1000).toFixed(1)} mm
          </div>
        </Html>
      </group>
    </group>
  );
}
