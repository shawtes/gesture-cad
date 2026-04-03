"use client";

/**
 * UV Editor Panel
 *
 * 2D canvas that renders UV islands as wireframe triangles on a checkerboard
 * background. Supports pan/zoom with mouse wheel and drag.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";

// ─── Props ─────────────────────────────────────────────────

export interface UVEditorPanelProps {
  uvData: Map<number, [number, number]>;
  mesh: {
    faces: Map<number, { id: number; halfEdge: number }>;
    faceVertices: (faceId: number) => { id: number; position: [number, number, number] }[];
  };
  onUVUpdate: (vertexId: number, uv: [number, number]) => void;
}

// ─── Constants ─────────────────────────────────────────────

const CHECKER_SIZE = 16;
const ISLAND_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

// ─── Component ─────────────────────────────────────────────

export const UVEditorPanel: React.FC<UVEditorPanelProps> = ({
  uvData,
  mesh,
  onUVUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // View transform state
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected vertex for dragging UVs
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { w: 512, h: 512 };
    return { w: canvas.width, h: canvas.height };
  }, []);

  /** Convert UV (0-1) to canvas pixel coordinates */
  const uvToCanvas = useCallback(
    (u: number, v: number): { x: number; y: number } => {
      const { w, h } = getCanvasSize();
      const scale = Math.min(w - 80, h - 80) * zoom;
      return {
        x: offset.x + u * scale,
        y: offset.y + (1 - v) * scale, // flip V
      };
    },
    [offset, zoom, getCanvasSize]
  );

  /** Convert canvas pixel to UV */
  const canvasToUV = useCallback(
    (cx: number, cy: number): [number, number] => {
      const { w, h } = getCanvasSize();
      const scale = Math.min(w - 80, h - 80) * zoom;
      const u = (cx - offset.x) / scale;
      const v = 1 - (cy - offset.y) / scale;
      return [u, v];
    },
    [offset, zoom, getCanvasSize]
  );

  // ─── Drawing ───────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = getCanvasSize();

    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // Draw checkerboard in UV space
    const topLeft = uvToCanvas(0, 1);
    const bottomRight = uvToCanvas(1, 0);
    const uvW = bottomRight.x - topLeft.x;
    const uvH = bottomRight.y - topLeft.y;

    const checkerCount = 16;
    const cw = uvW / checkerCount;
    const ch = uvH / checkerCount;

    for (let row = 0; row < checkerCount; row++) {
      for (let col = 0; col < checkerCount; col++) {
        const dark = (row + col) % 2 === 0;
        ctx.fillStyle = dark ? "#1a1a1a" : "#222222";
        ctx.fillRect(
          topLeft.x + col * cw,
          topLeft.y + row * ch,
          cw,
          ch
        );
      }
    }

    // Draw UV space border
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    ctx.strokeRect(topLeft.x, topLeft.y, uvW, uvH);

    // Draw faces as wireframe triangles
    let colorIdx = 0;
    for (const [faceId] of mesh.faces) {
      const verts = mesh.faceVertices(faceId);
      if (verts.length < 3) continue;

      const color = ISLAND_COLORS[colorIdx % ISLAND_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      let firstPoint = true;
      for (const v of verts) {
        const uv = uvData.get(v.id);
        if (!uv) continue;
        const p = uvToCanvas(uv[0], uv[1]);
        if (firstPoint) {
          ctx.moveTo(p.x, p.y);
          firstPoint = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      // Light fill
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.05;
      ctx.fill();
      ctx.globalAlpha = 1;

      colorIdx++;
    }

    // Draw vertex dots
    for (const [vid, [u, v]] of uvData) {
      const p = uvToCanvas(u, v);
      ctx.fillStyle = vid === selectedVertex ? "#ffffff" : "#888888";
      ctx.beginPath();
      ctx.arc(p.x, p.y, vid === selectedVertex ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw coordinates label
    ctx.fillStyle = "#555555";
    ctx.font = "11px monospace";
    ctx.fillText("(0,0)", topLeft.x - 4, bottomRight.y + 14);
    ctx.fillText("(1,1)", bottomRight.x - 20, topLeft.y - 4);
  }, [uvData, mesh, uvToCanvas, getCanvasSize, selectedVertex]);

  // ─── Resize Observer ───────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        draw();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ─── Mouse Handlers ────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.1, Math.min(10, prev * factor)));
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Check if clicking near a vertex
      const HIT_RADIUS = 8;
      let hitVid: number | null = null;
      for (const [vid, [u, v]] of uvData) {
        const p = uvToCanvas(u, v);
        const dx = p.x - cx;
        const dy = p.y - cy;
        if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
          hitVid = vid;
          break;
        }
      }

      if (hitVid !== null) {
        setSelectedVertex(hitVid);
      } else {
        setSelectedVertex(null);
        isDragging.current = true;
        dragStart.current = { x: cx, y: cy };
        dragOffset.current = { ...offset };
      }
    },
    [uvData, uvToCanvas, offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (selectedVertex !== null && e.buttons === 1) {
        // Drag UV vertex
        const [u, v] = canvasToUV(cx, cy);
        const clampedU = Math.max(0, Math.min(1, u));
        const clampedV = Math.max(0, Math.min(1, v));
        onUVUpdate(selectedVertex, [clampedU, clampedV]);
        return;
      }

      if (isDragging.current) {
        const dx = cx - dragStart.current.x;
        const dy = cy - dragStart.current.y;
        setOffset({
          x: dragOffset.current.x + dx,
          y: dragOffset.current.y + dy,
        });
      }
    },
    [selectedVertex, canvasToUV, onUVUpdate]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ─── Render ────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 300,
        background: "#0a0a0a",
        border: "1px solid #333",
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          color: "#666",
          fontSize: 11,
          fontFamily: "monospace",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        UV Editor &mdash; Zoom: {zoom.toFixed(2)}x
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default UVEditorPanel;
