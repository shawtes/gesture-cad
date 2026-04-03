"use client";

/**
 * Shader Graph Editor
 *
 * Visual node-based shader editor using plain div-based nodes with
 * SVG connection lines. No external dependencies (no ReactFlow).
 */

import React, { useRef, useState, useCallback } from "react";
import type { ShaderGraph, ShaderNode, ShaderConnection } from "../../lib/materials/shader-graph";

// ─── Props ─────────────────────────────────────────────────

export interface ShaderGraphEditorProps {
  graph: ShaderGraph;
  onGraphChange: (graph: ShaderGraph) => void;
}

// ─── Constants ─────────────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 28;
const PORT_SIZE = 10;
const PORT_SPACING = 24;

const TYPE_COLORS: Record<string, string> = {
  float: "#22c55e",
  vec2: "#3b82f6",
  vec3: "#a855f7",
  vec4: "#f59e0b",
  sampler2D: "#ef4444",
};

// ─── Component ─────────────────────────────────────────────

export const ShaderGraphEditor: React.FC<ShaderGraphEditorProps> = ({
  graph,
  onGraphChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{
    fromNode: string;
    fromOutput: string;
    fromPos: { x: number; y: number };
    mousePos: { x: number; y: number };
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ─── Helpers ─────────────────────────────────────────

  const getPortPosition = useCallback(
    (
      node: ShaderNode,
      portName: string,
      isOutput: boolean
    ): { x: number; y: number } => {
      const portList = isOutput
        ? Array.from(node.outputs.keys())
        : Array.from(node.inputs.keys());
      const idx = portList.indexOf(portName);
      const inputCount = node.inputs.size;
      const yOffset = isOutput
        ? NODE_HEADER_HEIGHT + (inputCount + idx) * PORT_SPACING + PORT_SPACING / 2
        : NODE_HEADER_HEIGHT + idx * PORT_SPACING + PORT_SPACING / 2;

      return {
        x: node.position[0] + panOffset.x + (isOutput ? NODE_WIDTH : 0),
        y: node.position[1] + panOffset.y + yOffset,
      };
    },
    [panOffset]
  );

  const getNodeHeight = useCallback((node: ShaderNode): number => {
    return (
      NODE_HEADER_HEIGHT +
      (node.inputs.size + node.outputs.size) * PORT_SPACING +
      PORT_SPACING / 2
    );
  }, []);

  // ─── Event Handlers ──────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
        // Start panning
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panStartOffset.current = { ...panOffset };
        setContextMenu(null);
      }
    },
    [panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPanOffset({
          x: panStartOffset.current.x + dx,
          y: panStartOffset.current.y + dy,
        });
        return;
      }

      if (draggingNode) {
        const newGraph = graph.clone();
        const node = newGraph.nodes.get(draggingNode);
        if (node) {
          const rect = containerRef.current?.getBoundingClientRect();
          const cx = e.clientX - (rect?.left ?? 0);
          const cy = e.clientY - (rect?.top ?? 0);
          node.position = [cx - dragOffset.x - panOffset.x, cy - dragOffset.y - panOffset.y];
          onGraphChange(newGraph);
        }
        return;
      }

      if (connecting) {
        const rect = containerRef.current?.getBoundingClientRect();
        setConnecting({
          ...connecting,
          mousePos: {
            x: e.clientX - (rect?.left ?? 0),
            y: e.clientY - (rect?.top ?? 0),
          },
        });
      }
    },
    [draggingNode, connecting, graph, onGraphChange, dragOffset, panOffset]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    setDraggingNode(null);
    setConnecting(null);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      setContextMenu({
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      });
    },
    []
  );

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setContextMenu(null);
      const node = graph.nodes.get(nodeId);
      if (!node) return;
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = e.clientX - (rect?.left ?? 0);
      const cy = e.clientY - (rect?.top ?? 0);
      setDragOffset({
        x: cx - node.position[0] - panOffset.x,
        y: cy - node.position[1] - panOffset.y,
      });
      setDraggingNode(nodeId);
    },
    [graph, panOffset]
  );

  const handleOutputPortMouseDown = useCallback(
    (nodeId: string, outputName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const node = graph.nodes.get(nodeId);
      if (!node) return;
      const pos = getPortPosition(node, outputName, true);
      setConnecting({
        fromNode: nodeId,
        fromOutput: outputName,
        fromPos: pos,
        mousePos: pos,
      });
    },
    [graph, getPortPosition]
  );

  const handleInputPortMouseUp = useCallback(
    (nodeId: string, inputName: string) => {
      if (!connecting) return;
      if (connecting.fromNode === nodeId) return; // no self-connections

      const newGraph = graph.clone();
      newGraph.connect(
        connecting.fromNode,
        connecting.fromOutput,
        nodeId,
        inputName
      );
      onGraphChange(newGraph);
      setConnecting(null);
    },
    [connecting, graph, onGraphChange]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const newGraph = graph.clone();
      newGraph.removeNode(nodeId);
      onGraphChange(newGraph);
    },
    [graph, onGraphChange]
  );

  const handleAddNode = useCallback(
    (type: string) => {
      if (!contextMenu) return;
      const newGraph = graph.clone();
      const id = newGraph.generateId();
      const pos: [number, number] = [
        contextMenu.x - panOffset.x,
        contextMenu.y - panOffset.y,
      ];

      const inputs = new Map<string, { name: string; type: "float" | "vec2" | "vec3" | "vec4" | "sampler2D"; value?: number | number[] }>();
      const outputs = new Map<string, { name: string; type: "float" | "vec2" | "vec3" | "vec4" | "sampler2D" }>();

      switch (type) {
        case "math":
          inputs.set("a", { name: "A", type: "float", value: 0 });
          inputs.set("b", { name: "B", type: "float", value: 1 });
          outputs.set("result", { name: "Result", type: "float" });
          break;
        case "mix":
          inputs.set("a", { name: "A", type: "vec3", value: [0, 0, 0] });
          inputs.set("b", { name: "B", type: "vec3", value: [1, 1, 1] });
          inputs.set("factor", { name: "Factor", type: "float", value: 0.5 });
          outputs.set("result", { name: "Result", type: "vec3" });
          break;
        case "noise":
          inputs.set("coord", { name: "Coord", type: "vec2" });
          inputs.set("scale", { name: "Scale", type: "float", value: 5 });
          outputs.set("result", { name: "Value", type: "float" });
          break;
        case "fresnel":
          inputs.set("power", { name: "Power", type: "float", value: 2 });
          outputs.set("result", { name: "Fresnel", type: "float" });
          break;
        case "colorRamp":
          inputs.set("factor", { name: "Factor", type: "float", value: 0.5 });
          inputs.set("colorA", { name: "Color A", type: "vec3", value: [0, 0, 0] });
          inputs.set("colorB", { name: "Color B", type: "vec3", value: [1, 1, 1] });
          outputs.set("result", { name: "Color", type: "vec3" });
          break;
        case "texture":
          inputs.set("uv", { name: "UV", type: "vec2" });
          outputs.set("color", { name: "Color", type: "vec3" });
          outputs.set("alpha", { name: "Alpha", type: "float" });
          break;
        case "output":
          inputs.set("color", { name: "Color", type: "vec3", value: [0.8, 0.8, 0.8] });
          inputs.set("roughness", { name: "Roughness", type: "float", value: 0.5 });
          inputs.set("metalness", { name: "Metalness", type: "float", value: 0 });
          inputs.set("normal", { name: "Normal", type: "vec3" });
          inputs.set("emission", { name: "Emission", type: "vec3", value: [0, 0, 0] });
          outputs.set("color", { name: "Final Color", type: "vec3" });
          break;
      }

      newGraph.addNode({ id, type, inputs, outputs, position: pos });
      onGraphChange(newGraph);
      setContextMenu(null);
    },
    [contextMenu, graph, onGraphChange, panOffset]
  );

  // ─── Render Connections ──────────────────────────────

  const renderConnections = useCallback(() => {
    const lines: React.ReactElement[] = [];

    for (let i = 0; i < graph.connections.length; i++) {
      const conn = graph.connections[i];
      const fromNode = graph.nodes.get(conn.fromNode);
      const toNode = graph.nodes.get(conn.toNode);
      if (!fromNode || !toNode) continue;

      const from = getPortPosition(fromNode, conn.fromOutput, true);
      const to = getPortPosition(toNode, conn.toInput, false);

      const cpx = Math.abs(to.x - from.x) * 0.5;

      lines.push(
        <path
          key={`conn-${i}`}
          d={`M ${from.x} ${from.y} C ${from.x + cpx} ${from.y}, ${to.x - cpx} ${to.y}, ${to.x} ${to.y}`}
          stroke="#555"
          strokeWidth={2}
          fill="none"
        />
      );
    }

    // Dragging connection line
    if (connecting) {
      const cpx =
        Math.abs(connecting.mousePos.x - connecting.fromPos.x) * 0.5;
      lines.push(
        <path
          key="connecting"
          d={`M ${connecting.fromPos.x} ${connecting.fromPos.y} C ${connecting.fromPos.x + cpx} ${connecting.fromPos.y}, ${connecting.mousePos.x - cpx} ${connecting.mousePos.y}, ${connecting.mousePos.x} ${connecting.mousePos.y}`}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="none"
        />
      );
    }

    return lines;
  }, [graph, connecting, getPortPosition]);

  // ─── Render Node ─────────────────────────────────────

  const renderNode = useCallback(
    (node: ShaderNode) => {
      const x = node.position[0] + panOffset.x;
      const y = node.position[1] + panOffset.y;
      const height = getNodeHeight(node);
      const inputEntries = Array.from(node.inputs.entries());
      const outputEntries = Array.from(node.outputs.entries());

      return (
        <div
          key={node.id}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: NODE_WIDTH,
            height,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 6,
            overflow: "hidden",
            cursor: "move",
            userSelect: "none",
            fontSize: 11,
            fontFamily: "monospace",
          }}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
        >
          {/* Header */}
          <div
            style={{
              height: NODE_HEADER_HEIGHT,
              background: "#252525",
              borderBottom: "1px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 8px",
              color: "#ccc",
              fontWeight: 600,
            }}
          >
            <span>{node.type}</span>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
                lineHeight: 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
            >
              x
            </button>
          </div>

          {/* Input ports */}
          {inputEntries.map(([key, input], idx) => (
            <div
              key={`in-${key}`}
              style={{
                position: "relative",
                height: PORT_SPACING,
                display: "flex",
                alignItems: "center",
                paddingLeft: 16,
                color: "#999",
              }}
              onMouseUp={() => handleInputPortMouseUp(node.id, key)}
            >
              <div
                style={{
                  position: "absolute",
                  left: -PORT_SIZE / 2,
                  width: PORT_SIZE,
                  height: PORT_SIZE,
                  borderRadius: "50%",
                  background: input.connected
                    ? TYPE_COLORS[input.type] ?? "#666"
                    : "#333",
                  border: `2px solid ${TYPE_COLORS[input.type] ?? "#666"}`,
                  cursor: "pointer",
                }}
              />
              <span>{input.name}</span>
            </div>
          ))}

          {/* Output ports */}
          {outputEntries.map(([key, output], idx) => (
            <div
              key={`out-${key}`}
              style={{
                position: "relative",
                height: PORT_SPACING,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 16,
                color: "#999",
              }}
            >
              <span>{output.name}</span>
              <div
                style={{
                  position: "absolute",
                  right: -PORT_SIZE / 2,
                  width: PORT_SIZE,
                  height: PORT_SIZE,
                  borderRadius: "50%",
                  background: TYPE_COLORS[output.type] ?? "#666",
                  border: `2px solid ${TYPE_COLORS[output.type] ?? "#666"}`,
                  cursor: "crosshair",
                }}
                onMouseDown={(e) =>
                  handleOutputPortMouseDown(node.id, key, e)
                }
              />
            </div>
          ))}
        </div>
      );
    },
    [
      panOffset,
      getNodeHeight,
      handleNodeMouseDown,
      handleDeleteNode,
      handleInputPortMouseUp,
      handleOutputPortMouseDown,
    ]
  );

  // ─── Render ──────────────────────────────────────────

  const nodeTypes = [
    "math",
    "mix",
    "noise",
    "fresnel",
    "colorRamp",
    "texture",
    "output",
  ];

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 400,
        background: "#0a0a0a",
        border: "1px solid #333",
        borderRadius: 4,
        overflow: "hidden",
        cursor: isPanning.current ? "grabbing" : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Grid background */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={20}
            height={20}
            patternUnits="userSpaceOnUse"
            x={panOffset.x % 20}
            y={panOffset.y % 20}
          >
            <circle cx={1} cy={1} r={0.5} fill="#222" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Connection SVG layer */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {renderConnections()}
      </svg>

      {/* Nodes */}
      {Array.from(graph.nodes.values()).map(renderNode)}

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: "absolute",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: 4,
            padding: 4,
            zIndex: 100,
            minWidth: 120,
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              color: "#666",
              fontSize: 10,
              fontFamily: "monospace",
              borderBottom: "1px solid #333",
            }}
          >
            Add Node
          </div>
          {nodeTypes.map((t) => (
            <div
              key={t}
              style={{
                padding: "6px 8px",
                color: "#ccc",
                fontSize: 11,
                fontFamily: "monospace",
                cursor: "pointer",
                borderRadius: 2,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = "transparent";
              }}
              onClick={() => handleAddNode(t)}
            >
              {t}
            </div>
          ))}
        </div>
      )}

      {/* Label */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          color: "#444",
          fontSize: 10,
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        Right-click to add nodes
      </div>
    </div>
  );
};

export default ShaderGraphEditor;
