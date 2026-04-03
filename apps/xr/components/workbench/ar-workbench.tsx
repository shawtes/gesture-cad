"use client";

/**
 * AR Workbench — holographic table with 3D grid and clickable tool pucks.
 *
 * All text uses billboard mode (always faces camera, never mirrored).
 * Table height and scale are adjustable via props.
 */

import { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Billboard, Grid } from "@react-three/drei";
import * as THREE from "three";
import { HOLOGRAM_PRESETS, type HologramPreset } from "@/lib/hologram-material";

interface ToolItem {
  id: string;
  label: string;
  icon: string;
  group: string;
}

interface WorkbenchProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  preset: HologramPreset;
  tableHeight?: number;
  tableScale?: number;
  /** Called when user taps on the table surface */
  onTableTap?: (position: [number, number, number]) => void;
  /** The current placement cursor position */
  placementPos?: [number, number, number] | null;
  children?: React.ReactNode;
}

const TOOL_TRAYS: { group: string; side: "front" | "back" | "left" | "right"; tools: ToolItem[] }[] = [
  {
    group: "Sketch", side: "front",
    tools: [
      { id: "line", label: "Line", icon: "╱", group: "Sketch" },
      { id: "rect", label: "Rect", icon: "□", group: "Sketch" },
      { id: "circle", label: "Circle", icon: "○", group: "Sketch" },
      { id: "arc", label: "Arc", icon: "⌒", group: "Sketch" },
      { id: "polygon", label: "Poly", icon: "⬡", group: "Sketch" },
      { id: "draw", label: "Draw", icon: "✎", group: "Sketch" },
    ],
  },
  {
    group: "Build", side: "right",
    tools: [
      { id: "box", label: "Box", icon: "▣", group: "Prim" },
      { id: "cylinder", label: "Cyl", icon: "⊙", group: "Prim" },
      { id: "sphere", label: "Sph", icon: "●", group: "Prim" },
      { id: "extrude", label: "Extr", icon: "↑", group: "3D" },
      { id: "fillet", label: "Fill", icon: "◠", group: "Mod" },
      { id: "hole", label: "Hole", icon: "◎", group: "Mod" },
    ],
  },
  {
    group: "Boolean", side: "back",
    tools: [
      { id: "union", label: "Union", icon: "∪", group: "Bool" },
      { id: "subtract", label: "Sub", icon: "∖", group: "Bool" },
      { id: "mirror", label: "Mirror", icon: "⊣", group: "Pat" },
      { id: "linear_pattern", label: "LPat", icon: "⋯", group: "Pat" },
      { id: "chamfer", label: "Cham", icon: "⌐", group: "Mod" },
      { id: "shell", label: "Shell", icon: "◫", group: "Mod" },
    ],
  },
  {
    group: "Edit", side: "left",
    tools: [
      { id: "edit_mode", label: "Edit", icon: "◆", group: "Edit" },
      { id: "sculpt_grab", label: "Sculpt", icon: "✊", group: "Sculpt" },
      { id: "generate", label: "Gen", icon: "🏠", group: "Gen" },
      { id: "select", label: "Select", icon: "👆", group: "Nav" },
    ],
  },
];

