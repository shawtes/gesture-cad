"use client";

import { useCADState } from "@/lib/store";

interface StatusBarProps {
  gesture: string;
  fps: number;
  trackingActive: boolean;
}

const gestureLabels: Record<string, string> = {
  none: "No hand detected",
  point: "Point — Draw / Place",
  pinch: "Pinch — Confirm",
  fist: "Fist — Select",
  open_palm: "Open Palm — Pan",
  peace: "Peace — Line Tool",
  three_fingers: "Three Fingers — Circle Tool",
  thumbs_up: "Thumbs Up — Confirm",
  unknown: "Unrecognized gesture",
};

const toolLabels: Record<string, string> = {
  select: "Select",
  draw: "Point",
  line: "Line",
  circle: "Circle",
  rect: "Rectangle",
  arc: "Arc",
  spline: "Spline",
  extrude: "Extrude",
  union: "Union",
  subtract: "Cut",
  intersect: "Intersect",
  fillet: "Fillet",
  chamfer: "Chamfer",
  shell: "Shell",
  linear_pattern: "Linear Pattern",
  circular_pattern: "Circular Pattern",
  mirror: "Mirror",
  sweep: "Sweep",
  loft: "Loft",
  pan: "Pan",
  confirm: "Confirm",
};

export function StatusBar({ gesture, fps, trackingActive }: StatusBarProps) {
  const { activeTool, entities, constraints, constraintStatus, features } = useCADState();

  return (
    <div style={styles.bar} data-testid="status-bar">
      <div style={styles.section}>
        <span style={{
          ...styles.dot,
          background: trackingActive ? "#22c55e" : "#666",
        }} />
        <span style={styles.label}>
          {trackingActive ? "Tracking" : "Camera off"}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Tool:</span>
        <span data-testid="status-tool" style={{ ...styles.value, color: "#3b82f6" }}>
          {toolLabels[activeTool] || activeTool}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Gesture:</span>
        <span style={{
          ...styles.value,
          color: gesture !== "none" ? "#3b82f6" : "#666",
        }}>
          {gestureLabels[gesture] || gesture}
        </span>
      </div>

      <div style={styles.spacer} />

      <div style={styles.section}>
        <span style={styles.label}>Entities:</span>
        <span data-testid="status-entity-count" style={styles.value}>
          {entities.length}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Constraints:</span>
        <span data-testid="status-constraint-count" style={{
          ...styles.value,
          color: constraintStatus === "solved" ? "#22c55e" :
                 constraintStatus === "overconstrained" ? "#ef4444" :
                 "#a0a0a0",
        }}>
          {constraints.length}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Features:</span>
        <span data-testid="status-feature-count" style={styles.value}>
          {features.length}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>FPS:</span>
        <span style={{
          ...styles.value,
          color: fps > 24 ? "#22c55e" : fps > 15 ? "#eab308" : "#ef4444",
        }}>
          {fps}
        </span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Units: mm</span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Grid: 1.0</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    height: 28,
    background: "#141414",
    borderTop: "1px solid #2a2a2a",
    padding: "0 12px",
    gap: 16,
    fontSize: 11,
  },
  section: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    display: "inline-block",
  },
  label: {
    color: "#666",
  },
  value: {
    color: "#a0a0a0",
    fontWeight: 500,
  },
  spacer: {
    flex: 1,
  },
};
