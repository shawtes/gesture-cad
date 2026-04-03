"use client";

import { useState, useCallback } from "react";
import { useCADState, useCADDispatch } from "@/lib/store";

/* ── Icon + color config per feature type ── */
const FEATURE_META: Record<string, { icon: string; color: string }> = {
  extrude:          { icon: "\u2B21", color: "#3b82f6" },   // blue
  revolve:          { icon: "\u27F3", color: "#8b5cf6" },   // purple
  pocket:           { icon: "\u2B22", color: "#f59e0b" },   // amber
  fillet:           { icon: "\u25E0", color: "#10b981" },   // emerald
  chamfer:          { icon: "\u231C", color: "#14b8a6" },   // teal
  shell:            { icon: "\u25FB", color: "#6366f1" },   // indigo
  boolean:          { icon: "\u2295", color: "#ec4899" },   // pink
  loft:             { icon: "\u22C8", color: "#f97316" },   // orange
  sweep:            { icon: "\u219D", color: "#06b6d4" },   // cyan
  linear_pattern:   { icon: "\u2AFF", color: "#84cc16" },   // lime
  circular_pattern: { icon: "\u25CE", color: "#a855f7" },   // violet
  sketch:           { icon: "\u270E", color: "#64748b" },   // slate
};

const DEFAULT_META = { icon: "\u2B25", color: "#64748b" };

function getFeatureMeta(type: string) {
  return FEATURE_META[type] ?? DEFAULT_META;
}

