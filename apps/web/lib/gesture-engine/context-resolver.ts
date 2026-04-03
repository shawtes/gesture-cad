/**
 * Context Resolver: determines what action to take based on:
 * - What the cursor is hovering over (HitTarget)
 * - Current gesture/touch state
 * - Active tool
 * - Which hand (dominant vs non-dominant)
 *
 * This makes gestures work like a touchscreen — the same pinch gesture
 * does different things depending on context.
 */

import type {
  HitTarget,
  InteractionAction,
  TouchState,
  HandRole,
} from "./types";
import type { ToolId } from "../store";

export interface ResolverInput {
  touchState: TouchState;
  hitTarget: HitTarget | null;
  activeTool: ToolId;
  handRole: HandRole;
  isDragging: boolean;
}

/**
 * Resolve the interaction action based on current context.
 * This is the core logic that makes gestures context-aware.
 */
export function resolveAction(input: ResolverInput): InteractionAction {
  const { touchState, hitTarget, activeTool, handRole, isDragging } = input;

  // Non-dominant hand always controls the viewport
  if (handRole === "non_dominant") {
    return resolveNonDominantAction(touchState, isDragging);
  }

  // Dominant hand actions depend on context
  switch (touchState) {
    case "idle":
      return "none";

    case "hover":
      return "none"; // Hover feedback handled separately (highlighting)

    case "press":
      return resolvePressAction(hitTarget, activeTool);

    case "drag":
      return resolveDragAction(hitTarget, activeTool);

    case "release":
      return "none";
  }
}

/** Non-dominant hand: viewport control */
function resolveNonDominantAction(state: TouchState, isDragging: boolean): InteractionAction {
  switch (state) {
    case "press":
    case "drag":
      return isDragging ? "pan_viewport" : "orbit_viewport";
    default:
      return "none";
  }
}

/** What happens when you pinch (press) something */
function resolvePressAction(
  hitTarget: HitTarget | null,
  activeTool: ToolId
): InteractionAction {
  // Nothing under cursor → start drawing with active tool
  if (!hitTarget || hitTarget.type === "empty") {
    return isDrawingTool(activeTool) ? "draw" : "select";
  }

  // Over an entity
  switch (hitTarget.type) {
    case "entity":
    case "entity_endpoint":
      return "select";

    case "entity_edge":
      // If fillet/chamfer tool is active, apply it to the edge
      if (activeTool === "fillet") return "fillet_edge";
      if (activeTool === "chamfer") return "fillet_edge";
      return "select";

    case "feature_face":
      // Pinch on a feature face could start interactive extrude
      if (activeTool === "extrude") return "extrude_interactive";
      return "select";

    case "feature_edge":
      if (activeTool === "fillet") return "fillet_edge";
      return "select";

    case "gizmo":
      return "move";

    default:
      return "none";
  }
}

/** What happens when you pinch+drag */
function resolveDragAction(
  hitTarget: HitTarget | null,
  activeTool: ToolId
): InteractionAction {
  // Started drag on empty space → drawing
  if (!hitTarget || hitTarget.type === "empty") {
    return isDrawingTool(activeTool) ? "draw" : "pan_viewport";
  }

  // Dragging an entity → move it
  if (hitTarget.type === "entity" || hitTarget.type === "entity_endpoint") {
    return "move";
  }

  // Dragging on a feature face → interactive extrude
  if (hitTarget.type === "feature_face") {
    return "extrude_interactive";
  }

  return "move";
}

/** Check if the active tool is a drawing tool */
function isDrawingTool(tool: ToolId): boolean {
  return (
    tool === "draw" ||
    tool === "line" ||
    tool === "circle" ||
    tool === "rect" ||
    tool === "arc" ||
    tool === "spline"
  );
}

/**
 * Get the cursor style hint based on hover context.
 * Components use this to show appropriate cursor feedback.
 */
export function getCursorHint(
  hitTarget: HitTarget | null,
  activeTool: ToolId
): "crosshair" | "grab" | "move" | "pointer" | "default" {
  if (!hitTarget || hitTarget.type === "empty") {
    return isDrawingTool(activeTool) ? "crosshair" : "default";
  }

  switch (hitTarget.type) {
    case "entity":
    case "entity_endpoint":
      return "grab";
    case "entity_edge":
      return activeTool === "fillet" || activeTool === "chamfer" ? "pointer" : "grab";
    case "feature_face":
      return activeTool === "extrude" ? "move" : "grab";
    case "gizmo":
      return "move";
    default:
      return "default";
  }
}
