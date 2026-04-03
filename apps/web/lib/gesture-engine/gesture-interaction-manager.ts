/**
 * Gesture Interaction Manager — central coordinator for touchscreen-like gesture input.
 *
 * Replaces the old gesture→tool mapping with direct spatial manipulation:
 * - Integrates hand tracking, touch state machine, hit testing, and context resolution
 * - Emits InteractionEvents that drive CAD operations
 * - Supports multi-hand input with role assignment (dominant draws, non-dominant controls viewport)
 */

import type {
  TrackedHand,
  InteractionEvent,
  HitTarget,
  HandRole,
} from "./types";
import { TouchStateMachine } from "./touch-state-machine";
import { VelocityTracker, type SwipeDirection } from "./velocity-tracker";
import { hitTestSketchEntities, hitTestFeatures, type HitTestContext } from "./hit-test";
import { resolveAction } from "./context-resolver";
import { MultiHandResolver, type TwoHandDelta, type TwoHandGesture } from "./multi-hand-resolver";
import { GestureSequenceDetector, type GestureSequenceEvent } from "./gesture-sequences";
import { ExtrudeGestureHandler, type ExtrudeGestureState } from "./extrude-gesture";
import type { ToolId, SketchPlaneId } from "../store";
import type { SketchEntity } from "../sketch-entities";
import type { Feature } from "../features";

export type InteractionEventListener = (event: InteractionEvent) => void;
export type SwipeListener = (direction: SwipeDirection) => void;
export type HoverListener = (hitTarget: HitTarget | null) => void;
export type TwoHandGestureListener = (gesture: TwoHandGesture, delta: TwoHandDelta) => void;
export type ExtrudeGestureListener = (state: ExtrudeGestureState) => void;
export type SequenceListener = (event: GestureSequenceEvent) => void;

export interface GestureInteractionManagerConfig {
  /** Which hand is dominant (default: Right) */
  dominantHand: "Left" | "Right";
}

const DEFAULT_CONFIG: GestureInteractionManagerConfig = {
  dominantHand: "Right",
};

export class GestureInteractionManager {
  private config: GestureInteractionManagerConfig;

  // Per-hand state machines
  private dominantTSM = new TouchStateMachine();
  private nonDominantTSM = new TouchStateMachine();

  // Per-hand velocity trackers
  private dominantVelocity = new VelocityTracker();
  private nonDominantVelocity = new VelocityTracker();

  // Current tracked hands
  private dominantHand: TrackedHand | null = null;
  private nonDominantHand: TrackedHand | null = null;

  // Hit test context (updated externally)
  private hitContext: HitTestContext = {
    entities: [],
    features: [],
    sketchPlane: "xz",
  };

  // Current hover target
  private currentHoverTarget: HitTarget | null = null;

  // Current active tool
  private activeTool: ToolId = "select";

  // Press-start hit target (captured on press, used throughout drag)
  private pressHitTarget: HitTarget | null = null;

  // Multi-hand resolver (Sprint 3)
  private multiHandResolver = new MultiHandResolver();

  // Gesture sequence detector (Sprint 3)
  private sequenceDetector = new GestureSequenceDetector();

  // Interactive extrude handler (Sprint 3)
  private extrudeHandler = new ExtrudeGestureHandler();

  // Listeners
  private interactionListeners: InteractionEventListener[] = [];
  private swipeListeners: SwipeListener[] = [];
  private hoverListeners: HoverListener[] = [];
  private twoHandListeners: TwoHandGestureListener[] = [];
  private extrudeListeners: ExtrudeGestureListener[] = [];
  private sequenceListeners: SequenceListener[] = [];

  constructor(config?: Partial<GestureInteractionManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupStateListeners();
    this.setupSequenceListeners();
  }

  // ---------- Public API ----------

