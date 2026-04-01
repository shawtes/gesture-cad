"use client";

import { useCADState, useCADDispatch, type ToolId } from "@/lib/store";

const tools: { id: ToolId; label: string; icon: string; gesture: string }[] = [
  { id: "select", label: "Select", icon: "◇", gesture: "fist" },
  { id: "draw", label: "Point", icon: "•", gesture: "point" },
  { id: "line", label: "Line", icon: "╱", gesture: "peace" },
  { id: "circle", label: "Circle", icon: "○", gesture: "3 fingers" },
  { id: "rect", label: "Rect", icon: "□", gesture: "L-shape" },
  { id: "pan", label: "Pan", icon: "✋", gesture: "open palm" },
];

export function Toolbar() {
  const { activeTool } = useCADState();
  const dispatch = useCADDispatch();

  return (
    <div style={styles.bar}>
      <div style={styles.brand}>
        <span style={styles.logo}>◈</span>
        <span style={styles.title}>GestureCAD</span>
      </div>

      <div style={styles.tools}>
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              data-testid={`tool-${tool.id}`}
              style={{
                ...styles.toolBtn,
                ...(isActive ? styles.toolBtnActive : {}),
              }}
              title={`${tool.label} (${tool.gesture})`}
              onClick={() => dispatch({ type: "SET_TOOL", tool: tool.id })}
            >
              <span style={styles.toolIcon}>{tool.icon}</span>
              <span style={styles.toolLabel}>{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.divider} />

      <button
        data-testid="btn-undo"
        style={styles.actionBtn}
        title="Undo (Ctrl+Z)"
        onClick={() => dispatch({ type: "UNDO" })}
      >
        Undo
      </button>
      <button
        data-testid="btn-redo"
        style={styles.actionBtn}
        title="Redo (Ctrl+Y)"
        onClick={() => dispatch({ type: "REDO" })}
      >
        Redo
      </button>

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
    flexDirection: "column" as const,
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
  toolBtnActive: {
    background: "#1e3a5f",
    border: "1px solid #3b82f6",
    color: "#e5e5e5",
  },
  toolIcon: {
    fontSize: 16,
  },
  toolLabel: {
    fontSize: 10,
  },
  divider: {
    width: 1,
    height: 24,
    background: "#2a2a2a",
    margin: "0 4px",
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