export function ARWorkbench({
  activeTool, onToolSelect, preset,
  tableHeight = 0.78, tableScale = 1.0,
  onTableTap, placementPos,
  children,
}: WorkbenchProps) {
  const presetColor = HOLOGRAM_PRESETS[preset].color;
  const tw = 1.5 * tableScale;
  const td = 1.0 * tableScale;

  return (
    <group position={[0, 0, 0]}>
      {/* ═══ TABLE SURFACE — clickable for placement ═══ */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, tableHeight - 0.001, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onTableTap) {
            const p = e.point;
            onTableTap([p.x, 0, p.z]);
          }
        }}
      >
        <planeGeometry args={[tw, td]} />
        <meshBasicMaterial color="#e8e3db" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Placement cursor — shows where next object will appear */}
      {placementPos && (
        <group position={[placementPos[0], tableHeight + 0.005, placementPos[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.03, 0.04, 24]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.052, 24]} />
            <meshBasicMaterial color="#ff6600" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <Billboard position={[0, 0.06, 0]}>
            <Text fontSize={0.015} color="#ff6600" anchorX="center" fontWeight="bold">
              TAP TO PLACE
            </Text>
          </Billboard>
        </group>
      )}

      {/* 3D Grid */}
      <Grid
        position={[0, tableHeight, 0]}
        args={[tw, td]}
        cellSize={0.05 * tableScale}
        cellThickness={0.5}
        cellColor={presetColor}
        sectionSize={0.25 * tableScale}
        sectionThickness={1.0}
        sectionColor={presetColor}
        fadeDistance={2}
        fadeStrength={0.5}
        infiniteGrid={false}
      />

      {/* Table legs */}
      {[[-tw/2+0.05, -td/2+0.05], [tw/2-0.05, -td/2+0.05], [-tw/2+0.05, td/2-0.05], [tw/2-0.05, td/2-0.05]].map(([x, z], i) => (
        <mesh key={i} position={[x, tableHeight / 2, z]}>
          <cylinderGeometry args={[0.006, 0.006, tableHeight, 8]} />
          <meshBasicMaterial color={presetColor} transparent opacity={0.12} wireframe />
        </mesh>
      ))}

      {/* Axis labels — Billboard, bright neon, large */}
      <Billboard position={[tw/2 + 0.06, tableHeight + 0.03, 0]}>
        <Text fontSize={0.05} color="#ee1155" anchorX="left" fontWeight="bold">X</Text>
      </Billboard>
      <Billboard position={[0, tableHeight + 0.03, -td/2 - 0.06]}>
        <Text fontSize={0.05} color="#2255ee" anchorX="center" fontWeight="bold">Z</Text>
      </Billboard>
      <Billboard position={[tw/2 - 0.02, tableHeight + 0.03, td/2 - 0.02]}>
        <Text fontSize={0.018} color="#333333" anchorX="right" fontWeight="bold">meters</Text>
      </Billboard>

      {/* ═══ TOOL TRAYS ═══ */}
      {TOOL_TRAYS.map((tray) => (
        <ToolTray
          key={tray.group}
          tray={tray}
          activeTool={activeTool}
          onToolSelect={onToolSelect}
          preset={preset}
          tableHeight={tableHeight}
          tableScale={tableScale}
        />
      ))}

      {/* ═══ MODEL AREA ═══ */}
      <group position={[0, tableHeight + 0.02, -0.05]}>
        {children}
      </group>

      {/* ═══ STATUS RING ═══ */}
      <StatusRing activeTool={activeTool} preset={preset} y={tableHeight + 0.4} />
    </group>
  );
}

// ═══════════════════════════════════════════
// Tool Tray
// ═══════════════════════════════════════════

