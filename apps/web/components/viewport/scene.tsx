"use client";

import { useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SketchPlane } from "./sketch-plane";
import { SketchRenderer } from "./sketch-renderer";
import { SketchPreview } from "./sketch-preview";
import { ConstraintRenderer } from "./constraint-renderer";
import { MeshRenderer } from "./mesh-renderer";
import EditMode from "./edit-mode";
import { useCADState, type SketchPlaneId } from "@/lib/store";
import { HalfEdgeMesh, type MeshSelection } from "@/lib/mesh/half-edge";
import { useRef, useCallback } from "react";

interface SceneProps {
  handPosition: { x: number; y: number } | null;
  gesture: string;
  isPinching?: boolean;
}

/** Convert sketch coords to 3D world coords based on active plane */
function sketchTo3D(sx: number, sz: number, plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [sx, 0.02, sz];
    case "xy": return [sx, sz, 0.02];
    case "yz": return [0.02, sz, sx];
    default:   return [sx, 0.02, sz]; // 3d and custom planes → use XZ mapping
  }
}

/** Get the rotation to orient the grid/cursor on the active plane */
function getPlaneRotation(plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [0, 0, 0];
    case "xy": return [-Math.PI / 2, 0, 0];
    case "yz": return [0, 0, -Math.PI / 2];
    default:   return [0, 0, 0]; // 3d/custom → XZ orientation
  }
}

/** Get color for the active sketch plane */
function getPlaneColor(plane: SketchPlaneId): string {
  switch (plane) {
    case "xz": return "#22c55e";
    case "xy": return "#ef4444";
    case "yz": return "#3b82f6";
    default:   return "#f59e0b"; // 3d/custom → amber
  }
}

/**
 * GridPlane renders a flat grid using a single BufferGeometry with LineSegments.
 * This avoids per-line React components (hundreds of <Line> elements were slow/invisible).
 */
function GridPlane({ plane, isActive }: { plane: SketchPlaneId; isActive: boolean }) {
  const color = getPlaneColor(plane);
  const opacity = isActive ? 0.35 : 0.12;
  const size = 10;

  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let i = -size; i <= size; i++) {
      switch (plane) {
        case "xz":
          points.push(-size, 0, i, size, 0, i); // lines along X
          points.push(i, 0, -size, i, 0, size); // lines along Z
          break;
        case "xy":
          points.push(-size, i, 0, size, i, 0); // lines along X
          points.push(i, -size, 0, i, size, 0); // lines along Y
          break;
        case "yz":
          points.push(0, -size, i, 0, size, i); // lines along Y
          points.push(0, i, -size, 0, i, size); // lines along Z
          break;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [plane, size]);

  // Fill rotation for the transparent plane
  const fillRotation: [number, number, number] =
    plane === "xz" ? [-Math.PI / 2, 0, 0] :
    plane === "xy" ? [0, 0, 0] :
    [0, -Math.PI / 2, 0];

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>

      {/* Semi-transparent plane surface */}
      <mesh rotation={fillRotation}>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.04 : 0.015}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** All 3 plane grids visible — active one bright, others dim */
function ThreePlaneGrid({ activePlane }: { activePlane: SketchPlaneId }) {
  return (
    <group>
      <GridPlane plane="xz" isActive={activePlane === "xz"} />
      <GridPlane plane="xy" isActive={activePlane === "xy"} />
      <GridPlane plane="yz" isActive={activePlane === "yz"} />
    </group>
  );
}