  /** Update with new hand tracking results. Call every frame. */
  updateHands(hands: TrackedHand[], timestamp: number): void {
    // Assign roles based on handedness
    this.dominantHand = null;
    this.nonDominantHand = null;

    for (const hand of hands) {
      if (hand.handedness === this.config.dominantHand) {
        hand.role = "dominant";
        this.dominantHand = hand;
      } else {
        hand.role = "non_dominant";
        this.nonDominantHand = hand;
      }
    }

    // Update dominant hand state machine
    if (this.dominantHand) {
      const pos = this.dominantHand.screenPosition;
      this.dominantVelocity.addSample(pos.x, pos.y, timestamp);
      this.dominantTSM.update(pos, this.dominantHand.pinchDistance, timestamp);

      // Hit test at current position
      this.updateHoverTarget(pos);
    } else {
      this.dominantTSM.update(null, 1, timestamp);
      this.dominantVelocity.reset();
      if (this.currentHoverTarget) {
        this.currentHoverTarget = null;
        this.emitHover(null);
      }
    }

    // Update non-dominant hand state machine
    if (this.nonDominantHand) {
      const pos = this.nonDominantHand.screenPosition;
      this.nonDominantVelocity.addSample(pos.x, pos.y, timestamp);
      this.nonDominantTSM.update(pos, this.nonDominantHand.pinchDistance, timestamp);
    } else {
      this.nonDominantTSM.update(null, 1, timestamp);
      this.nonDominantVelocity.reset();
    }

    // Check for swipe gestures (non-pinch fast movement on dominant hand)
    if (this.dominantHand && !this.dominantHand.isPinching) {
      const swipe = this.dominantVelocity.detectSwipe();
      if (swipe) {
        this.emitSwipe(swipe);
        this.dominantVelocity.reset();
      }
    }

    // Two-hand gesture detection (zoom/rotate/pan)
    const twoHandDelta = this.multiHandResolver.update(this.dominantHand, this.nonDominantHand);
    if (twoHandDelta) {
      const gesture = this.multiHandResolver.classify(twoHandDelta);
      if (gesture !== "none") {
        this.emitTwoHandGesture(gesture, twoHandDelta);
      }
    }

    // Update interactive extrude if active
    if (this.extrudeHandler.isActive && this.dominantHand) {
      this.extrudeHandler.updateDrag(this.dominantHand.screenPosition.y);
    }
  }

  /** Update the hit test context (entities, features, sketch plane) */
  setHitTestContext(entities: SketchEntity[], features: Feature[], sketchPlane: SketchPlaneId): void {
    this.hitContext = { entities, features, sketchPlane };
  }

  /** Set the active tool */
  setActiveTool(tool: ToolId): void {
    this.activeTool = tool;
  }

