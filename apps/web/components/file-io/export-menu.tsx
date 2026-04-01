"use client";

import { useState, useRef, useEffect } from "react";
import { useCADState } from "@/lib/store";
import { exportSTLBinary, exportOBJ, downloadBlob } from "@/lib/file-io";

export function ExportMenu() {
  const { features } = useCADState();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const getMesh = () => {
    const feat = features.find((f) => f.mesh);
    return feat?.mesh || null;
  };

  const handleExportSTL = () => {
    const mesh = getMesh();
    if (!mesh) return;
    const buffer = exportSTLBinary(mesh, "gesture-cad-model");
    downloadBlob(buffer, "model.stl", "application/octet-stream");
    setOpen(false);
  };

  const handleExportOBJ = () => {
    const mesh = getMesh();
    if (!mesh) return;
    const obj = exportOBJ(mesh);
    downloadBlob(obj, "model.obj", "text/plain");
    setOpen(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".stl,.step,.stp,.obj";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        // Dispatch a custom event that DragDropZone listens to
        const event = new CustomEvent("gesture-cad-import", { detail: file });
        window.dispatchEvent(event);
      }
    };
    input.click();
    setOpen(false);
  };

  const hasMesh = features.some((f) => f.mesh);

  return (
    <div ref={menuRef} style={styles.wrapper}>
      <button
        data-testid="file-menu-btn"
        style={styles.btn}
        onClick={() => setOpen(!open)}
      >
        File
      </button>
      {open && (
        <div style={styles.menu} data-testid="file-menu">
          <button style={styles.menuItem} onClick={handleImport} data-testid="import-btn">
            Import (STL, STEP)
          </button>
          <div style={styles.divider} />
          <button
            style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportSTL : undefined}
            data-testid="export-stl-btn"
          >
            Export STL
          </button>
          <button
            style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportOBJ : undefined}
            data-testid="export-obj-btn"
          >
            Export OBJ
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
  },
  btn: {
    padding: "4px 12px",
    background: "transparent",
    border: "none",
    color: "#a0a0a0",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    borderRadius: 4,
  },
  menu: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "4px 0",
    minWidth: 180,
    zIndex: 100,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  menuItem: {
    display: "block",
    width: "100%",
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    color: "#e5e5e5",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    textAlign: "left",
  },
  divider: {
    height: 1,
    background: "#2a2a2a",
    margin: "4px 0",
  },
};
