"use client";

import { useState, useRef, useEffect } from "react";
import { useCADState } from "@/lib/store";
import { exportSTLBinary, exportOBJ, downloadBlob } from "@/lib/file-io";
import { exportGLB, downloadBlob as downloadBlobGltf } from "@/lib/gltf-export";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ExportMenu() {
  const { features } = useCADState();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const getAllMeshes = () => features.filter((f) => f.mesh).map((f) => f.mesh!);
  const getFirstMesh = () => features.find((f) => f.mesh)?.mesh || null;
  const hasMesh = features.some((f) => f.mesh);

  const handleExportSTL = () => {
    const mesh = getFirstMesh();
    if (!mesh) return;
    const buffer = exportSTLBinary(mesh, "gesture-cad-model");
    downloadBlob(buffer, "model.stl", "application/octet-stream");
    setOpen(false);
  };

  const handleExportOBJ = () => {
    const mesh = getFirstMesh();
    if (!mesh) return;
    const obj = exportOBJ(mesh);
    downloadBlob(obj, "model.obj", "text/plain");
    setOpen(false);
  };

  const handleExportGLB = async () => {
    const meshes = getAllMeshes();
    if (meshes.length === 0) return;
    try {
      const blob = await exportGLB(meshes);
      downloadBlobGltf(blob, "model.glb");
    } catch (err) {
      console.error("glTF export failed:", err);
    }
    setOpen(false);
  };

  const handleExportSTEP = async () => {
    const mesh = getFirstMesh();
    if (!mesh) return;
    try {
      const res = await fetch(`${API_BASE}/api/io/export/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: mesh.vertices, indices: mesh.indices, format: "step" }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "STEP export failed");
        return;
      }
      const blob = await res.blob();
      downloadBlobGltf(blob, "model.step");
    } catch {
      alert("STEP export requires the API server running with Build123d");
    }
    setOpen(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".stl,.step,.stp,.obj,.glb,.gltf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const event = new CustomEvent("gesture-cad-import", { detail: file });
        window.dispatchEvent(event);
      }
    };
    input.click();
    setOpen(false);
  };

  return (
    <div ref={menuRef} style={styles.wrapper}>
      <button data-testid="file-menu-btn" style={styles.btn} onClick={() => setOpen(!open)}>
        File
      </button>
      {open && (
        <div style={styles.menu} data-testid="file-menu">
          <button style={styles.menuItem} onClick={handleImport} data-testid="import-btn">
            Import (STL, STEP, OBJ, glTF)
          </button>
          <div style={styles.divider} />
          <div style={styles.sectionLabel}>Export</div>
          <button style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportSTL : undefined}>
            STL (3D printing)
          </button>
          <button style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportOBJ : undefined}>
            OBJ (general 3D)
          </button>
          <button style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportGLB : undefined}>
            glTF/GLB (web/AR)
          </button>
          <button style={{ ...styles.menuItem, opacity: hasMesh ? 1 : 0.4 }}
            onClick={hasMesh ? handleExportSTEP : undefined}>
            STEP (manufacturing)
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: "relative" },
  btn: {
    padding: "6px 14px",
    background: "transparent",
    border: "none",
    color: "#b0b0b0",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 4,
  },
  menu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 4,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "6px 0",
    minWidth: 220,
    zIndex: 100,
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
  },
  menuItem: {
    display: "block",
    width: "100%",
    padding: "10px 18px",
    background: "transparent",
    border: "none",
    color: "#e5e5e5",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    textAlign: "left" as const,
  },
  sectionLabel: {
    padding: "4px 18px",
    fontSize: 10,
    color: "#666",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  divider: {
    height: 1,
    background: "#2a2a2a",
    margin: "4px 0",
  },
};