function ToolTray({
  tray, activeTool, onToolSelect, preset, tableHeight, tableScale,
}: {
  tray: typeof TOOL_TRAYS[0];
  activeTool: string;
  onToolSelect: (id: string) => void;
  preset: HologramPreset;
  tableHeight: number;
  tableScale: number;
}) {
  const tw = 1.5 * tableScale / 2;
  const td = 1.0 * tableScale / 2;
  const offset = 0.08 * tableScale;

  const getPosition = (): [number, number, number] => {
    switch (tray.side) {
      case "front": return [0, tableHeight - 0.02, td + offset];
      case "back": return [0, tableHeight - 0.02, -td - offset];
      case "left": return [-tw - offset, tableHeight - 0.02, 0];
      case "right": return [tw + offset, tableHeight - 0.02, 0];
    }
  };

  const getRotation = (): [number, number, number] => {
    switch (tray.side) {
      case "front": return [0, 0, 0];
      case "back": return [0, Math.PI, 0];
      case "left": return [0, Math.PI / 2, 0];
      case "right": return [0, -Math.PI / 2, 0];
    }
  };

  const pos = getPosition();
  const rot = getRotation();
  const spacing = 0.1 * tableScale;
  const startX = -(tray.tools.length - 1) * spacing / 2;

  return (
    <group position={pos} rotation={rot}>
      {/* Tray label — Billboard, high contrast */}
      <Billboard position={[0, 0.09, 0]}>
        <Text fontSize={0.024} color="#111111" anchorX="center" fontWeight="bold">
          {tray.group.toUpperCase()}
        </Text>
      </Billboard>

      {/* Tool buttons */}
      {tray.tools.map((tool, i) => (
        <ToolButton
          key={tool.id}
          tool={tool}
          position={[startX + i * spacing, 0, 0]}
          active={activeTool === tool.id}
          onSelect={() => onToolSelect(tool.id)}
          preset={preset}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════
// Tool Button — billboard text, large hit area
// ═══════════════════════════════════════════

function ToolButton({
  tool, position, active, onSelect, preset,
}: {
  tool: ToolItem;
  position: [number, number, number];
  active: boolean;
  onSelect: () => void;
  preset: HologramPreset;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const presetColor = HOLOGRAM_PRESETS[preset].color;

  useFrame(({ clock }) => {
    if (meshRef.current && active) {
      meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.004 + 0.008;
    }
  });

  return (
    <group position={position}>
      {/* LARGE invisible hit area */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.08, 0.05, 0.08]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible puck */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
        <meshBasicMaterial
          color={active ? "#ffffff" : hovered ? presetColor : "#aaaaaa"}
          transparent
          opacity={active ? 0.7 : hovered ? 0.45 : 0.18}
        />
      </mesh>

      {/* Active glow ring */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <torusGeometry args={[0.04, 0.003, 8, 24]} />
          <meshBasicMaterial color={presetColor} transparent opacity={0.9} />
        </mesh>
      )}

      {hovered && !active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <torusGeometry args={[0.04, 0.002, 8, 24]} />
          <meshBasicMaterial color={presetColor} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Icon — Billboard, high contrast neon */}
      <Billboard position={[0, 0.03, 0]}>
        <Text
          fontSize={active ? 0.034 : 0.028}
          color={active ? "#ff3366" : hovered ? "#ff6600" : "#111111"}
          anchorX="center" anchorY="middle"
          fontWeight="bold"
        >
          {tool.icon}
        </Text>
      </Billboard>

      {/* Label — Billboard, dark bold */}
      <Billboard position={[0, -0.016, 0]}>
        <Text
          fontSize={0.014}
          color={active ? "#ff3366" : hovered ? "#ff6600" : "#222222"}
          anchorX="center" anchorY="middle"
          fontWeight="bold"
        >
          {tool.label}
        </Text>
      </Billboard>
    </group>
  );
}

// ═══════════════════════════════════════════
// Status Ring
// ═══════════════════════════════════════════

function StatusRing({ activeTool, preset, y }: { activeTool: string; preset: HologramPreset; y: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const presetColor = HOLOGRAM_PRESETS[preset].color;

  useFrame(({ clock }) => {
    if (ringRef.current) ringRef.current.rotation.y = clock.elapsedTime * 0.3;
  });

  return (
    <group position={[0, y, -0.05]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.003, 8, 64]} />
        <meshBasicMaterial color={presetColor} transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.002, 8, 48]} />
        <meshBasicMaterial color={presetColor} transparent opacity={0.12} />
      </mesh>
      {/* Billboard status text */}
      <Billboard position={[0, 0.08, 0]}>
        <Text fontSize={0.035} color="#111111" anchorX="center" fontWeight="bold">
          {activeTool === "select" ? "READY" : activeTool.replace(/_/g, " ").toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}
