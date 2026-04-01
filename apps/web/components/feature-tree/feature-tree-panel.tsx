"use client";

import { useCADState, useCADDispatch } from "@/lib/store";

export function FeatureTreePanel() {
  const { features, selectedFeatureId, entities } = useCADState();
  const dispatch = useCADDispatch();

  return (
    <div style={styles.panel} data-testid="feature-tree">
      <div style={styles.header}>
        <span style={styles.headerTitle}>Feature Tree</span>
        <span style={styles.badge}>{features.length}</span>
      </div>

      <div style={styles.list}>
        {/* Sketch node (always present if entities exist) */}
        {entities.length > 0 && (
          <div style={styles.node}>
            <span style={styles.nodeIcon}>✏️</span>
            <span style={styles.nodeName}>Sketch 1</span>
            <span style={styles.nodeInfo}>{entities.length} entities</span>
          </div>
        )}

        {/* Feature nodes */}
        {features.map((feature) => (
          <div
            key={feature.id}
            data-testid={`feature-node-${feature.id}`}
            style={{
              ...styles.node,
              ...(selectedFeatureId === feature.id ? styles.nodeSelected : {}),
            }}
            onClick={() => dispatch({ type: "SELECT_FEATURE", id: feature.id })}
          >
            <span style={styles.nodeIcon}>
              {feature.type === "extrude" ? "⬡" : feature.type === "revolve" ? "⟳" : "✏️"}
            </span>
            <span style={styles.nodeName}>{feature.name}</span>
            <span style={{
              ...styles.nodeStatus,
              color: feature.status === "ready" ? "#22c55e" :
                     feature.status === "computing" ? "#eab308" : "#ef4444",
            }}>
              {feature.status === "ready" ? "✓" : feature.status === "computing" ? "⏳" : "✗"}
            </span>
            <button
              style={styles.visToggle}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "TOGGLE_FEATURE_VISIBILITY", id: feature.id });
              }}
              title={feature.visible ? "Hide" : "Show"}
            >
              {feature.visible ? "👁" : "👁‍🗨"}
            </button>
          </div>
        ))}

        {features.length === 0 && entities.length === 0 && (
          <div style={styles.empty}>
            No features yet. Draw a sketch and extrude it.
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 220,
    height: "100%",
    background: "#141414",
    borderRight: "1px solid #2a2a2a",
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    fontFamily: "inherit",
    fontSize: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderBottom: "1px solid #2a2a2a",
  },
  headerTitle: {
    fontWeight: 600,
    color: "#e5e5e5",
    fontSize: 13,
  },
  badge: {
    background: "#2a2a2a",
    color: "#a0a0a0",
    padding: "1px 6px",
    borderRadius: 8,
    fontSize: 10,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  node: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    cursor: "pointer",
    color: "#a0a0a0",
    transition: "background 0.1s",
  },
  nodeSelected: {
    background: "#1e3a5f",
    color: "#e5e5e5",
  },
  nodeIcon: {
    fontSize: 14,
    width: 20,
    textAlign: "center" as const,
  },
  nodeName: {
    flex: 1,
  },
  nodeInfo: {
    fontSize: 10,
    color: "#666",
  },
  nodeStatus: {
    fontSize: 12,
  },
  visToggle: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    padding: "0 2px",
    opacity: 0.6,
  },
  empty: {
    padding: "20px 12px",
    color: "#444",
    textAlign: "center" as const,
    fontSize: 11,
    lineHeight: 1.5,
  },
};
