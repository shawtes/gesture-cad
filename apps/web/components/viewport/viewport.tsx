"use client";

import { useRef, useEffect, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { Scene } from "./scene";
import { useCADState } from "@/lib/store";
import type { TessellatedMesh } from "@/lib/features";
import type { TwoHandGesture } from "@/lib/gesture-engine";

interface ViewportGesture {
  type: TwoHandGesture;
  zoomFactor: number;
  rotationDegrees: number;
  panDelta: { x: number; y: number };
}

export interface HandNavigation {
  type: "pan" | "orbit";
  dx: number;
  dy: number;
}

interface ViewportProps {
  handPosition: { x: number; y: number } | null;
  gesture: string;
  isPinching?: boolean;
  viewportGesture?: ViewportGesture | null;
  extrudePreview?: { mesh: TessellatedMesh; distance: number } | null;
  handNavRef?: MutableRefObject<HandNavigation | null>;
}

function ViewportControls({ viewportGesture, handNavRef }: { viewportGesture?: ViewportGesture | null; handNavRef?: MutableRefObject<HandNavigation | null> }) {
  const { activeTool } = useCADState();
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect" ||
    activeTool === "arc" ||
    activeTool === "spline" ||
    activeTool === "ellipse" ||
    activeTool === "trim" ||
    activeTool === "offset" ||
    activeTool === "mirror" ||
    activeTool === "construction";

  // Apply two-hand gesture to camera
  useEffect(() => {
    if (!viewportGesture || !controlsRef.current) return;

    const controls = controlsRef.current;

    try {
      switch (viewportGesture.type) {
        case "zoom": {
          const factor = viewportGesture.zoomFactor;
          if (factor !== 1) {
            // Move camera along its forward direction
            const dir = camera.position.clone().normalize();
            const amount = (factor > 1 ? -1 : 1) * Math.abs(factor - 1) * 3;
            camera.position.addScaledVector(dir, amount);
          }
          break;
        }
        case "rotate": {
          // Rotate camera around target by adjusting azimuthal angle
          const angle = viewportGesture.rotationDegrees * 0.02;
          const target = controls.target.clone();
          const offset = camera.position.clone().sub(target);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const newX = offset.x * cos - offset.z * sin;
          const newZ = offset.x * sin + offset.z * cos;
          camera.position.set(target.x + newX, camera.position.y, target.z + newZ);
          camera.lookAt(target);
          break;
        }
        case "pan": {
          const panSpeed = 5;
          const dx = viewportGesture.panDelta.x * panSpeed;
          const dy = viewportGesture.panDelta.y * panSpeed;
          camera.position.x -= dx;
          camera.position.y += dy;
          controls.target.x -= dx;
          controls.target.y += dy;
          break;
        }
      }
    } catch (err) {
      // Silently ignore gesture control errors
    }
  }, [viewportGesture, camera]);

  // Hand navigation via useFrame — reads from ref, no re-render loops
  useFrame(() => {
    const nav = handNavRef?.current;
    if (!nav || !controlsRef.current) return;

    // Consume immediately so it only applies once per frame
    handNavRef.current = null;

    const controls = controlsRef.current;

    if (nav.type === "pan") {
      // Pan: hand left/right = move left/right, hand up/down = move up/down
      // Uses camera's local right for X, world Y for up/down
      const right = new THREE.Vector3();
      right.setFromMatrixColumn(camera.matrix, 0); // camera's local X
      right.y = 0;
      right.normalize();

      const speed = 6;
      const delta = new THREE.Vector3();
      delta.addScaledVector(right, -nav.dx * speed); // left/right
      delta.y += nav.dy * speed;                      // up/down in world Y

      camera.position.add(delta);
      controls.target.add(delta);
    } else if (nav.type === "orbit") {
      // Orbit: only horizontal rotation around Y axis through the target
      const angle = -nav.dx * 2.5;
      const target = controls.target.clone();
      const offset = camera.position.clone().sub(target);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const newX = offset.x * cosA - offset.z * sinA;
      const newZ = offset.x * sinA + offset.z * cosA;

      camera.position.set(target.x + newX, camera.position.y, target.z + newZ);
      camera.lookAt(target);
    }
  });

  // Disable orbit when dragging an entity
  const [dragLock, setDragLock] = useState(false);
  useEffect(() => {
    const lock = () => setDragLock(true);
    const unlock = () => setDragLock(false);
    window.addEventListener("gesture-cad-drag-start", lock);
    window.addEventListener("gesture-cad-drag-end", unlock);
    return () => {
      window.removeEventListener("gesture-cad-drag-start", lock);
      window.removeEventListener("gesture-cad-drag-end", unlock);
    };
  }, []);

  // ─── Listen for view preset / render mode / projection events from overlay ───
  useEffect(() => {
    const handleViewPreset = (e: Event) => {
      const { position } = (e as CustomEvent).detail;
      if (!position || !controlsRef.current) return;
      const [px, py, pz] = position;
      camera.position.set(px, py, pz);
      camera.lookAt(controlsRef.current.target);
      controlsRef.current.update();
    };

    /** Dynamic orbit: position camera using spherical coordinates (azimuth/elevation/distance) */
    const handleCameraOrbit = (e: Event) => {
      const { azimuthDeg, elevationDeg, distance } = (e as CustomEvent).detail;
      if (!controlsRef.current) return;

      const azRad = (azimuthDeg * Math.PI) / 180;
      const elRad = (elevationDeg * Math.PI) / 180;
      const target = controlsRef.current.target;

      // Spherical to Cartesian: x = d*cos(el)*sin(az), y = d*sin(el), z = d*cos(el)*cos(az)
      const x = target.x + distance * Math.cos(elRad) * Math.sin(azRad);
      const y = target.y + distance * Math.sin(elRad);
      const z = target.z + distance * Math.cos(elRad) * Math.cos(azRad);

      camera.position.set(x, y, z);
      camera.lookAt(target);
      controlsRef.current.update();
    };

    const handleProjection = (e: Event) => {
      const { projection } = (e as CustomEvent).detail;
      if (projection === "orthographic") {
        (camera as any).fov = undefined;
        // Switch to orthographic-like view by moving far and reducing FOV
        const dist = camera.position.length();
        camera.position.normalize().multiplyScalar(dist);
        if ("fov" in camera) {
          (camera as THREE.PerspectiveCamera).fov = 2;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
      } else {
        if ("fov" in camera) {
          (camera as THREE.PerspectiveCamera).fov = 50;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }
      }
    };

    const handleRenderMode = (e: Event) => {
      const { mode } = (e as CustomEvent).detail;
      // Dispatch a global render mode event that Scene can pick up
      window.dispatchEvent(new CustomEvent("gesture-cad-scene-render-mode", { detail: { mode } }));
    };

    window.addEventListener("gesture-cad-view-preset", handleViewPreset);
    window.addEventListener("gesture-cad-camera-orbit", handleCameraOrbit);
    window.addEventListener("gesture-cad-projection", handleProjection);
    window.addEventListener("gesture-cad-render-mode", handleRenderMode);
    return () => {
      window.removeEventListener("gesture-cad-view-preset", handleViewPreset);
      window.removeEventListener("gesture-cad-camera-orbit", handleCameraOrbit);
      window.removeEventListener("gesture-cad-projection", handleProjection);
      window.removeEventListener("gesture-cad-render-mode", handleRenderMode);
    };
  }, [camera]);

  // OrbitControls: right-click = orbit, middle = zoom, scroll = zoom
  // Left-click is NOT used by orbit — it's for select/draw in sketch-plane
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={100}
      enabled={!dragLock}
      mouseButtons={{
        LEFT: -1 as any,             // Disable left-click orbit
        MIDDLE: THREE.MOUSE.DOLLY,   // Middle = zoom
        RIGHT: THREE.MOUSE.ROTATE,   // Right = orbit
      }}
    />
  );
}

/** Renders an extrude preview mesh with semi-transparent material */
function ExtrudePreviewMesh({ mesh, distance }: { mesh: TessellatedMesh; distance: number }) {
  if (!mesh || !mesh.vertices || mesh.vertices.length < 3) return null;
  if (!mesh.indices || mesh.indices.length < 3) return null;

  // Guard against invalid array lengths
  let vertices: Float32Array, indices: Uint32Array, normals: Float32Array | undefined;
  try {
    vertices = new Float32Array(mesh.vertices);
    normals = mesh.normals && mesh.normals.length > 0 ? new Float32Array(mesh.normals) : undefined;
    indices = new Uint32Array(mesh.indices);
  } catch {
    return null; // Invalid mesh data — skip rendering
  }

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
        {normals && <bufferAttribute attach="attributes-normal" args={[normals, 3]} />}
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial
        color="#3b82f6"
        transparent
        opacity={0.4}
        side={2}
        wireframe={false}
      />
    </mesh>
  );
}

