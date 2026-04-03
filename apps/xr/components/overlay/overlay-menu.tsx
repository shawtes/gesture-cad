"use client";

/**
 * Overlay Menu — full tool menu rendered via DOM Overlay.
 * Appears as a 2D panel anchored to bottom-left of viewport.
 * Toggled by wrist gesture or button tap.
 */

import { useState } from "react";
import type { HologramPreset } from "@/lib/hologram-material";
import {
  createBox, createCylinder, createSphere, createCone, createTorus,
  createExtrudedRect, createExtrudedCircle, createExtrudedPolygon,
  generateHouse, type CADObject,
} from "@/lib/local-cad-engine";

interface OverlayMenuProps {
  visible: boolean;
  onClose: () => void;
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onAddObject: (obj: CADObject) => void;
  onAddObjects: (objs: CADObject[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  tableHeight: number;
  onTableHeightChange: (h: number) => void;
  tableScale: number;
  onTableScaleChange: (s: number) => void;
  onClearAll: () => void;
  onExitXR: () => void;
  preset: HologramPreset;
  onPresetChange: (p: HologramPreset) => void;
  wireframe: boolean;
  onWireframeToggle: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  action?: () => void;
  children?: MenuItem[];
}

const PRESET_HEX: Record<string, string> = {
  cyan: "#00ffcc", blue: "#00aaff", green: "#22ff66",
  orange: "#ff8800", purple: "#aa44ff",
};

export function OverlayMenu({
  visible, onClose, activeTool, onToolSelect,
  onAddObject, onAddObjects, onUndo, onRedo, onClearAll, onExitXR,
  preset, onPresetChange, wireframe, onWireframeToggle,
  tableHeight, onTableHeightChange, tableScale, onTableScaleChange,
}: OverlayMenuProps) {
  const [subMenu, setSubMenu] = useState<string | null>(null);
  const [size, setSize] = useState(1);
  const [extrudeH, setExtrudeH] = useState(1);

  if (!visible) return null;

  const addPrimitive = (type: string) => {
    const s = size;
    switch (type) {
      case "box": onAddObject(createBox(s, s, s)); break;
      case "cylinder": onAddObject(createCylinder(s / 2, s)); break;
      case "sphere": onAddObject(createSphere(s / 2)); break;
      case "cone": onAddObject(createCone(s / 2, s)); break;
      case "torus": onAddObject(createTorus(s / 2, s / 6)); break;
    }
  };

  const addSketch = (type: string) => {
    switch (type) {
      case "rect": onAddObject(createExtrudedRect(-size/2, -size/2, size/2, size/2, extrudeH)); break;
      case "circle": onAddObject(createExtrudedCircle(0, 0, size/2, extrudeH)); break;
      case "polygon": onAddObject(createExtrudedPolygon(0, 0, size/2, 6, extrudeH)); break;
    }
  };

  return (
    <div data-xr-ui style={panel} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={header}>
        <span style={{ fontSize: 14 }}>◈</span>
        <span style={{ flex: 1, fontWeight: 700 }}>MENU</span>
        <button style={closeBtn} onClick={onClose}>✕</button>
      </div>

      {!subMenu && (
        <div style={scroll}>
          {/* Quick add */}
          <div style={section}>ADD</div>
          <div style={grid}>
            {["box", "cylinder", "sphere", "cone", "torus"].map(p => (
              <button key={p} style={gridBtn} onClick={() => addPrimitive(p)}>
                {p === "box" ? "▣" : p === "cylinder" ? "⊙" : p === "sphere" ? "●" : p === "cone" ? "△" : "◎"}
                <span style={{ fontSize: 9 }}>{p}</span>
              </button>
            ))}
          </div>

          {/* Size slider */}
          <div style={{ ...labelStyle, marginTop: 6 }}>Size: {size.toFixed(1)}m</div>
          <input type="range" min={0.1} max={3} step={0.1} value={size}
            onChange={e => setSize(parseFloat(e.target.value))} style={slider} />

          {/* Sketch shapes */}
          <div style={section}>SKETCH + EXTRUDE</div>
          <div style={{ ...labelStyle }}>Height: {extrudeH.toFixed(1)}m</div>
          <input type="range" min={0.1} max={5} step={0.1} value={extrudeH}
            onChange={e => setExtrudeH(parseFloat(e.target.value))} style={slider} />
          <div style={row}>
            <button style={rowBtn} onClick={() => addSketch("rect")}>□ Rect</button>
            <button style={rowBtn} onClick={() => addSketch("circle")}>○ Circle</button>
            <button style={rowBtn} onClick={() => addSketch("polygon")}>⬡ Poly</button>
          </div>

          {/* Generate */}
          <div style={section}>GENERATE</div>
          <div style={row}>
            <button style={rowBtn} onClick={() => onAddObjects(generateHouse("1bed"))}>1-Bed</button>
            <button style={rowBtn} onClick={() => onAddObjects(generateHouse("2bed"))}>2-Bed</button>
            <button style={rowBtn} onClick={() => onAddObjects(generateHouse("3bed"))}>3-Bed</button>
          </div>

          {/* Tools */}
          <div style={section}>TOOLS</div>
          <button style={menuBtn} onClick={() => setSubMenu("sketch")}>✏️ Sketch Tools ›</button>
          <button style={menuBtn} onClick={() => setSubMenu("modify")}>⚙ Modify ›</button>
          <button style={menuBtn} onClick={() => setSubMenu("sculpt")}>🔮 Sculpt ›</button>
          <button style={menuBtn} onClick={() => setSubMenu("color")}>◑ Color ›</button>

          {/* Table adjustment */}
          <div style={section}>TABLE</div>
          <div style={labelStyle}>Height: {tableHeight.toFixed(2)}m</div>
          <input type="range" min={0.4} max={1.2} step={0.02} value={tableHeight}
            onChange={e => onTableHeightChange(parseFloat(e.target.value))} style={slider} />
          <div style={labelStyle}>Scale: {tableScale.toFixed(1)}x</div>
          <input type="range" min={0.5} max={2.0} step={0.1} value={tableScale}
            onChange={e => onTableScaleChange(parseFloat(e.target.value))} style={slider} />

          {/* Actions */}
          <div style={section}>ACTIONS</div>
          <div style={row}>
            <button style={rowBtn} onClick={onUndo}>↩ Undo</button>
            <button style={rowBtn} onClick={onRedo}>↪ Redo</button>
          </div>
          <button style={menuBtn} onClick={onWireframeToggle}>
            {wireframe ? "◼ Solid View" : "◻ Wireframe"}
          </button>
          <button style={{ ...menuBtn, color: "#ff6666" }} onClick={onClearAll}>
            Clear All
          </button>
          <button style={{ ...menuBtn, color: "#ff4444", borderColor: "#ff444440" }} onClick={onExitXR}>
            ✕ Exit XR
          </button>
        </div>
      )}

      {/* Sub-menus */}
      {subMenu === "sketch" && (
        <div style={scroll}>
          <button style={backBtn} onClick={() => setSubMenu(null)}>← Back</button>
          {[
            { id: "line", label: "Line", icon: "╱" },
            { id: "rect", label: "Rectangle", icon: "□" },
            { id: "circle", label: "Circle", icon: "○" },
            { id: "arc", label: "Arc", icon: "⌒" },
            { id: "polygon", label: "Polygon", icon: "⬡" },
            { id: "spline", label: "Spline", icon: "∿" },
            { id: "draw", label: "Freehand", icon: "✎" },
          ].map(t => (
            <button key={t.id} style={{ ...menuBtn, ...(activeTool === t.id ? activeBtn : {}) }}
              onClick={() => { onToolSelect(t.id); onClose(); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {subMenu === "modify" && (
        <div style={scroll}>
          <button style={backBtn} onClick={() => setSubMenu(null)}>← Back</button>
          {[
            { id: "extrude", label: "Extrude", icon: "↑" },
            { id: "fillet", label: "Fillet", icon: "◠" },
            { id: "chamfer", label: "Chamfer", icon: "⌐" },
            { id: "shell", label: "Shell", icon: "◫" },
            { id: "hole", label: "Hole", icon: "◎" },
            { id: "union", label: "Union", icon: "∪" },
            { id: "subtract", label: "Subtract", icon: "∖" },
            { id: "mirror", label: "Mirror", icon: "⊣" },
            { id: "linear_pattern", label: "L.Pattern", icon: "⋯" },
            { id: "circular_pattern", label: "C.Pattern", icon: "◌" },
          ].map(t => (
            <button key={t.id} style={{ ...menuBtn, ...(activeTool === t.id ? activeBtn : {}) }}
              onClick={() => { onToolSelect(t.id); onClose(); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {subMenu === "sculpt" && (
        <div style={scroll}>
          <button style={backBtn} onClick={() => setSubMenu(null)}>← Back</button>
          {[
            { id: "sculpt_grab", label: "Grab", icon: "✊" },
            { id: "sculpt_smooth", label: "Smooth", icon: "≋" },
            { id: "sculpt_inflate", label: "Inflate", icon: "◉" },
            { id: "edit_mode", label: "Edit Mode", icon: "◆" },
            { id: "uv_unwrap", label: "UV Unwrap", icon: "⊞" },
            { id: "add_bone", label: "Armature", icon: "🦴" },
            { id: "timeline", label: "Animation", icon: "▶" },
            { id: "render_capture", label: "Render", icon: "📷" },
          ].map(t => (
            <button key={t.id} style={{ ...menuBtn, ...(activeTool === t.id ? activeBtn : {}) }}
              onClick={() => { onToolSelect(t.id); onClose(); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {subMenu === "color" && (
        <div style={scroll}>
          <button style={backBtn} onClick={() => setSubMenu(null)}>← Back</button>
          {(["cyan", "blue", "green", "orange", "purple"] as const).map(c => (
            <button key={c} style={{ ...menuBtn, borderLeft: `4px solid ${PRESET_HEX[c]}`,
              ...(preset === c ? activeBtn : {}) }}
              onClick={() => { onPresetChange(c); }}>
              ● {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───
const panel: React.CSSProperties = {
  position: "fixed", bottom: 60, left: 10, width: 220, maxHeight: "70vh",
  background: "rgba(245,240,232,0.97)", border: "1px solid #d4cfc7",
  borderRadius: 16, pointerEvents: "auto", overflow: "hidden",
  fontFamily: "'SF Mono', Menlo, monospace", fontSize: 12, color: "#333",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
};
const header: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
  borderBottom: "1px solid #d4cfc7", color: "#00886a",
};
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, background: "transparent", color: "#666",
  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16, fontFamily: "inherit",
};
const scroll: React.CSSProperties = {
  maxHeight: "calc(70vh - 50px)", overflowY: "auto", padding: "8px 10px",
};
const section: React.CSSProperties = {
  fontSize: 9, color: "#999", letterSpacing: "0.15em", marginBottom: 6, marginTop: 8,
};
const labelStyle: React.CSSProperties = { fontSize: 10, color: "#777", marginBottom: 2 };
const slider: React.CSSProperties = {
  width: "100%", accentColor: "#00ccaa", height: 20, marginBottom: 6,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 6,
};
const gridBtn: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  padding: "8px 0", background: "rgba(0,180,140,0.08)", color: "#00886a",
  border: "1px solid rgba(0,180,140,0.2)", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 16,
};
const row: React.CSSProperties = { display: "flex", gap: 4, marginBottom: 4 };
const rowBtn: React.CSSProperties = {
  flex: 1, padding: "8px 0", background: "rgba(0,150,200,0.06)", color: "#2288dd",
  border: "1px solid rgba(0,150,200,0.2)", borderRadius: 6, cursor: "pointer",
  fontFamily: "inherit", fontSize: 11, textAlign: "center",
};
const menuBtn: React.CSSProperties = {
  width: "100%", padding: "10px 10px", textAlign: "left",
  background: "transparent", color: "#555", border: "none", borderRadius: 6,
  cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginBottom: 1,
  borderLeft: "3px solid transparent",
};
const activeBtn: React.CSSProperties = {
  background: "rgba(0,180,140,0.08)", color: "#00886a", borderLeftColor: "#00ccaa",
};
const backBtn: React.CSSProperties = {
  width: "100%", padding: "8px 10px", textAlign: "left",
  background: "transparent", color: "#2288dd", border: "none",
  borderBottom: "1px solid #e0dbd3",
  cursor: "pointer", fontFamily: "inherit", fontSize: 11, marginBottom: 6,
};
