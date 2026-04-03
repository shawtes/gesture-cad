"use client";

/**
 * Overlay Menu — full CAD tool menu rendered via DOM Overlay.
 * Works in AR/VR on Quest. All buttons functional.
 */

import { useState } from "react";
import type { HologramPreset } from "@/lib/hologram-material";
import {
  createBox, createCylinder, createSphere, createCone, createTorus,
  createExtrudedRect, createExtrudedCircle, createExtrudedPolygon,
  generateHouse, cloneObject, mirrorObject, linearPattern, circularPattern,
  applyExtrude, scaleObject,
  type CADObject, type MaterialMode,
} from "@/lib/local-cad-engine";

interface OverlayMenuProps {
  visible: boolean;
  onClose: () => void;
  activeTool: string;
  onToolSelect: (tool: string) => void;
  onAddObject: (obj: CADObject) => void;
  onAddObjects: (objs: CADObject[]) => void;
  onUpdateObject: (id: string, obj: CADObject) => void;
  onDeleteObject: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onExitXR: () => void;
  preset: HologramPreset;
  onPresetChange: (p: HologramPreset) => void;
  wireframe: boolean;
  onWireframeToggle: () => void;
  tableHeight: number;
  onTableHeightChange: (h: number) => void;
  tableScale: number;
  onTableScaleChange: (s: number) => void;
  materialMode: MaterialMode;
  onMaterialModeChange: (m: MaterialMode) => void;
  selectedId: string | null;
  selectedObject: CADObject | null;
  objects: CADObject[];
  onSelectObject: (id: string | null) => void;
}

const PRESET_HEX: Record<string, string> = {
  cyan: "#00ffcc", blue: "#00aaff", green: "#22ff66",
  orange: "#ff8800", purple: "#aa44ff",
};

const MATERIALS: { id: MaterialMode; label: string; icon: string }[] = [
  { id: "hologram", label: "Hologram", icon: "◇" },
  { id: "solid", label: "Solid", icon: "◼" },
  { id: "wireframe", label: "Wire", icon: "◻" },
  { id: "glass", label: "Glass", icon: "◊" },
  { id: "metallic", label: "Metal", icon: "◆" },
  { id: "matte", label: "Matte", icon: "●" },
];