  /** Subscribe to interaction events */
  onInteraction(listener: InteractionEventListener): () => void {
    this.interactionListeners.push(listener);
    return () => {
      this.interactionListeners = this.interactionListeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to swipe gestures */
  onSwipe(listener: SwipeListener): () => void {
    this.swipeListeners.push(listener);
    return () => {
      this.swipeListeners = this.swipeListeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to hover target changes */
  onHover(listener: HoverListener): () => void {
    this.hoverListeners.push(listener);
    return () => {
      this.hoverListeners = this.hoverListeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to two-hand gesture events (zoom/rotate/pan) */
  onTwoHandGesture(listener: TwoHandGestureListener): () => void {
    this.twoHandListeners.push(listener);
    return () => {
      this.twoHandListeners = this.twoHandListeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to interactive extrude state changes */
  onExtrudeGesture(listener: ExtrudeGestureListener): () => void {
    this.extrudeListeners.push(listener);
    return () => {
      this.extrudeListeners = this.extrudeListeners.filter((l) => l !== listener);
    };
  }

  /** Subscribe to gesture sequence events (tap, double-tap, long-press, pinch-pull) */
  onGestureSequence(listener: SequenceListener): () => void {
    this.sequenceListeners.push(listener);
    return () => {
      this.sequenceListeners = this.sequenceListeners.filter((l) => l !== listener);
    };
  }

  /** Get the extrude gesture handler for direct state access */
  getExtrudeHandler(): ExtrudeGestureHandler {
    return this.extrudeHandler;
  }

  /** Get current state for rendering */
  getDominantState() {
    return this.dominantTSM.state;
  }

  getNonDominantState() {
    return this.nonDominantTSM.state;
  }

  getCurrentHover(): HitTarget | null {
    return this.currentHoverTarget;
  }

  /** Clean up */
  destroy(): void {
    this.interactionListeners = [];
    this.swipeListeners = [];
    this.hoverListeners = [];
    this.twoHandListeners = [];
    this.extrudeListeners = [];
    this.sequenceListeners = [];
    this.dominantTSM.reset();
    this.nonDominantTSM.reset();
    this.multiHandResolver.reset();
    this.sequenceDetector.destroy();
    this.extrudeHandler.destroy();
  }

  // ---------- Private ----------

  private setupSequenceListeners(): void {
    // Forward dominant hand state transitions to sequence detector
    this.dominantTSM.onTransition((transition) => {
      const pos = this.dominantHand?.screenPosition ?? null;
      this.sequenceDetector.onStateChange(
        transition.to,
        pos,
        transition.data.lastTransitionTime
      );
    });

    // Listen for gesture sequences and handle them
    this.sequenceDetector.onSequence((event) => {
      // Emit to external listeners
      for (const listener of this.sequenceListeners) {
        listener(event);
      }

      // Handle pinch-pull → start interactive extrude
      if (event.type === "pinch_pull_up" || event.type === "pinch_pull_down") {
        if (this.pressHitTarget?.entityId && !this.extrudeHandler.isActive) {
          const entity = this.hitContext.entities.find(
            (e) => e.id === this.pressHitTarget?.entityId
          );
          if (entity && this.dominantHand) {
            this.extrudeHandler.start(entity, this.dominantHand.screenPosition.y);
          }
        }
      }
    });

    // Forward extrude handler state changes
    this.extrudeHandler.onStateChange((state) => {
      for (const listener of this.extrudeListeners) {
        listener(state);
      }
    });
  }

  private setupStateListeners(): void {
    // Dominant hand transitions → interaction events
    this.dominantTSM.onTransition((transition) => {
      const hand = this.dominantHand;
      if (!hand) return;

      const velocityData = this.dominantVelocity.compute();
      const screenPos = hand.screenPosition;

      // Capture hit target on press
      if (transition.to === "press") {
        this.pressHitTarget = this.currentHoverTarget;
      }

      // Use press-start target for drag operations (not current hover)
      const hitTarget = transition.to === "drag" ? this.pressHitTarget : this.currentHoverTarget;

      const action = resolveAction({
        touchState: transition.to,
        hitTarget,
        activeTool: this.activeTool,
        handRole: "dominant",
        isDragging: transition.to === "drag",
      });

      const dragDelta = this.dominantTSM.getDragDelta();

      this.emitInteraction({
        action,
        state: transition.to,
        position: hitTarget?.worldPosition ?? { x: 0, y: 0, z: 0 },
        screenPosition: { x: screenPos.x * 2 - 1, y: -(screenPos.y * 2 - 1) },
        hitTarget,
        velocity: velocityData.velocity,
        handRole: "dominant",
        dragDelta: dragDelta ? { x: dragDelta.x, y: dragDelta.y, z: 0 } : undefined,
        timestamp: transition.data.lastTransitionTime,
      });

      // Clear press target on release
      if (transition.to === "release" || transition.to === "idle") {
        this.pressHitTarget = null;
      }
    });

    // Non-dominant hand → viewport control events
    this.nonDominantTSM.onTransition((transition) => {
      const hand = this.nonDominantHand;
      if (!hand) return;

      const velocityData = this.nonDominantVelocity.compute();
      const screenPos = hand.screenPosition;

      const action = resolveAction({
        touchState: transition.to,
        hitTarget: null,
        activeTool: this.activeTool,
        handRole: "non_dominant",
        isDragging: transition.to === "drag",
      });

      if (action !== "none") {
        const dragDelta = this.nonDominantTSM.getDragDelta();
        this.emitInteraction({
          action,
          state: transition.to,
          position: { x: 0, y: 0, z: 0 },
          screenPosition: { x: screenPos.x * 2 - 1, y: -(screenPos.y * 2 - 1) },
          hitTarget: null,
          velocity: velocityData.velocity,
          handRole: "non_dominant",
          dragDelta: dragDelta ? { x: dragDelta.x, y: dragDelta.y, z: 0 } : undefined,
          timestamp: transition.data.lastTransitionTime,
        });
      }
    });
  }

  private updateHoverTarget(screenPos: { x: number; y: number }): void {
    // Convert 0-1 screen pos to sketch coordinates (simplified — actual projection done in component)
    // For hit testing, we pass the screen position and let the component do the raycasting
    // Here we do sketch-space hit testing using the entities directly

    // This is a simplified approach — in the component layer, we project screen → sketch coords
    // and call hitTestSketchEntities with those coords
    const entityHit = hitTestSketchEntities(
      { x: screenPos.x * 10 - 5, z: screenPos.y * 10 - 5 }, // Rough mapping, refined in component
      this.hitContext
    );

    const featureHit = entityHit ? null : hitTestFeatures(
      { x: screenPos.x * 10 - 5, z: screenPos.y * 10 - 5 },
      this.hitContext.features,
      this.hitContext.sketchPlane
    );

    const newTarget = entityHit ?? featureHit ?? null;

    // Only emit if target changed
    const changed =
      newTarget?.entityId !== this.currentHoverTarget?.entityId ||
      newTarget?.featureId !== this.currentHoverTarget?.featureId ||
      newTarget?.type !== this.currentHoverTarget?.type;

    if (changed) {
      this.currentHoverTarget = newTarget;
      this.emitHover(newTarget);
    }
  }

  private emitInteraction(event: InteractionEvent): void {
    for (const listener of this.interactionListeners) {
      listener(event);
    }
  }

  private emitSwipe(direction: SwipeDirection): void {
    for (const listener of this.swipeListeners) {
      listener(direction);
    }
  }

  private emitHover(target: HitTarget | null): void {
    for (const listener of this.hoverListeners) {
      listener(target);
    }
  }

  private emitTwoHandGesture(gesture: TwoHandGesture, delta: TwoHandDelta): void {
    for (const listener of this.twoHandListeners) {
      listener(gesture, delta);
    }
  }
}
