"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCADDispatch } from "@/lib/store";
import { createExtrudeFeature } from "@/lib/features";
import { parseSTL, detectFileType } from "@/lib/file-io";

export function DragDropZone() {
  const dispatch = useCADDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const dragCountRef = useRef(0);

  const handleFile = useCallback(async (file: File) => {
    const fileType = detectFileType(file.name);
    if (fileType === "unknown") {
      setImportStatus(`Unsupported file type: ${file.name}`);
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    setImporting(true);
    setImportStatus(`Importing ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();

      if (fileType === "stl") {
        const mesh = await parseSTL(buffer);
        const feature = createExtrudeFeature(
          [],
          { distance: 0, direction: "up" },
          mesh
        );
        feature.name = file.name.replace(/\.\w+$/, "");
        feature.type = "extrude"; // imported mesh
        dispatch({ type: "ADD_FEATURE", feature });
        setImportStatus(`Imported ${file.name} (${(mesh.vertices.length / 3).toLocaleString()} vertices)`);
      } else if (fileType === "step") {
        setImportStatus("STEP import requires occt-import-js (coming soon)");
      } else {
        setImportStatus(`${fileType.toUpperCase()} import not yet supported`);
      }
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  }, [dispatch]);

  // Use document-level listeners so we don't intercept viewport clicks
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current++;
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current--;
      if (dragCountRef.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCountRef.current = 0;
      const files = Array.from(e.dataTransfer?.files || []);
      for (const file of files) handleFile(file);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleFile]);

  return (
    <>
      {/* Drag zone — pointer-events: none so it doesn't intercept clicks.
          Drag events are handled on the parent viewport div via document listeners. */}
      <div data-testid="drag-drop-zone" style={{ display: "none" }} />

      {/* Drag overlay */}
      {isDragging && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <span style={styles.overlayIcon}>📂</span>
            <span style={styles.overlayText}>Drop file to import</span>
            <span style={styles.overlayFormats}>STL, STEP, OBJ</span>
          </div>
        </div>
      )}

      {/* Import status */}
      {importStatus && (
        <div style={{
          ...styles.statusBanner,
          background: importStatus.includes("failed") ? "#ef4444" : "#1e3a5f",
        }}>
          {importing && "⏳ "}{importStatus}
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zone: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "auto",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(59, 130, 246, 0.15)",
    border: "3px dashed #3b82f6",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    pointerEvents: "none",
  },
  overlayContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  overlayIcon: {
    fontSize: 48,
  },
  overlayText: {
    fontSize: 18,
    fontWeight: 600,
    color: "#e5e5e5",
  },
  overlayFormats: {
    fontSize: 13,
    color: "#93c5fd",
  },
  statusBanner: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "8px 16px",
    color: "#fff",
    borderRadius: 6,
    fontSize: 13,
    zIndex: 20,
    whiteSpace: "nowrap",
  },
};