export function OverlayMenu({
  visible, onClose, activeTool, onToolSelect,
  onAddObject, onAddObjects, onUpdateObject, onDeleteObject,
  onUndo, onRedo, onClearAll, onExitXR,
  preset, onPresetChange, wireframe, onWireframeToggle,
  tableHeight, onTableHeightChange, tableScale, onTableScaleChange,
  materialMode, onMaterialModeChange,
  selectedId, selectedObject, objects, onSelectObject,
}: OverlayMenuProps) {
  const [subMenu, setSubMenu] = useState<string | null>(null);
  const [size, setSize] = useState(1);
  const [extrudeH, setExtrudeH] = useState(1);
  const [patternCount, setPatternCount] = useState(4);
  const [patternSpacing, setPatternSpacing] = useState(1.5);
  const [objScale, setObjScale] = useState(1);

  if (!visible) return null;

  const addPrimitive = (type: string) => {
    switch (type) {
      case "box": onAddObject(createBox(size, size, size)); break;
      case "cylinder": onAddObject(createCylinder(size / 2, size)); break;
      case "sphere": onAddObject(createSphere(size / 2)); break;
      case "cone": onAddObject(createCone(size / 2, size)); break;
      case "torus": onAddObject(createTorus(size / 2, size / 6)); break;
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
      <div style={header}>
        <span style={{ fontSize: 14 }}>◈</span>
        <span style={{ flex: 1, fontWeight: 700 }}>MENU</span>
        <button style={closeBtn} onClick={onClose}>✕</button>
      </div>

      {!subMenu && (
        <div style={scroll}>
          {/* ═══ ADD PRIMITIVES ═══ */}
          <div style={sec}>ADD SHAPES</div>
          <div style={grid5}>
            {[
              { id: "box", icon: "▣", label: "Box" },
              { id: "cylinder", icon: "⊙", label: "Cyl" },
              { id: "sphere", icon: "●", label: "Sph" },
              { id: "cone", icon: "△", label: "Cone" },
              { id: "torus", icon: "◎", label: "Tor" },
            ].map(p => (
              <button key={p.id} style={gridBtn} onClick={() => addPrimitive(p.id)}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <span style={{ fontSize: 8 }}>{p.label}</span>
              </button>
            ))}
          </div>

          <div style={lbl}>Size: {size.toFixed(1)}m</div>
          <input type="range" min={0.1} max={3} step={0.1} value={size}
            onChange={e => setSize(parseFloat(e.target.value))} style={sld} />

          {/* ═══ SKETCH + EXTRUDE ═══ */}
          <div style={sec}>SKETCH + EXTRUDE</div>
          <div style={lbl}>Height: {extrudeH.toFixed(1)}m</div>
          <input type="range" min={0.1} max={5} step={0.1} value={extrudeH}
            onChange={e => setExtrudeH(parseFloat(e.target.value))} style={sld} />
          <div style={row}>
            <button style={rBtn} onClick={() => addSketch("rect")}>□ Rect</button>
            <button style={rBtn} onClick={() => addSketch("circle")}>○ Circle</button>
            <button style={rBtn} onClick={() => addSketch("polygon")}>⬡ Poly</button>
          </div>

          {/* ═══ GENERATE ═══ */}
          <div style={sec}>GENERATE HOUSE</div>
          <div style={row}>
            <button style={rBtn} onClick={() => onAddObjects(generateHouse("1bed"))}>1-Bed</button>
            <button style={rBtn} onClick={() => onAddObjects(generateHouse("2bed"))}>2-Bed</button>
            <button style={rBtn} onClick={() => onAddObjects(generateHouse("3bed"))}>3-Bed</button>
          </div>

          {/* ═══ SELECTED OBJECT ═══ */}
          {selectedObject && (
            <>
              <div style={sec}>SELECTED: {selectedObject.name}</div>
              <div style={lbl}>Scale: {objScale.toFixed(1)}x</div>
              <input type="range" min={0.1} max={5} step={0.1} value={objScale}
                onChange={e => {
                  const s = parseFloat(e.target.value);
                  setObjScale(s);
                  onUpdateObject(selectedObject.id, scaleObject(selectedObject, s));
                }} style={sld} />
              <div style={row}>
                <button style={rBtn} onClick={() => {
                  onAddObject(cloneObject(selectedObject, [0.5, 0, 0]));
                }}>Clone</button>
                <button style={rBtn} onClick={() => {
                  onAddObject(mirrorObject(selectedObject));
                }}>Mirror</button>
              </div>
              <div style={row}>
                <button style={rBtn} onClick={() => {
                  onUpdateObject(selectedObject.id, applyExtrude(selectedObject, extrudeH));
                }}>+Extrude</button>
                <button style={{ ...rBtn, color: "#e44" }} onClick={() => {
                  onDeleteObject(selectedObject.id);
                }}>Delete</button>
              </div>

              {/* Pattern */}
              <div style={lbl}>Pattern Count: {patternCount}</div>
              <input type="range" min={2} max={12} step={1} value={patternCount}
                onChange={e => setPatternCount(parseInt(e.target.value))} style={sld} />
              <div style={lbl}>Spacing: {patternSpacing.toFixed(1)}m</div>
              <input type="range" min={0.3} max={4} step={0.1} value={patternSpacing}
                onChange={e => setPatternSpacing(parseFloat(e.target.value))} style={sld} />
              <div style={row}>
                <button style={rBtn} onClick={() => {
                  onAddObjects(linearPattern(selectedObject, patternCount, patternSpacing));
                }}>L.Pattern</button>
                <button style={rBtn} onClick={() => {
                  onAddObjects(circularPattern(selectedObject, patternCount));
                }}>C.Pattern</button>
              </div>
            </>
          )}

          {/* ═══ TOOLS ═══ */}
          <div style={sec}>TOOLS</div>
          <button style={mBtn} onClick={() => setSubMenu("sketch")}>✏️ Sketch Tools ›</button>
          <button style={mBtn} onClick={() => setSubMenu("modify")}>⚙ Modify ›</button>
          <button style={mBtn} onClick={() => setSubMenu("sculpt")}>🔮 Sculpt ›</button>

          {/* ═══ MATERIAL & COLOR ═══ */}
          <div style={sec}>MATERIAL</div>
          <div style={grid3}>
            {MATERIALS.map(m => (
              <button key={m.id} style={{
                ...matBtn, ...(materialMode === m.id ? matBtnAct : {}),
              }} onClick={() => onMaterialModeChange(m.id)}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <div style={sec}>COLOR</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["cyan", "blue", "green", "orange", "purple"] as const).map(c => (
              <button key={c} onClick={() => onPresetChange(c)} style={{
                width: 30, height: 30, borderRadius: 15, background: PRESET_HEX[c],
                border: preset === c ? "3px solid #333" : "3px solid transparent",
                cursor: "pointer",
              }} />
            ))}
          </div>

          {/* ═══ TABLE ═══ */}
          <div style={sec}>TABLE</div>
          <div style={lbl}>Height: {tableHeight.toFixed(2)}m</div>
          <input type="range" min={0.4} max={1.2} step={0.02} value={tableHeight}
            onChange={e => onTableHeightChange(parseFloat(e.target.value))} style={sld} />
          <div style={lbl}>Scale: {tableScale.toFixed(1)}x</div>
          <input type="range" min={0.5} max={2.0} step={0.1} value={tableScale}
            onChange={e => onTableScaleChange(parseFloat(e.target.value))} style={sld} />

          {/* ═══ OBJECTS LIST ═══ */}
          {objects.length > 0 && (
            <>
              <div style={sec}>OBJECTS ({objects.length})</div>
              <div style={{ maxHeight: 120, overflowY: "auto" }}>
                {objects.map(o => (
                  <button key={o.id} style={{
                    ...objBtn, ...(o.id === selectedId ? objBtnSel : {}),
                  }} onClick={() => onSelectObject(o.id === selectedId ? null : o.id)}>
                    {o.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ═══ ACTIONS ═══ */}
          <div style={sec}>ACTIONS</div>
          <div style={row}>
            <button style={rBtn} onClick={onUndo}>↩ Undo</button>
            <button style={rBtn} onClick={onRedo}>↪ Redo</button>
          </div>
          <button style={mBtn} onClick={onWireframeToggle}>
            {wireframe ? "◼ Solid View" : "◻ Wireframe"}
          </button>
          <button style={{ ...mBtn, color: "#c44" }} onClick={onClearAll}>Clear All</button>
          <button style={{ ...mBtn, color: "#e33", fontWeight: 700 }} onClick={onExitXR}>✕ Exit XR</button>
        </div>
      )}

      {/* ═══ SUB-MENUS ═══ */}
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
            <button key={t.id} style={{ ...mBtn, ...(activeTool === t.id ? actBtn : {}) }}
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
            { id: "extrude", label: "Extrude" },
            { id: "fillet", label: "Fillet" },
            { id: "chamfer", label: "Chamfer" },
            { id: "shell", label: "Shell" },
            { id: "hole", label: "Hole" },
            { id: "union", label: "Union" },
            { id: "subtract", label: "Subtract" },
            { id: "mirror", label: "Mirror" },
            { id: "linear_pattern", label: "Linear Pattern" },
            { id: "circular_pattern", label: "Circular Pattern" },
          ].map(t => (
            <button key={t.id} style={{ ...mBtn, ...(activeTool === t.id ? actBtn : {}) }}
              onClick={() => { onToolSelect(t.id); onClose(); }}>
              {t.label}
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
          ].map(t => (
            <button key={t.id} style={{ ...mBtn, ...(activeTool === t.id ? actBtn : {}) }}
              onClick={() => { onToolSelect(t.id); onClose(); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───
const panel: React.CSSProperties = {
  position: "fixed", bottom: 60, left: 10, width: 240, maxHeight: "75vh",
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
  width: 32, height: 32, background: "#f0ece4", border: "none",
  borderRadius: 8, cursor: "pointer", fontSize: 16, color: "#999", fontFamily: "inherit",
};
const scroll: React.CSSProperties = { maxHeight: "calc(75vh - 50px)", overflowY: "auto", padding: "8px 10px" };
const sec: React.CSSProperties = { fontSize: 9, color: "#999", letterSpacing: "0.15em", marginBottom: 6, marginTop: 10 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#777", marginBottom: 2 };
const sld: React.CSSProperties = { width: "100%", accentColor: "#00ccaa", height: 24, marginBottom: 6 };
const grid5: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 6 };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 6 };
const gridBtn: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  padding: "10px 0", background: "rgba(0,180,140,0.06)", color: "#00886a",
  border: "1px solid rgba(0,180,140,0.15)", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", minHeight: 48,
};
const row: React.CSSProperties = { display: "flex", gap: 4, marginBottom: 6 };
const rBtn: React.CSSProperties = {
  flex: 1, padding: "10px 0", background: "rgba(0,150,200,0.06)", color: "#2277bb",
  border: "1px solid rgba(0,150,200,0.15)", borderRadius: 6, cursor: "pointer",
  fontFamily: "inherit", fontSize: 11, textAlign: "center", minHeight: 40,
};
const mBtn: React.CSSProperties = {
  width: "100%", padding: "12px 10px", textAlign: "left",
  background: "transparent", color: "#555", border: "none", borderRadius: 6,
  cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 2,
  borderLeft: "3px solid transparent", minHeight: 44,
};
const actBtn: React.CSSProperties = {
  background: "rgba(0,180,140,0.08)", color: "#00886a", borderLeftColor: "#00ccaa",
};
const backBtn: React.CSSProperties = {
  width: "100%", padding: "10px 10px", textAlign: "left",
  background: "transparent", color: "#2288dd", border: "none",
  borderBottom: "1px solid #e0dbd3", cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginBottom: 6,
};
const matBtn: React.CSSProperties = {
  padding: "8px 0", background: "rgba(0,0,0,0.03)", color: "#666",
  border: "1px solid #ddd", borderRadius: 6, cursor: "pointer",
  fontFamily: "inherit", fontSize: 10, textAlign: "center",
};
const matBtnAct: React.CSSProperties = {
  background: "rgba(0,180,140,0.1)", color: "#00886a", borderColor: "#00ccaa", fontWeight: 700,
};
const objBtn: React.CSSProperties = {
  width: "100%", padding: "8px 10px", textAlign: "left",
  background: "transparent", color: "#666", border: "none", borderRadius: 4,
  cursor: "pointer", fontFamily: "inherit", fontSize: 11, marginBottom: 1,
  borderLeft: "3px solid transparent",
};
const objBtnSel: React.CSSProperties = {
  background: "rgba(255,102,0,0.08)", color: "#cc5500", borderLeftColor: "#ff6600",
};
