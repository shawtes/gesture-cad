"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Environment,
} from "@react-three/drei";
import { Scene } from "./scene";
import { useCADState } from "@/lib/store";

interface ViewportProps {
  handPosition: { x: number; y: number } | null;
  gesture: string;
}

function ViewportControls() {
  const { activeTool } = useCADState();
  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect";

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={1}
      maxDistance={100}
      enabled={!isSketchTool}
    />
  );
}

export function Viewport({ handPosition, gesture }: ViewportProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0a0a" }}>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0a0a" }}
      >
        <color attach="background" args={["#0a0a0a"]} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        <Scene handPosition={handPosition} gesture={gesture} />

        <Grid
          infiniteGrid
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1a1a2e"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#2a2a4e"
          fadeDistance={50}
          fadeStrength={1}
        />

        <ViewportControls />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
          />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
