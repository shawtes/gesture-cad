"use client";

/**
 * Bone Editor Component
 *
 * SVG overlay for visual bone editing in the viewport.
 * Renders bones as octahedral wireframes (diamond shapes).
 * Supports selection, head/tail dragging, and bone creation.
 */

import React, { useCallback, useRef, useState } from "react";
import type { Armature, Bone } from "../../lib/rigging/armature";

// ─── Types ────────────────────────────────────────────────

interface BoneEditorProps {
  armature: Armature;
  selectedBoneId: string | null;
  onBoneSelect: (id: string | null) => void;
  onBoneUpdate: (id: string, updates: Partial<Bone>) => void;
  onAddBone: (parentId: string | null) => void;
}

interface DragState {
  boneId: string;
  handle: "head" | "tail";
  startX: number;
  startY: number;
  origPos: [number, number, number];
}

// ─── Constants ────────────────────────────────────────────

const ACCENT_BLUE = "#3b82f6";
const BONE_COLOR = "#a0a0a0";
const BONE_HOVER_COLOR = "#d0d0d0";
const JOINT_RADIUS = 4;
const BG_COLOR = "#0a0a0a";

// ─── Projection Helper ───────────────────────────────────

/**
 * Simple orthographic-ish projection from 3D bone position to 2D SVG coords.
 * In a real integration this would use the viewport camera's projection matrix.
 */
function projectTo2D(
  pos: [number, number, number],
  width: number,
  height: number,
): [number, number] {
  const scale = Math.min(width, height) * 0.3;
  const cx = width / 2;
  const cy = height / 2;
  return [cx + pos[0] * scale, cy - pos[1] * scale];
}

// ─── Octahedral Shape ────────────────────────────────────

/**
 * Generate SVG path for an octahedral bone shape between two points.
 * The diamond shape widens at the midpoint perpendicular to the bone direction.
 */
function octahedralPath(
  hx: number,
  hy: number,
  tx: number,
  ty: number,
  thickness: number = 6,
): string {
  const mx = (hx + tx) / 2;
  const my = (hy + ty) / 2;

  // Perpendicular direction
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return `M ${hx} ${hy} L ${tx} ${ty}`;

  const px = (-dy / len) * thickness;
  const py = (dx / len) * thickness;

  return [
    `M ${hx} ${hy}`,
    `L ${mx + px} ${my + py}`,
    `L ${tx} ${ty}`,
    `L ${mx - px} ${my - py}`,
    `Z`,
  ].join(" ");
}

// ─── Component ────────────────────────────────────────────

export function BoneEditor({
  armature,
  selectedBoneId,
  onBoneSelect,
  onBoneUpdate,
  onAddBone,
}: BoneEditorProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredBoneId, setHoveredBoneId] = useState<string | null>(null);
  const [dimensions] = useState({ width: 800, height: 600 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, boneId: string, handle: "head" | "tail") => {
      e.stopPropagation();
      e.preventDefault();

      const bone = armature.bones.get(boneId);
      if (!bone) return;

      onBoneSelect(boneId);

      setDragState({
        boneId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origPos: handle === "head" ? [...bone.head] : [...bone.tail],
      });

      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [armature, onBoneSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const scale = Math.min(dimensions.width, dimensions.height) * 0.3;
      const deltaX = (e.clientX - dragState.startX) / scale;
      const deltaY = -(e.clientY - dragState.startY) / scale;

      const newPos: [number, number, number] = [
        dragState.origPos[0] + deltaX,
        dragState.origPos[1] + deltaY,
        dragState.origPos[2],
      ];

      onBoneUpdate(dragState.boneId, {
        [dragState.handle]: newPos,
      });
    },
    [dragState, dimensions, onBoneUpdate],
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    if (!dragState) {
      onBoneSelect(null);
    }
  }, [dragState, onBoneSelect]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onAddBone(selectedBoneId);
    },
    [onAddBone, selectedBoneId],
  );

  const bones = Array.from(armature.bones.values());

  return (
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "all",
        background: "transparent",
        userSelect: "none",
      }}
      onClick={handleBackgroundClick}
      onDoubleClick={handleDoubleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Connection lines (parent-child) */}
      {bones.map((bone) => {
        if (!bone.parentId) return null;
        const parent = armature.bones.get(bone.parentId);
        if (!parent) return null;

        const [ptx, pty] = projectTo2D(
          parent.tail,
          dimensions.width,
          dimensions.height,
        );
        const [bhx, bhy] = projectTo2D(
          bone.head,
          dimensions.width,
          dimensions.height,
        );

        if (!bone.connected) {
          return (
            <line
              key={`conn-${bone.id}`}
              x1={ptx}
              y1={pty}
              x2={bhx}
              y2={bhy}
              stroke="#555"
              strokeWidth={1}
              strokeDasharray="4,3"
              pointerEvents="none"
            />
          );
        }
        return null;
      })}

      {/* Bone shapes */}
      {bones.map((bone) => {
        const isSelected = bone.id === selectedBoneId;
        const isHovered = bone.id === hoveredBoneId;

        const [hx, hy] = projectTo2D(
          bone.head,
          dimensions.width,
          dimensions.height,
        );
        const [tx, ty] = projectTo2D(
          bone.tail,
          dimensions.width,
          dimensions.height,
        );

        const strokeColor = isSelected
          ? ACCENT_BLUE
          : isHovered
            ? BONE_HOVER_COLOR
            : BONE_COLOR;

        const fillColor = isSelected
          ? `${ACCENT_BLUE}33`
          : `${BG_COLOR}88`;

        return (
          <g key={bone.id}>
            {/* Octahedral bone shape */}
            <path
              d={octahedralPath(hx, hy, tx, ty)}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2 : 1}
              style={{ cursor: "pointer" }}
              onPointerEnter={() => setHoveredBoneId(bone.id)}
              onPointerLeave={() => setHoveredBoneId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onBoneSelect(bone.id);
              }}
            />

            {/* Head joint (draggable) */}
            <circle
              cx={hx}
              cy={hy}
              r={JOINT_RADIUS}
              fill={isSelected ? ACCENT_BLUE : "#666"}
              stroke={strokeColor}
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => handlePointerDown(e, bone.id, "head")}
            />

            {/* Tail joint (draggable) */}
            <circle
              cx={tx}
              cy={ty}
              r={JOINT_RADIUS}
              fill={isSelected ? ACCENT_BLUE : "#888"}
              stroke={strokeColor}
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => handlePointerDown(e, bone.id, "tail")}
            />

            {/* Bone name label */}
            <text
              x={(hx + tx) / 2}
              y={(hy + ty) / 2 - 10}
              fill={isSelected ? ACCENT_BLUE : "#888"}
              fontSize={10}
              fontFamily="monospace"
              textAnchor="middle"
              pointerEvents="none"
            >
              {bone.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