export function FeatureTreePanel() {
  const { features, selectedFeatureId, entities } = useCADState();
  const dispatch = useCADDispatch();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sketchCollapsed, setSketchCollapsed] = useState(false);
  const [featuresCollapsed, setFeaturesCollapsed] = useState(false);

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIdx(idx);
  }, []);

  const handleDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      dispatch({ type: "REORDER_FEATURE", fromIndex: dragIdx, toIndex: idx });
    }
    setDragIdx(null);
    setDropTargetIdx(null);
  }, [dragIdx, dispatch]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropTargetIdx(null);
  }, []);

  const totalCount = features.length + (entities.length > 0 ? 1 : 0);

  return (
    <div style={panelStyle} data-testid="feature-tree">
      {/* ── Header ── */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={headerTitleStyle}>Feature List</span>
          <span style={countBadgeStyle}>{totalCount}</span>
        </div>
        {entities.length > 0 && (
          <span style={entityCountStyle}>{entities.length} entities</span>
        )}
      </div>

      {/* ── Scrollable list ── */}
      <div style={listStyle}>

        {/* ── Sketch section ── */}
        {entities.length > 0 && (
          <>
            <div
              style={sectionHeaderStyle}
              onClick={() => setSketchCollapsed(!sketchCollapsed)}
            >
              <span style={{
                ...chevronStyle,
                transform: sketchCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              }}>{"\u25BE"}</span>
              <span style={sectionLabelStyle}>Sketches</span>
            </div>

            {!sketchCollapsed && (
              <div style={nodeWrapStyle}>
                {/* Connecting line */}
                <div style={connectingLineStyle} />
                <div
                  style={{
                    ...nodeStyle,
                    borderLeft: `3px solid ${FEATURE_META.sketch.color}`,
                  }}
                >
                  {/* Drag handle placeholder (sketches are not draggable) */}
                  <span style={dragHandleStyle}>{"\u2847"}</span>

                  {/* Icon circle */}
                  <span style={{
                    ...iconCircleStyle,
                    background: `${FEATURE_META.sketch.color}22`,
                    color: FEATURE_META.sketch.color,
                  }}>
                    {FEATURE_META.sketch.icon}
                  </span>

                  <span style={nodeNameStyle}>Sketch 1</span>

                  {/* Status: sketches are always ready */}
                  <span style={statusDotReadyStyle} title="Ready" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Features section ── */}
        {features.length > 0 && (
          <>
            <div
              style={{
                ...sectionHeaderStyle,
                ...(entities.length > 0 ? { marginTop: 4 } : {}),
              }}
              onClick={() => setFeaturesCollapsed(!featuresCollapsed)}
            >
              <span style={{
                ...chevronStyle,
                transform: featuresCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              }}>{"\u25BE"}</span>
              <span style={sectionLabelStyle}>Features</span>
              <span style={sectionCountStyle}>{features.length}</span>
            </div>

            {!featuresCollapsed && features.map((feature, idx) => {
              const meta = getFeatureMeta(feature.type);
              const isSelected = selectedFeatureId === feature.id;
              const isHovered = hoveredId === feature.id;
              const isDragging = dragIdx === idx;
              const isDropTarget = dropTargetIdx === idx && dragIdx !== null && dragIdx !== idx;

              return (
                <div key={feature.id} style={nodeWrapStyle}>
                  {/* Connecting line */}
                  {idx < features.length - 1 && <div style={connectingLineStyle} />}
                  {/* Drop indicator line */}
                  {isDropTarget && <div style={dropIndicatorStyle} />}

                  <div
                    data-testid={`feature-node-${feature.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(idx, e)}
                    onDragOver={(e) => handleDragOver(idx, e)}
                    onDrop={(e) => handleDrop(idx, e)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredId(feature.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => dispatch({ type: "SELECT_FEATURE", id: feature.id })}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent("gesture-cad-edit-feature", {
                        detail: { featureId: feature.id, featureType: feature.type, params: feature.params },
                      }));
                    }}
                    style={{
                      ...nodeStyle,
                      borderLeft: isSelected
                        ? "3px solid #3b82f6"
                        : `3px solid ${meta.color}44`,
                      background: isSelected
                        ? "#1e3a5f"
                        : isHovered
                          ? "#1a1a2e"
                          : "transparent",
                      opacity: isDragging ? 0.4 : 1,
                      color: isSelected ? "#e5e5e5" : "#a0a0a0",
                    }}
                  >
                    {/* Drag handle */}
                    <span style={{
                      ...dragHandleStyle,
                      opacity: isHovered || isSelected ? 0.6 : 0.15,
                    }}>{"\u2847"}</span>

                    {/* Icon circle */}
                    <span style={{
                      ...iconCircleStyle,
                      background: isSelected ? `${meta.color}33` : `${meta.color}18`,
                      color: meta.color,
                    }}>
                      {meta.icon}
                    </span>

                    {/* Name */}
                    <span style={nodeNameStyle}>{feature.name}</span>

                    {/* Status indicator */}
                    {feature.status === "ready" && (
                      <span style={statusDotReadyStyle} title="Ready" />
                    )}
                    {feature.status === "computing" && (
                      <span style={statusSpinnerStyle} title="Computing...">
                        <span style={spinnerInnerStyle} />
                      </span>
                    )}
                    {feature.status === "error" && (
                      <span style={statusDotErrorStyle} title="Error" />
                    )}

                    {/* Visibility toggle */}
                    <button
                      style={{
                        ...visToggleStyle,
                        opacity: feature.visible
                          ? (isHovered || isSelected ? 0.9 : 0.5)
                          : 0.3,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "TOGGLE_FEATURE_VISIBILITY", id: feature.id });
                      }}
                      title={feature.visible ? "Hide" : "Show"}
                    >
                      {feature.visible ? "\uD83D\uDC41" : "\uD83D\uDC41\u200D\uD83D\uDDE8"}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Empty state ── */}
        {features.length === 0 && entities.length === 0 && (
          <div style={emptyWrapStyle}>
            <div style={emptyIconStyle}>{"\u2B21"}</div>
            <div style={emptyTitleStyle}>No features yet</div>
            <div style={emptySubStyle}>
              Draw a sketch and extrude it to see your feature tree here.
            </div>
          </div>
        )}
      </div>

      {/* ── CSS keyframes injected via style tag ── */}
      <style>{`
        @keyframes ftSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════ */

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: 260,
  height: "100%",
  background: "linear-gradient(180deg, #111118 0%, #0d0d14 100%)",
  borderRight: "1px solid #1e1e2a",
  zIndex: 5,
  display: "flex",
  flexDirection: "column",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 12,
  userSelect: "none",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px 10px",
  borderBottom: "1px solid #1e1e2a",
  background: "#13131b",
};

const headerLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#e5e5e5",
  fontSize: 13,
  letterSpacing: "0.02em",
};

const countBadgeStyle: React.CSSProperties = {
  background: "#3b82f620",
  color: "#60a5fa",
  padding: "1px 7px",
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 600,
  lineHeight: "16px",
};

const entityCountStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#525268",
  fontWeight: 500,
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "6px 0",
};

/* ── Section headers (Sketches / Features) ── */

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 14px 4px",
  cursor: "pointer",
  userSelect: "none",
};

const chevronStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#525268",
  transition: "transform 0.15s ease",
  display: "inline-block",
  width: 12,
  textAlign: "center",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#525268",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sectionCountStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#3e3e50",
  marginLeft: 2,
};

/* ── Node container (wraps connecting line + node) ── */

const nodeWrapStyle: React.CSSProperties = {
  position: "relative",
  paddingLeft: 20,
};

const connectingLineStyle: React.CSSProperties = {
  position: "absolute",
  left: 26,
  top: 0,
  bottom: 0,
  width: 1,
  background: "#1e1e2a",
  pointerEvents: "none",
};

const dropIndicatorStyle: React.CSSProperties = {
  position: "absolute",
  left: 20,
  right: 8,
  top: 0,
  height: 2,
  background: "#3b82f6",
  borderRadius: 1,
  zIndex: 2,
};

/* ── Feature node ── */

const nodeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "6px 10px 6px 8px",
  marginRight: 6,
  marginTop: 1,
  marginBottom: 1,
  borderRadius: "0 6px 6px 0",
  cursor: "pointer",
  color: "#a0a0a0",
  transition: "background 0.12s ease, border-color 0.12s ease, opacity 0.15s ease",
  position: "relative",
};

const dragHandleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#525268",
  cursor: "grab",
  lineHeight: 1,
  transition: "opacity 0.15s ease",
  flexShrink: 0,
  width: 10,
  textAlign: "center",
};

const iconCircleStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  flexShrink: 0,
  transition: "background 0.12s ease",
};

const nodeNameStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px",
};

/* ── Status indicators ── */

const statusDotReadyStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 4px #22c55e66",
  flexShrink: 0,
};

const statusDotErrorStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#ef4444",
  boxShadow: "0 0 4px #ef444466",
  flexShrink: 0,
};

const statusSpinnerStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  flexShrink: 0,
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const spinnerInnerStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: "1.5px solid #eab30833",
  borderTopColor: "#eab308",
  borderRadius: "50%",
  animation: "ftSpin 0.8s linear infinite",
};

/* ── Visibility toggle ── */

const visToggleStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  padding: "0 2px",
  transition: "opacity 0.12s ease",
  flexShrink: 0,
  lineHeight: 1,
};

/* ── Empty state ── */

const emptyWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  textAlign: "center",
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: 32,
  color: "#252535",
  marginBottom: 12,
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#3e3e50",
  marginBottom: 6,
};

const emptySubStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#2e2e40",
  lineHeight: 1.5,
  maxWidth: 180,
};