/** Crosshair cursor on the active sketch plane */
function SketchCursor({ position, plane }: { position: { x: number; z: number }; plane: SketchPlaneId }) {
  const pos3D = sketchTo3D(position.x, position.z, plane);
  const color = getPlaneColor(plane);
  const rotation = getPlaneRotation(plane);

  const crossSize = 0.3;

  return (
    <group position={pos3D}>
      {/* Cursor dot */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Crosshair lines */}
      <group rotation={rotation}>
        <Line
          points={[[-crossSize, 0.001, 0], [crossSize, 0.001, 0]]}
          color={color}
          lineWidth={1.5}
          opacity={0.6}
          transparent
        />
        <Line
          points={[[0, 0.001, -crossSize], [0, 0.001, crossSize]]}
          color={color}
          lineWidth={1.5}
          opacity={0.6}
          transparent
        />
      </group>

      {/* Cursor ring */}
      <group rotation={rotation}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.13, 32]} />
          <meshBasicMaterial color={color} opacity={0.3} transparent />
        </mesh>
      </group>

      {/* Coordinate label */}
      <group position={[0.2, 0.15, 0]}>
        <mesh>
          <planeGeometry args={[0.8, 0.2]} />
          <meshBasicMaterial color="#000" opacity={0.7} transparent />
        </mesh>
      </group>
    </group>
  );
}

/** Origin marker with labeled axes */
function OriginMarker() {
  return (
    <group>
      <axesHelper args={[2]} />

      {/* Thicker colored axis lines */}
      <Line points={[[0,0,0], [2,0,0]]} color="#ef4444" lineWidth={2} />
      <Line points={[[0,0,0], [0,2,0]]} color="#22c55e" lineWidth={2} />
      <Line points={[[0,0,0], [0,0,2]]} color="#3b82f6" lineWidth={2} />

      {/* Axis labels */}
      <mesh position={[2.3, 0, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 0, 2.3]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

export function Scene({ handPosition, gesture, isPinching }: SceneProps) {
  const { activeTool, sketchPlane, interactionMode, editSelectionMode, features } = useCADState();
  const editMeshRef = useRef<HalfEdgeMesh | null>(null);

  // Build half-edge mesh from the first visible feature mesh for edit mode
  if (interactionMode === "edit" && !editMeshRef.current) {
    const visibleFeature = features.find((f) => f.visible && f.mesh);
    if (visibleFeature?.mesh) {
      editMeshRef.current = HalfEdgeMesh.fromTessellatedMesh(visibleFeature.mesh);
    }
  }
  if (interactionMode !== "edit") {
    editMeshRef.current = null;
  }

  const handleSelectionChange = useCallback((selection: MeshSelection) => {
    // Selection state is managed within EditMode component
    // Could dispatch to store if needed for external UI
  }, []);
  const [firstClick, setFirstClick] = useState<{ x: number; z: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);

  // Reset when tool or plane changes
  useEffect(() => {
    setFirstClick(null);
    setCursor(null);
  }, [activeTool, sketchPlane]);

  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect" ||
    activeTool === "arc" ||
    activeTool === "spline" ||
    activeTool === "ellipse";

  return (
    <group>
      {/* Invisible interaction handler */}
      <SketchPlane
        firstClick={firstClick}
        onFirstClickChange={setFirstClick}
        onCursorMove={setCursor}
        handPosition={handPosition}
        gesture={gesture}
        isPinching={isPinching}
      />

      {/* 3D grid system — all 3 planes visible, active one highlighted */}
      <ThreePlaneGrid activePlane={sketchPlane} />

      {/* Rendered sketch entities */}
      <SketchRenderer />
      <SketchPreview firstClick={firstClick} cursor={cursor} />
      <ConstraintRenderer />

      {/* 3D mesh features */}
      <MeshRenderer />

      {/* Edit mode overlay (vertex/edge/face selection) */}
      <EditMode
        mesh={editMeshRef.current}
        active={interactionMode === "edit"}
        selectionMode={editSelectionMode}
        onSelectionChange={handleSelectionChange}
      />

      {/* First-click indicator (amber dot on the active plane) */}
      {firstClick && (
        <mesh position={sketchTo3D(firstClick.x, firstClick.z, sketchPlane)}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* 3D cursor on active sketch plane */}
      {cursor && isSketchTool && (
        <SketchCursor position={cursor} plane={sketchPlane} />
      )}

      {/* Origin with labeled axes */}
      <OriginMarker />
    </group>
  );
}
