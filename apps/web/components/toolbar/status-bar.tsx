"use client";

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

export function StatusBar({ gesture, fps, trackingActive }: StatusBarProps) {
  return (
    <div style={styles.bar}>
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
