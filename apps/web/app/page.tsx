"use client";

import { Viewport } from "@/components/viewport/viewport";
import { GestureOverlay } from "@/components/gesture/gesture-overlay";
import { Toolbar } from "@/components/toolbar/toolbar";
import { StatusBar } from "@/components/toolbar/status-bar";
import { useState } from "react";

export default function Home() {
  const [gesture, setGesture] = useState<string>("none");
  const [fps, setFps] = useState<number>(0);
  const [trackingActive, setTrackingActive] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar />
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <Viewport />
        <GestureOverlay
          onGestureDetected={setGesture}
          onFpsUpdate={setFps}
          onTrackingStatusChange={setTrackingActive}
        />
      </div>
      <StatusBar
        gesture={gesture}
        fps={fps}
        trackingActive={trackingActive}
      />
    </div>
  );
}
