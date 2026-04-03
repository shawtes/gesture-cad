"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hand Cursor — Iron Man style holographic hand interface.
 *
 * Projects the hand position onto the screen as a visible cursor that can:
 * - Hover over and "press" any UI button (toolbar, panels)
 * - Show pinch state visually (cursor shrinks when pinching)
 * - Display a trailing particle effect
 * - Freehand draw when pinching in the viewport area
 */

interface HandCursorProps {
  /** Normalized hand position 0-1 from MediaPipe */
  handPosition: { x: number; y: number } | null;
  /** Whether the hand is currently pinching */
  isPinching: boolean;
  /** Current gesture name for display */
  gesture: string;
  /** Called when the hand "clicks" a point on screen */
  onHandClick?: (screenX: number, screenY: number) => void;
  /** Called when hand is dragging (pinch + move) */
  onHandDrag?: (screenX: number, screenY: number) => void;
  /** Called when pinch starts */
  onPinchStart?: (screenX: number, screenY: number) => void;
  /** Called when pinch ends */
  onPinchEnd?: (screenX: number, screenY: number) => void;
  /** Whether freehand drawing mode is active */
  freehandActive?: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
  size: number;
  time: number;
}

export function HandCursor({
  handPosition,
  isPinching,
  gesture,
  onHandClick,
  onHandDrag,
  onPinchStart,
  onPinchEnd,
  freehandActive,
}: HandCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const wasPinchingRef = useRef(false);
  const animRef = useRef<number>(0);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // Convert normalized position to screen pixels
  const toScreen = useCallback((pos: { x: number; y: number }) => ({
    x: pos.x * window.innerWidth,
    y: pos.y * window.innerHeight,
  }), []);

  // Simulate hover/click on DOM elements under the hand cursor
  useEffect(() => {
    if (!handPosition) return;

    const screen = toScreen(handPosition);

    // Find element under cursor
    const el = document.elementFromPoint(screen.x, screen.y);

    // Handle hover — find the actual interactive element under cursor
    const elements = document.elementsFromPoint(screen.x, screen.y);
    let foundHover = false;
    for (const elem of elements) {
      if (!(elem instanceof HTMLElement)) continue;
      if (elem.tagName === "CANVAS" && elem.style.pointerEvents === "none") continue;
      const interactive = elem.closest("button, [data-testid]");
      if (interactive instanceof HTMLElement) {
        const testId = interactive.getAttribute("data-testid") || interactive.textContent?.trim() || null;
        setHoveredElement(testId);
        // Visual hover feedback
        interactive.style.outline = "2px solid rgba(59, 130, 246, 0.5)";
        interactive.style.outlineOffset = "2px";
        foundHover = true;
        // Clean up other outlines
        setTimeout(() => {
          interactive.style.outline = "";
          interactive.style.outlineOffset = "";
        }, 100);
        break;
      }
    }
    if (!foundHover) setHoveredElement(null);

    // Handle pinch transitions
    const wasPinching = wasPinchingRef.current;

    if (isPinching && !wasPinching) {
      // Pinch start — simulate click on whatever is under the cursor
      onPinchStart?.(screen.x, screen.y);

      // Find ALL elements at this point (the cursor canvas has pointerEvents:none so it won't block)
      const elements = document.elementsFromPoint(screen.x, screen.y);
      let clicked = false;
      for (const elem of elements) {
        if (!(elem instanceof HTMLElement)) continue;
        // Skip our own cursor canvas
        if (elem.tagName === "CANVAS" && elem.style.pointerEvents === "none") continue;

        const clickable = elem.closest("button, [role='button'], a, input, [data-testid]");
        if (clickable instanceof HTMLElement) {
          console.log("[HandCursor] Clicking:", clickable.getAttribute("data-testid") || clickable.textContent?.trim());
          clickable.click();
          clicked = true;
          break;
        }
      }

      onHandClick?.(screen.x, screen.y);
    }

    if (isPinching && wasPinching) {
      // Dragging
      onHandDrag?.(screen.x, screen.y);
    }

    if (!isPinching && wasPinching) {
      // Pinch end
      onPinchEnd?.(screen.x, screen.y);
    }

    wasPinchingRef.current = isPinching;
  }, [handPosition, isPinching, toScreen, onHandClick, onHandDrag, onPinchStart, onPinchEnd]);

  // Render the cursor with trail effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!handPosition) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const screen = toScreen(handPosition);
      const now = performance.now();

      // Add trail point
      trailRef.current.push({
        x: screen.x,
        y: screen.y,
        opacity: 1,
        size: isPinching ? 4 : 2,
        time: now,
      });

      // Update and render trail
      trailRef.current = trailRef.current.filter((p) => now - p.time < 300);

      for (const point of trailRef.current) {
        const age = (now - point.time) / 300;
        const alpha = (1 - age) * 0.4;
        const size = point.size * (1 - age * 0.5);

        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = isPinching
          ? `rgba(59, 130, 246, ${alpha})`
          : `rgba(147, 197, 253, ${alpha})`;
        ctx.fill();
      }

      // Draw connecting line for freehand drawing
      if (freehandActive && isPinching && trailRef.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
        ctx.lineWidth = 2;
        const recent = trailRef.current.filter((p) => now - p.time < 200);
        if (recent.length > 0) {
          ctx.moveTo(recent[0].x, recent[0].y);
          for (let i = 1; i < recent.length; i++) {
            ctx.lineTo(recent[i].x, recent[i].y);
          }
          ctx.stroke();
        }
      }

      // Main cursor
      const cursorSize = isPinching ? 12 : 20;
      const pulseSize = isPinching ? 0 : Math.sin(now / 200) * 4 + 4;

      // Outer glow
      const gradient = ctx.createRadialGradient(
        screen.x, screen.y, 0,
        screen.x, screen.y, cursorSize + pulseSize + 10
      );
      gradient.addColorStop(0, isPinching ? "rgba(59, 130, 246, 0.3)" : "rgba(147, 197, 253, 0.15)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, cursorSize + pulseSize + 10, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Cursor ring
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, cursorSize + pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = isPinching ? "#3b82f6" : "rgba(147, 197, 253, 0.6)";
      ctx.lineWidth = isPinching ? 3 : 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, isPinching ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isPinching ? "#3b82f6" : "#93c5fd";
      ctx.fill();

      // Crosshair when pinching
      if (isPinching) {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
        ctx.lineWidth = 1;
        const ch = 30;
        ctx.beginPath();
        ctx.moveTo(screen.x - ch, screen.y);
        ctx.lineTo(screen.x - 8, screen.y);
        ctx.moveTo(screen.x + 8, screen.y);
        ctx.lineTo(screen.x + ch, screen.y);
        ctx.moveTo(screen.x, screen.y - ch);
        ctx.lineTo(screen.x, screen.y - 8);
        ctx.moveTo(screen.x, screen.y + 8);
        ctx.lineTo(screen.x, screen.y + ch);
        ctx.stroke();
      }

      // Gesture label
      if (gesture && gesture !== "none" && gesture !== "unknown") {
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(147, 197, 253, 0.8)";
        ctx.fillText(gesture.toUpperCase(), screen.x + cursorSize + 8, screen.y - 4);
      }

      // "PINCH" indicator
      if (isPinching) {
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#3b82f6";
        ctx.fillText("TOUCH", screen.x + cursorSize + 8, screen.y + 10);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [handPosition, isPinching, gesture, freehandActive, toScreen]);

  if (!handPosition) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
