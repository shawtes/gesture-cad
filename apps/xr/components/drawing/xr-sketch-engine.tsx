"use client";

/**
 * XR Sketch Engine — Line, Circle, Rect tools for AR/VR
 *
 * Uses hand pinch gestures to define geometry:
 *   Line:   pinch start → release → pinch end
 *   Circle: pinch center → release → pinch edge (radius)
 *   Rect:   pinch corner1 → release → pinch corner2
 *
 * All geometry drawn on a virtual plane at the pinch height.
 * Rendered as holographic wireframes.
 */

import { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface XRSketchEngineProps {
  active: boolean;
  tool: "line" | "circle" | "rect";
}

interface SketchEntity {
  id: string;
  type: "line" | "circle" | "rect";
  points: THREE.Vector3[];
}

const PINCH_THRESHOLD = 0.025; // 2.5cm

export function XRSketchEngine({ active, tool }: XRSketchEngineProps) {
  const { gl } = useThree();
  const [entities, setEntities] = useState<SketchEntity[]>([]);
  const [firstPoint, setFirstPoint] = useState<THREE.Vector3 | null>(null);
  const [previewPoint, setPreviewPoint] = useState<THREE.Vector3 | null>(null);
  const wasPinching = useRef(false);

  useFrame(() => {
    if (!active) return;

    const session = gl.xr.getSession();
    const frame = gl.xr.getFrame();
    const refSpace = gl.xr.getReferenceSpace();
    if (!session || !frame || !refSpace) return;

    // Find right hand pinch position
    let pinchPos: THREE.Vector3 | null = null;
    let isPinching = false;

    for (const source of session.inputSources) {
      if (source.hand && source.handedness === "right") {
        const thumbTip = (source.hand as any).get("thumb-tip");
        const indexTip = (source.hand as any).get("index-finger-tip");
        if (thumbTip && indexTip) {
          const thumbPose = frame.getJointPose?.(thumbTip, refSpace);
          const indexPose = frame.getJointPose?.(indexTip, refSpace);
          if (thumbPose && indexPose) {
            const tp = thumbPose.transform.position;
            const ip = indexPose.transform.position;
            const thumb = new THREE.Vector3(tp.x, tp.y, tp.z);
            const index = new THREE.Vector3(ip.x, ip.y, ip.z);
            const dist = thumb.distanceTo(index);

            if (dist < PINCH_THRESHOLD) {
              isPinching = true;
              pinchPos = new THREE.Vector3().addVectors(thumb, index).multiplyScalar(0.5);
            } else {
              // Use index tip as preview position when not pinching
              pinchPos = index;
            }
          }
        }
      }

      // Controller fallback
      if (!source.hand && source.handedness === "right" && source.gripSpace) {
        const pose = frame.getPose(source.gripSpace, refSpace);
        if (pose) {
          const p = pose.transform.position;
          pinchPos = new THREE.Vector3(p.x, p.y, p.z);
          isPinching = source.gamepad?.buttons[0]?.pressed ?? false;
        }
      }
    }

    // Update preview
    if (pinchPos && firstPoint && !isPinching) {
      setPreviewPoint(pinchPos.clone());
    }

    // State machine: pinch down → set first point, pinch down again → complete
    if (isPinching && !wasPinching.current && pinchPos) {
      if (!firstPoint) {
        // First pinch — set start point
        setFirstPoint(pinchPos.clone());
      } else {
        // Second pinch — complete the entity
        const entity: SketchEntity = {
          id: `sketch_${Date.now()}`,
          type: tool,
          points: [firstPoint.clone(), pinchPos.clone()],
        };
        setEntities((prev) => [...prev, entity]);
        setFirstPoint(null);
        setPreviewPoint(null);
      }
    }

    wasPinching.current = isPinching;
  });

  if (!active) return null;

  return (
    <group>
      {/* Completed entities */}
      {entities.map((entity) => (
        <SketchEntityRenderer key={entity.id} entity={entity} />
      ))}

      {/* First point indicator */}
      {firstPoint && (
        <mesh position={firstPoint}>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshBasicMaterial color="#00ffcc" />
        </mesh>
      )}

      {/* Preview line/shape from first point to current hand position */}
      {firstPoint && previewPoint && (
        <SketchPreviewRenderer
          tool={tool}
          start={firstPoint}
          end={previewPoint}
        />
      )}
    </group>
  );
}

/** Render a completed sketch entity as holographic wireframe */
function SketchEntityRenderer({ entity }: { entity: SketchEntity }) {
  const [p1, p2] = entity.points;

  switch (entity.type) {
    case "line":
      return (
        <Line
          points={[p1.toArray(), p2.toArray()]}
          color="#00ffcc"
          lineWidth={2}
        />
      );

    case "circle": {
      const radius = p1.distanceTo(p2);
      const segments = 48;
      const circlePoints: [number, number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        circlePoints.push([
          p1.x + Math.cos(angle) * radius,
          p1.y,
          p1.z + Math.sin(angle) * radius,
        ]);
      }
      return <Line points={circlePoints} color="#00ffcc" lineWidth={2} />;
    }

    case "rect": {
      const corners: [number, number, number][] = [
        [p1.x, p1.y, p1.z],
        [p2.x, p1.y, p1.z],
        [p2.x, p1.y, p2.z],
        [p1.x, p1.y, p2.z],
        [p1.x, p1.y, p1.z], // close
      ];
      return <Line points={corners} color="#00ffcc" lineWidth={2} />;
    }

    default:
      return null;
  }
}

/** Preview while drawing — dashed line/shape */
function SketchPreviewRenderer({
  tool,
  start,
  end,
}: {
  tool: "line" | "circle" | "rect";
  start: THREE.Vector3;
  end: THREE.Vector3;
}) {
  switch (tool) {
    case "line":
      return (
        <Line
          points={[start.toArray(), end.toArray()]}
          color="#00ffcc"
          lineWidth={1}
          dashed
          dashSize={0.02}
          gapSize={0.01}
        />
      );

    case "circle": {
      const radius = start.distanceTo(end);
      const segments = 32;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        pts.push([
          start.x + Math.cos(angle) * radius,
          start.y,
          start.z + Math.sin(angle) * radius,
        ]);
      }
      return <Line points={pts} color="#00ffcc" lineWidth={1} dashed dashSize={0.02} gapSize={0.01} />;
    }

    case "rect": {
      const corners: [number, number, number][] = [
        [start.x, start.y, start.z],
        [end.x, start.y, start.z],
        [end.x, start.y, end.z],
        [start.x, start.y, end.z],
        [start.x, start.y, start.z],
      ];
      return <Line points={corners} color="#00ffcc" lineWidth={1} dashed dashSize={0.02} gapSize={0.01} />;
    }

    default:
      return null;
  }
}
