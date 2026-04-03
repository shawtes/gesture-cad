"use client";

import { useState } from "react";
import { useCADState, useCADDispatch } from "@/lib/store";
import {
  createComponent,
  createMate,
  generateBOM,
  type AssemblyComponent,
  type MateType,
} from "@/lib/assembly/assembly-manager";

export function AssemblyPanel() {
  const { features } = useCADState();
  const dispatch = useCADDispatch();
  const [components, setComponents] = useState<AssemblyComponent[]>([]);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [showBOM, setShowBOM] = useState(false);

  const addComponentFromFeatures = () => {
    const meshFeatures = features.filter((f) => f.mesh);
    if (meshFeatures.length === 0) return;
    const last = meshFeatures[meshFeatures.length - 1];
    const comp = createComponent(
      last.name || `Part ${components.length + 1}`,
      [last.id],
      last.mesh!,
      [components.length * 3, 0, 0]
    );
    setComponents([...components, comp]);
  };

  const toggleGround = (id: string) => {
    setComponents(components.map((c) =>
      c.id === id ? { ...c, grounded: !c.grounded } : c
    ));
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
    if (selectedComp === id) setSelectedComp(null);
  };

  const bom = generateBOM(components);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Assembly</span>
        <span style={styles.badge}>{components.length}</span>
      </div>

      <button style={styles.addBtn} onClick={addComponentFromFeatures}>
        + Add Component
      </button>

      <div style={styles.list}>
        {components.map((comp) => (
          <div
            key={comp.id}
            style={{
              ...styles.item,
              ...(selectedComp === comp.id ? styles.itemSelected : {}),
              borderLeftColor: comp.color,
            }}
            onClick={() => setSelectedComp(comp.id)}
          >
            <span style={{ ...styles.dot, background: comp.color }} />
            <span style={styles.itemName}>{comp.name}</span>
            {comp.grounded && <span style={styles.groundedBadge}>GND</span>}
            <button style={styles.smallBtn} onClick={(e) => { e.stopPropagation(); toggleGround(comp.id); }}>
              {comp.grounded ? "Unlock" : "Lock"}
            </button>
            <button style={styles.smallBtn} onClick={(e) => { e.stopPropagation(); removeComponent(comp.id); }}>
              X
            </button>
          </div>
        ))}
        {components.length === 0 && (
          <div style={styles.empty}>No components. Create features then add them here.</div>
        )}
      </div>

      {components.length > 0 && (
        <>
          <div style={styles.divider} />
          <button style={styles.bomBtn} onClick={() => setShowBOM(!showBOM)}>
            {showBOM ? "Hide" : "Show"} Bill of Materials
          </button>
          {showBOM && (
            <div style={styles.bomTable}>
              <div style={styles.bomHeader}>
                <span style={styles.bomCell}>Part</span>
                <span style={styles.bomCell}>Qty</span>
              </div>
              {bom.map((item) => (
                <div key={item.id} style={styles.bomRow}>
                  <span style={styles.bomCell}>{item.name}</span>
                  <span style={styles.bomCell}>{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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
    background: "#111",
    borderRight: "1px solid #2a2a2a",
    padding: 10,
    overflowY: "auto" as const,
    fontSize: 12,
    zIndex: 5,
    display: "none", // Hidden by default — shown when Assembly workbench active
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontWeight: 700, color: "#e5e5e5", fontSize: 13 },
  badge: { background: "#333", color: "#888", padding: "1px 6px", borderRadius: 8, fontSize: 10 },
  addBtn: {
    width: "100%", padding: "8px 0", background: "#1e3a5f", border: "1px solid #3b82f6",
    borderRadius: 5, color: "#93c5fd", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, marginBottom: 8,
  },
  list: { display: "flex", flexDirection: "column" as const, gap: 2 },
  item: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 8px",
    background: "#1a1a1a", borderRadius: 4, cursor: "pointer", borderLeft: "3px solid",
  },
  itemSelected: { background: "#1e3a5f" },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemName: { flex: 1, color: "#ccc", fontSize: 11 },
  groundedBadge: { fontSize: 8, color: "#f59e0b", fontWeight: 700, background: "#f59e0b22", padding: "1px 4px", borderRadius: 3 },
  smallBtn: {
    padding: "2px 6px", background: "#222", border: "1px solid #333",
    borderRadius: 3, color: "#888", cursor: "pointer", fontFamily: "inherit", fontSize: 9,
  },
  empty: { color: "#555", fontSize: 11, padding: "12px 0", textAlign: "center" as const },
  divider: { height: 1, background: "#2a2a2a", margin: "8px 0" },
  bomBtn: {
    width: "100%", padding: "6px 0", background: "#222", border: "1px solid #333",
    borderRadius: 4, color: "#aaa", cursor: "pointer", fontFamily: "inherit", fontSize: 11, marginBottom: 6,
  },
  bomTable: { background: "#0a0a0a", borderRadius: 4, padding: 6 },
  bomHeader: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", paddingBottom: 4, marginBottom: 4 },
  bomRow: { display: "flex", justifyContent: "space-between", padding: "2px 0" },
  bomCell: { color: "#999", fontSize: 10 },
};
