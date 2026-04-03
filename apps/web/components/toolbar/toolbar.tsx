"use client";

import { useState, useRef, useEffect } from "react";
import { useCADState, useCADDispatch, type ToolId } from "@/lib/store";

/**
 * Onshape-style Part Studio Toolbar
 *
 * Horizontal row of tool groups separated by thin dividers.
 * Each group has a primary tool (visible) and a dropdown arrow
 * revealing related tools. Matches Onshape's exact grouping.
 */

interface ToolDef {
  id: ToolId;
  label: string;
  icon: string;
  shortcut?: string;
  description?: string;
}

interface ToolGroupDef {
  primary: ToolDef;
  secondary?: ToolDef[];
}

// ═══════════════════════════════════════════
// Tool Groups — matching Onshape Part Studio
// ═══════════════════════════════════════════

const TOOLBAR_GROUPS: ToolGroupDef[] = [
  // Group 1: Sketch
  {
    primary: { id: "line", label: "Sketch", icon: "✎", shortcut: "Shift+S", description: "Enter sketch mode — draw on the active plane" },
  },
  // Group 2: Extrude family
  {
    primary: { id: "extrude", label: "Extrude", icon: "⬡", shortcut: "Shift+E", description: "Extrude sketch regions into 3D solids" },
    secondary: [
      { id: "revolve_tool", label: "Revolve", icon: "◗", shortcut: "Shift+W", description: "Revolve sketch about an axis" },
      { id: "sweep", label: "Sweep", icon: "↝", description: "Sweep profile along a path" },
      { id: "loft", label: "Loft", icon: "⋈", description: "Blend between profiles" },
      { id: "thicken", label: "Thicken", icon: "▤", description: "Offset surface into solid" },
      { id: "rib", label: "Rib", icon: "▯", description: "Structural reinforcement wall" },
    ],
  },
  // Group 3: Fillet / Chamfer
  {
    primary: { id: "fillet", label: "Fillet", icon: "◠", description: "Round sharp edges" },
    secondary: [
      { id: "chamfer", label: "Chamfer", icon: "⌐", description: "Bevel edges with distance/angle" },
    ],
  },
  // Group 4: Hole / Shell / Draft
  {
    primary: { id: "hole", label: "Hole", icon: "⊙", shortcut: "H", description: "Drilled, counterbore, countersink, or tapped holes" },
    secondary: [
      { id: "external_thread", label: "External thread", icon: "⌬", description: "Add thread to cylindrical parts" },
      { id: "shell", label: "Shell", icon: "◻", description: "Hollow out a part with wall thickness" },
      { id: "draft", label: "Draft", icon: "◣", description: "Apply draft angle for mold release" },
      { id: "split", label: "Split", icon: "⫽", description: "Split part with a plane" },
    ],
  },
  // Group 5: Pattern
  {
    primary: { id: "linear_pattern", label: "Linear pattern", icon: "⫿", description: "Replicate in a row or grid" },
    secondary: [
      { id: "circular_pattern", label: "Circular pattern", icon: "◎", description: "Replicate around an axis" },
      { id: "curve_pattern", label: "Curve pattern", icon: "⌇", description: "Replicate along a curve" },
      { id: "mirror", label: "Mirror", icon: "⎸⎹", shortcut: "M", description: "Mirror across a plane" },
    ],
  },
  // Group 6: Boolean
  {
    primary: { id: "union", label: "Boolean", icon: "⊕", description: "Union, subtract, or intersect parts" },
    secondary: [
      { id: "subtract", label: "Subtract", icon: "⊖", description: "Remove material" },
      { id: "intersect", label: "Intersect", icon: "⊗", description: "Keep only overlap" },
    ],
  },
  // Group 7: Modify / Direct Edit
  {
    primary: { id: "modify_fillet", label: "Modify fillet", icon: "◠̃", description: "Remove or change radius of existing fillets" },
    secondary: [
      { id: "move_face", label: "Move face", icon: "⇱", description: "Move selected faces by offset/direction" },
      { id: "delete_face", label: "Delete face", icon: "⊘", description: "Remove faces from solid" },
      { id: "replace_face", label: "Replace face", icon: "⇄", description: "Swap face with another surface" },
      { id: "offset_face", label: "Offset face", icon: "⇕", description: "Push/pull face by distance" },
      { id: "delete_part", label: "Delete part", icon: "✕", description: "Remove entire part" },
      { id: "transform_part", label: "Move/Copy", icon: "⤡", description: "Move, rotate, or copy parts" },
    ],
  },
  // Group 8: Helix / Emboss
  {
    primary: { id: "helix", label: "Helix", icon: "⌀", description: "Create helical curve for springs/threads" },
    secondary: [
      { id: "emboss", label: "Emboss", icon: "𝐓", description: "Raise or engrave text on surface" },
    ],
  },
  // Group 9: Plane / Construction
  {
    primary: { id: "custom_plane", label: "Plane", icon: "◫", description: "Create construction plane" },
    secondary: [
      { id: "mate_connector", label: "Mate connector", icon: "⊕", shortcut: "Ctrl+M", description: "Create explicit mate attachment point" },
      { id: "construction_axis", label: "Axis", icon: "│", description: "Reference axis from geometry" },
      { id: "construction_point", label: "Point", icon: "◎", description: "Reference point from geometry" },
      { id: "construction", label: "Construction", icon: "┄", description: "Toggle construction mode" },
      { id: "dimension", label: "Dimension", icon: "↔", shortcut: "D", description: "Measure" },
    ],
  },
  // Group 10: Frame
  {
    primary: { id: "frame_tool", label: "Frame", icon: "⊞", description: "Create structural frame by sweeping profile along edges" },
  },
  // Group 11: Mesh Edit (Blender)
  {
    primary: { id: "edit_mode", label: "Edit Mode", icon: "◆", shortcut: "Tab", description: "Enter mesh edit mode — vertex/edge/face selection" },
    secondary: [
      { id: "mesh_extrude", label: "Extrude", icon: "⇑", shortcut: "E", description: "Extrude selected faces or edges" },
      { id: "mesh_subdivide", label: "Subdivide", icon: "▦", description: "Subdivide selected faces" },
      { id: "loop_cut", label: "Loop Cut", icon: "⊟", shortcut: "Ctrl+R", description: "Insert edge loops" },
      { id: "knife", label: "Knife", icon: "⌧", shortcut: "K", description: "Cut edges across faces" },
      { id: "inset", label: "Inset", icon: "◻", shortcut: "I", description: "Inset faces toward centroid" },
      { id: "bevel", label: "Bevel", icon: "◗", shortcut: "Ctrl+B", description: "Bevel edges with chamfer" },
      { id: "mesh_mirror", label: "Mirror", icon: "⎸⎹", description: "Mirror mesh across axis" },
      { id: "catmull_clark", label: "Subdivide Smooth", icon: "◎", description: "Catmull-Clark subdivision surface" },
      { id: "skin_modifier", label: "Skin", icon: "⊕", description: "Generate mesh from skeleton via skin modifier" },
    ],
  },
  // Group 12: Sculpt (Blender)
  {
    primary: { id: "sculpt_mode", label: "Sculpt", icon: "🔮", description: "Enter sculpt mode with brush tools" },
    secondary: [
      { id: "sculpt_grab", label: "Grab", icon: "✊", description: "Grab and move vertices with falloff" },
      { id: "sculpt_smooth", label: "Smooth", icon: "〰", description: "Laplacian smooth vertices" },
      { id: "sculpt_inflate", label: "Inflate", icon: "◉", description: "Inflate along normals" },
      { id: "sculpt_pinch", label: "Pinch", icon: "⊛", description: "Pinch vertices toward center" },
      { id: "sculpt_crease", label: "Crease", icon: "⋁", description: "Create sharp creases" },
      { id: "sculpt_flatten", label: "Flatten", icon: "▬", description: "Flatten to average plane" },
    ],
  },
  // Group 13: UV / Texture (Blender)
  {
    primary: { id: "uv_unwrap", label: "UV Unwrap", icon: "⊞", description: "Unwrap mesh UVs" },
    secondary: [
      { id: "uv_edit", label: "UV Editor", icon: "▤", description: "Open 2D UV editor panel" },
      { id: "seam_mark", label: "Mark Seam", icon: "┈", description: "Mark/unmark UV seam edges" },
      { id: "texture_paint", label: "Texture Paint", icon: "🖌", description: "Paint directly on 3D mesh" },
      { id: "vertex_paint", label: "Vertex Paint", icon: "◈", description: "Paint vertex colors" },
    ],
  },
  // Group 14: Materials / Shaders (Blender)
  {
    primary: { id: "material_edit", label: "Materials", icon: "◑", description: "Edit PBR material properties" },
    secondary: [
      { id: "shader_edit", label: "Shader Editor", icon: "⊞", description: "Open node-based shader graph editor" },
    ],
  },
  // Group 15: Rigging (Blender)
  {
    primary: { id: "add_bone", label: "Armature", icon: "🦴", description: "Add bones for character rigging" },
    secondary: [
      { id: "bone_edit", label: "Edit Bones", icon: "⊹", description: "Select and edit bone positions" },
      { id: "ik_setup", label: "IK Setup", icon: "↪", description: "Set up inverse kinematics chain" },
      { id: "weight_paint", label: "Weight Paint", icon: "▓", description: "Paint bone influence weights" },
      { id: "morph_target", label: "Shape Keys", icon: "◐", description: "Create and edit morph targets" },
      { id: "auto_rig", label: "Auto Rig", icon: "⚡", description: "Automatically rig humanoid mesh" },
    ],
  },
  // Group 16: Animation (Blender)
  {
    primary: { id: "timeline", label: "Animation", icon: "▶", description: "Open animation timeline" },
    secondary: [
      { id: "keyframe_add", label: "Add Keyframe", icon: "◆", shortcut: "I", description: "Insert keyframe at current time" },
      { id: "graph_editor", label: "Graph Editor", icon: "📈", description: "Edit animation curves" },
      { id: "nla_edit", label: "NLA Editor", icon: "≡", description: "Non-linear animation mixing" },
      { id: "play_animation", label: "Play", icon: "▶", shortcut: "Space", description: "Play/pause animation" },
    ],
  },
  // Group 17: Render (Blender)
  {
    primary: { id: "render_capture", label: "Render", icon: "📷", description: "Capture render or sequence" },
    secondary: [
      { id: "path_trace", label: "Path Trace", icon: "☀", description: "Enable progressive path tracing" },
      { id: "post_process", label: "Post Process", icon: "✨", description: "Configure bloom, DOF, SSAO" },
      { id: "lighting_rig", label: "Lighting", icon: "💡", description: "Select studio lighting preset" },
      { id: "asset_library", label: "Asset Library", icon: "📦", description: "Browse and manage assets" },
    ],
  },
];

