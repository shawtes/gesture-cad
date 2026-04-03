"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  type AnnotationStroke,
  finalizeStroke,
  COLOR_PALETTE,
} from "@/lib/annotations";

interface DrawingEngineProps {
  active: boolean;
}

const PINCH_THRESHOLD = 0.025; // 2.5cm — "holding a pencil"
const MIN_POINT_DISTANCE = 0.003; // 3mm between samples

/**
 * 3D Drawing/Annotation engine.
 *
 * Pencil metaphor:
 *   PINCH (thumb+index close) = pen is down → drawing
 *   RELEASE (thumb+index apart) = pen is up → stroke finalized
 *
 * Works in both XR (hand tracking) and desktop (click-drag) modes.
 */
export function DrawingEngine({ active }: DrawingEngineProps) {
  const { gl, camera } = useThree();
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const isPinching = useRef(false);
  const lastPoint = useRef<THREE.Vector3 | null>(null);

  const activeColor = COLOR_PALETTE[colorIndex];

  // ─── Finalize stroke when pinch releases ───
  const finishCurrentStroke = useCallback(() => {
    if (currentPoints.length >= 2) {
      const stroke = finalizeStroke(currentPoints, activeColor, 3);
      if (stroke) {
        setStrokes((prev) => [...prev, stroke]);
      }
    }
    setCurrentPoints([]);
    lastPoint.current = null;
    isPinching.current = false;
  }, [currentPoints, activeColor]);

  // ─── Add a point while pinching (pen down) ───
  const addDrawPoint = useCallback((point: THREE.Vector3) => {
    // Skip if too close to last point (reduces noise)
    if (lastPoint.current && point.distanceTo(lastPoint.current) < MIN_POINT_DISTANCE) {
      return;
    }
    lastPoint.current = point.clone();
    setCurrentPoints((prev) => [...prev, point.clone()]);
  }, []);

  const undoLastStroke = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const cycleColor = useCallback(() => {
    setColorIndex((i) => (i + 1) % COLOR_PALETTE.length);
  }, []);

  // ─── XR Hand Tracking: detect pinch per frame ───
  useFrame((state) => {
    if (!active) return;

    const session = state.gl.xr.getSession();
    if (!session) return;

    const frame = state.gl.xr.getFrame();
    if (!frame) return;

    // Get hand input sources
    for (const source of session.inputSources) {
      if (source.hand && source.handedness === "right") {
        const refSpace = state.gl.xr.getReferenceSpace();
        if (!refSpace) continue;

        const thumbTip = source.hand.get("thumb-tip");
        const indexTip = source.hand.get("index-finger-tip");
        if (!thumbTip || !indexTip) continue;

        const thumbPose = frame.getJointPose?.(thumbTip, refSpace);
        const indexPose = frame.getJointPose?.(indexTip, refSpace);
        if (!thumbPose || !indexPose) continue;

        const thumbPos = new THREE.Vector3(
          thumbPose.transform.position.x,
          thumbPose.transform.position.y,
          thumbPose.transform.position.z
        );
        const indexPos = new THREE.Vector3(
          indexPose.transform.position.x,
          indexPose.transform.position.y,
          indexPose.transform.position.z
        );

        const distance = thumbPos.distanceTo(indexPos);
        const pinchPoint = new THREE.Vector3().addVectors(thumbPos, indexPos).multiplyScalar(0.5);

        if (distance < PINCH_THRESHOLD) {
          // Pen DOWN — pinching like holding a pencil
          if (!isPinching.current) {
            isPinching.current = true;
          }
          addDrawPoint(pinchPoint);
        } else {
          // Pen UP — released the pencil
          if (isPinching.current) {
            finishCurrentStroke();
          }
        }
      }
    }
  });

  // ─── Desktop fallback: click-drag to draw ───
  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const drawPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1); // plane at z=-1

    const getPoint = (e: PointerEvent): THREE.Vector3 | null => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const pt = new THREE.Vector3();
      return raycaster.ray.intersectPlane(drawPlane, pt) ? pt : null;
    };

    const onPointerDown = (e: PointerEvent) => {
      isPinching.current = true;
      const pt = getPoint(e);
      if (pt) addDrawPoint(pt);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPinching.current) return;
      const pt = getPoint(e);
      if (pt) addDrawPoint(pt);
    };

    const onPointerUp = () => {
      if (isPinching.current) {
        finishCurrentStroke();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [active, gl, camera, addDrawPoint, finishCurrentStroke]);

  return (
    <group>
      {/* Completed strokes */}
      {strokes.map((stroke) => (
        <StrokeRenderer key={stroke.id} stroke={stroke} />
      ))}

      {/* Current stroke being drawn (live preview) */}
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

      {/* Active drawing indicator — pencil tip dot */}
      {active && isPinching.current && lastPoint.current && (
        <mesh position={[lastPoint.current.x, lastPoint.current.y, lastPoint.current.z]}>
          <sphereGeometry args={[0.004, 8, 8]} />
          <meshBasicMaterial color={activeColor} />
        </mesh>
      )}

      {/* Color palette + controls (visible in draw mode) */}
      {active && (
        <group position={[-0.3, 0.15, -0.5]}>
          <Html center distanceFactor={4} style={{ pointerEvents: "auto" }}>
            <div
              data-testid="draw-controls"
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                background: "rgba(0,0,0,0.7)",
                padding: "8px 12px",
                borderRadius: 8,
                backdropFilter: "blur(4px)",
              }}
            >
              {COLOR_PALETTE.map((color, i) => (
                <div
                  key={color}
                  onClick={() => setColorIndex(i)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: color,
                    border: i === colorIndex ? "2px solid white" : "1px solid #444",
                    cursor: "pointer",
                  }}
                />
              ))}
              <div style={{ width: 1, height: 20, background: "#333", margin: "0 4px" }} />
              <button
                onClick={undoLastStroke}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #444",
                  color: "#e5e5e5",
                  padding: "4px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              >
                Undo
              </button>
              <div
                data-testid="stroke-count"
                style={{ color: "#666", fontSize: 10, fontFamily: "monospace" }}
              >
                {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
              </div>
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