export function Viewport({ handPosition, gesture, isPinching, viewportGesture, extrudePreview, handNavRef }: ViewportProps) {
  // Validate extrude preview mesh to prevent Float32Array crashes
  const safePreview = extrudePreview && extrudePreview.mesh &&
    extrudePreview.mesh.vertices && extrudePreview.mesh.vertices.length >= 3 &&
    extrudePreview.mesh.indices && extrudePreview.mesh.indices.length >= 3
    ? extrudePreview : null;

  return (
    <div style={{ width: "100%", height: "100%", background: "#ffffff" }}>
      <Canvas
        camera={{ position: [8, 8, 8], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#ffffff" }}
        onCreated={(state) => { state.gl.setClearColor("#ffffff"); }}
      >
        <color attach="background" args={["#ffffff"]} />

        {/* Professional 3-point studio lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
        />
        <directionalLight position={[-6, 8, -4]} intensity={0.4} color="#b0c4de" />
        <directionalLight position={[0, -3, 8]} intensity={0.15} color="#ffd700" />
        <hemisphereLight args={["#b1e1ff", "#e8e8e8", 0.4]} />

        <Scene handPosition={handPosition} gesture={gesture} isPinching={isPinching} />

        {/* Interactive extrude preview */}
        {safePreview && (
          <ExtrudePreviewMesh mesh={safePreview.mesh} distance={safePreview.distance} />
        )}

        {/* 3D grid is now rendered inside Scene via ThreePlaneGrid */}

        <ViewportControls viewportGesture={viewportGesture} handNavRef={handNavRef} />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
          />
        </GizmoHelper>

      </Canvas>
    </div>
  );
}