// Sketch tools shown when in sketch mode
const SKETCH_TOOLS: ToolDef[] = [
  { id: "line", label: "Line", icon: "╱", shortcut: "L" },
  { id: "rect", label: "Corner rectangle", icon: "□", shortcut: "R" },
  { id: "circle", label: "Center point circle", icon: "○", shortcut: "C" },
  { id: "arc", label: "3 point arc", icon: "⌒", shortcut: "A" },
  { id: "spline", label: "Spline", icon: "〜" },
  { id: "draw", label: "Point", icon: "•", shortcut: "P" },
  { id: "ellipse", label: "Ellipse", icon: "⬭", shortcut: "E" },
  { id: "slot", label: "Slot", icon: "⊞" },
  { id: "polygon", label: "Polygon", icon: "⬡", shortcut: "G" },
  { id: "trim", label: "Trim", icon: "✂", shortcut: "T" },
  { id: "offset", label: "Offset", icon: "⧫" },
  { id: "sketch_3d", label: "3D Sketch", icon: "✦", description: "Draw in full 3D space — not constrained to a plane" },
  { id: "center_rect", label: "Center rectangle", icon: "▣", shortcut: "R" },
  { id: "three_point_circle", label: "3 point circle", icon: "◉" },
  { id: "tangent_arc", label: "Tangent arc", icon: "◜" },
  { id: "sketch_text", label: "Text", icon: "T" },
  { id: "sketch_linear_pattern", label: "Sketch linear pattern", icon: "⫿" },
  { id: "sketch_circular_pattern", label: "Sketch circular pattern", icon: "◎" },
  { id: "use_project", label: "Use/Project", icon: "⤓", shortcut: "U" },
];

