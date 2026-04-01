"use client";

const tools = [
  { id: "select", label: "Select", icon: "◇", gesture: "fist" },
  { id: "line", label: "Line", icon: "╱", gesture: "peace" },
  { id: "circle", label: "Circle", icon: "○", gesture: "3 fingers" },
  { id: "rect", label: "Rect", icon: "□", gesture: "L-shape" },
  { id: "extrude", label: "Extrude", icon: "⬡", gesture: "pinch+drag" },
  { id: "pan", label: "Pan", icon: "✋", gesture: "open palm" },
];

export function Toolbar() {
  return (
    <div style={styles.bar}>
      <div style={styles.brand}>
        <span style={styles.logo}>◈</span>
        <span style={styles.title}>GestureCAD</span>
      </div>

      <div style={styles.tools}>
        {tools.map((tool) => (
          <button key={tool.id} style={styles.toolBtn} title={`${tool.label} (${tool.gesture})`}>
            <span style={styles.toolIcon}>{tool.icon}</span>
            <span style={styles.toolLabel}>{tool.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.spacer} />

      <div style={styles.actions}>
        <button style={styles.actionBtn}>File</button>
        <button style={styles.actionBtn}>Edit</button>
        <button style={styles.actionBtn}>View</button>
        <button style={styles.actionBtn}>Help</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    height: 44,
    background: "#141414",
    borderBottom: "1px solid #2a2a2a",
    padding: "0 12px",
    gap: 8,
    zIndex: 50,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginRight: 16,
  },
  logo: {
    fontSize: 20,
    color: "#3b82f6",
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#e5e5e5",
    letterSpacing: "-0.02em",
  },
  tools: {
    display: "flex",
    gap: 2,
  },
  toolBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 4,
    color: "#a0a0a0",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    transition: "all 0.15s",
  },
  toolIcon: {
    fontSize: 16,
  },
  toolLabel: {
    fontSize: 10,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    display: "flex",
    gap: 4,
  },
  actionBtn: {
    padding: "4px 12px",
    background: "transparent",
    border: "none",
    color: "#a0a0a0",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    borderRadius: 4,
  },
};