function ToolGroupButton({ group, activeTool, onSelect }: {
  group: ToolGroupDef;
  activeTool: ToolId;
  onSelect: (id: ToolId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = activeTool === group.primary.id ||
    group.secondary?.some((t) => activeTool === t.id);

  return (
    <div ref={ref} style={s.toolGroup}>
      <div style={s.toolGroupInner}>
        {/* Primary tool button */}
        <button
          data-testid={`tool-${group.primary.id}`}
          style={{
            ...s.toolBtn,
            ...(isActive ? s.toolBtnActive : {}),
          }}
          onClick={() => onSelect(group.primary.id)}
          title={`${group.primary.label}${group.primary.shortcut ? ` (${group.primary.shortcut})` : ""}\n${group.primary.description || ""}`}
        >
          <span style={s.toolIcon}>{group.primary.icon}</span>
          <span style={s.toolLabel}>{group.primary.label}</span>
        </button>

        {/* Dropdown arrow */}
        {group.secondary && group.secondary.length > 0 && (
          <button
            style={s.dropdownArrow}
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            title="More tools"
          >
            <span style={{ fontSize: 8 }}>▾</span>
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {open && group.secondary && (
        <div style={s.dropdown}>
          {group.secondary.map((tool) => (
            <button
              key={tool.id}
              data-testid={`tool-${tool.id}`}
              style={{
                ...s.dropdownItem,
                ...(activeTool === tool.id ? s.dropdownItemActive : {}),
              }}
              onClick={() => { onSelect(tool.id); setOpen(false); }}
              title={tool.description}
            >
              <span style={s.dropdownIcon}>{tool.icon}</span>
              <span>{tool.label}</span>
              {tool.shortcut && <span style={s.dropdownShortcut}>{tool.shortcut}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toolbar() {
  const { activeTool } = useCADState();
  const dispatch = useCADDispatch();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSketchMode = ["line", "rect", "circle", "arc", "spline", "draw",
    "ellipse", "slot", "polygon", "trim", "offset", "dimension", "sketch_3d",
    "center_rect", "three_point_circle", "tangent_arc", "sketch_text",
    "sketch_linear_pattern", "sketch_circular_pattern", "use_project"].includes(activeTool);

  const handleSelect = (id: ToolId) => {
    dispatch({ type: "SET_TOOL", tool: id });
  };

  // All tools for search
  const allTools: ToolDef[] = [
    ...TOOLBAR_GROUPS.flatMap((g) => [g.primary, ...(g.secondary || [])]),
    ...SKETCH_TOOLS,
  ];
  const filtered = searchQuery
    ? allTools.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Alt+C shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "c") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={s.container}>
      {/* Undo / Redo */}
      <div style={s.undoGroup}>
        <button data-testid="btn-undo" style={s.undoBtn} onClick={() => dispatch({ type: "UNDO" })} title="Undo (Cmd+Z)">
          <span style={{ fontSize: 15 }}>↶</span>
        </button>
        <button data-testid="btn-redo" style={s.undoBtn} onClick={() => dispatch({ type: "REDO" })} title="Redo (Ctrl+Y)">
          <span style={{ fontSize: 15 }}>↷</span>
        </button>
      </div>

      <div style={s.sep} />

      {/* Sketch tools row (shown when in sketch mode) OR Feature tools */}
      {isSketchMode ? (
        <div style={s.sketchRow}>
          {SKETCH_TOOLS.map((tool) => (
            <button
              key={tool.id}
              data-testid={`tool-${tool.id}`}
              style={{
                ...s.toolBtn,
                ...(activeTool === tool.id ? s.toolBtnActive : {}),
              }}
              onClick={() => handleSelect(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
            >
              <span style={s.toolIcon}>{tool.icon}</span>
              <span style={s.toolLabel}>{tool.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={s.toolRow}>
          {TOOLBAR_GROUPS.map((group, i) => (
            <ToolGroupButton
              key={i}
              group={group}
              activeTool={activeTool}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Search tools button */}
      <button
        style={s.searchBtn}
        onClick={() => setShowSearch(!showSearch)}
      >
        Search tools… <span style={s.searchShortcut}><span style={s.kbdKey}>alt</span><span style={s.kbdKey}>c</span></span>
      </button>

      {/* Search overlay */}
      {showSearch && (
        <div style={s.searchOverlay}>
          <div style={s.searchBox}>
            <input
              autoFocus
              style={s.searchInput}
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSearch(false);
                if (e.key === "Enter" && filtered.length > 0) {
                  handleSelect(filtered[0].id);
                  setShowSearch(false);
                  setSearchQuery("");
                }
              }}
            />
            {filtered.map((tool) => (
              <button
                key={tool.id + tool.label}
                style={s.searchResult}
                onClick={() => { handleSelect(tool.id); setShowSearch(false); setSearchQuery(""); }}
              >
                <span style={{ fontSize: 16, width: 24 }}>{tool.icon}</span>
                <span>{tool.label}</span>
                {tool.shortcut && <span style={{ color: "#666", fontSize: 11, marginLeft: "auto" }}>{tool.shortcut}</span>}
              </button>
            ))}
            {searchQuery && filtered.length === 0 && (
              <div style={{ padding: "12px 16px", color: "#666", fontSize: 12 }}>No tools found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Styles — matching Onshape toolbar aesthetics
// ═══════════════════════════════════════════

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    height: 42,
    background: "#161618",
    borderBottom: "1px solid #2a2a2a",
    padding: "0 8px",
    gap: 0,
    position: "relative",
    flexShrink: 0,
    overflow: "visible",
    zIndex: 60,
  },
  undoGroup: {
    display: "flex",
    gap: 2,
    flexShrink: 0,
  },
  undoBtn: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    color: "#999",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.1s",
  },
  sep: {
    width: 1,
    height: 28,
    background: "#333",
    margin: "0 6px",
    flexShrink: 0,
  },
  toolRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
  },
  sketchRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap" as const,
  },
  toolGroup: {
    display: "flex",
    alignItems: "center",
    position: "relative" as const,
    borderRight: "1px solid #2a2a2a",
    paddingRight: 2,
    marginRight: 2,
    zIndex: 61,
  },
  toolGroupInner: {
    display: "flex",
    alignItems: "stretch",
  },
  toolBtn: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    padding: "3px 10px",
    background: "transparent",
    border: "none",
    borderRadius: 3,
    color: "#bbb",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 10,
    minWidth: 44,
    height: 36,
    transition: "all 0.1s",
    whiteSpace: "nowrap" as const,
  },
  toolBtnActive: {
    background: "#1e3a5f",
    color: "#93c5fd",
  },
  toolIcon: {
    fontSize: 17,
    lineHeight: "19px",
  },
  toolLabel: {
    fontSize: 9,
    lineHeight: "11px",
    fontWeight: 500,
    opacity: 0.8,
  },
  dropdownArrow: {
    width: 14,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderLeft: "1px solid #2a2a2a",
    color: "#666",
    cursor: "pointer",
    fontFamily: "inherit",
    borderRadius: 0,
    padding: 0,
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    marginTop: 2,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "4px 0",
    minWidth: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
    zIndex: 100,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "7px 14px",
    background: "transparent",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    textAlign: "left" as const,
    transition: "background 0.1s",
  },
  dropdownItemActive: {
    background: "#1e3a5f",
    color: "#93c5fd",
  },
  dropdownIcon: {
    fontSize: 16,
    width: 20,
    textAlign: "center" as const,
  },
  dropdownShortcut: {
    marginLeft: "auto",
    color: "#555",
    fontSize: 11,
  },
  searchBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 14px",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    color: "#666",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    flexShrink: 0,
  },
  searchShortcut: {
    display: "flex",
    gap: 3,
  },
  kbdKey: {
    padding: "1px 5px",
    background: "#222",
    borderRadius: 3,
    fontSize: 10,
    color: "#888",
    border: "1px solid #333",
  },
  searchOverlay: {
    position: "absolute" as const,
    top: "100%",
    right: 8,
    marginTop: 4,
    zIndex: 200,
  },
  searchBox: {
    width: 320,
    background: "#1a1a1a",
    border: "1px solid #3b82f6",
    borderRadius: 8,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px",
    background: "#111",
    border: "none",
    borderBottom: "1px solid #2a2a2a",
    color: "#e5e5e5",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
  },
  searchResult: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 14px",
    background: "transparent",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
    textAlign: "left" as const,
  },
};
