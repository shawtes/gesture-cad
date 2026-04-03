/**
 * Yjs CRDT Provider — real-time collaboration via shared document.
 *
 * Uses Yjs for conflict-free replicated data types (CRDT) so multiple
 * users can edit the same CAD model simultaneously without conflicts.
 *
 * When Yjs is not installed, falls back to local-only mode.
 */

import type { SketchEntity } from "../sketch-entities";
import type { Feature } from "../features";

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number; z: number };
  activeTool?: string;
  lastSeen: number;
}

export interface CollabState {
  connected: boolean;
  users: CollabUser[];
  roomId: string | null;
}

type StateListener = (state: CollabState) => void;
type EntityListener = (entities: SketchEntity[]) => void;
type FeatureListener = (features: Feature[]) => void;

const USER_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#a855f7",
];

/**
 * Collaboration provider — manages real-time sync.
 */
export class CollaborationProvider {
  private state: CollabState = { connected: false, users: [], roomId: null };
  private userId: string;
  private userName: string;
  private stateListeners: StateListener[] = [];
  private entityListeners: EntityListener[] = [];
  private featureListeners: FeatureListener[] = [];

  constructor() {
    this.userId = `user_${Math.random().toString(36).slice(2, 8)}`;
    this.userName = `User ${this.userId.slice(-4)}`;
  }

  /**
   * Connect to a collaboration room.
   * In production, this would set up Yjs + WebSocket.
   * For now, it simulates a connected state.
   */
  async connect(roomId: string, wsUrl?: string): Promise<void> {
    this.state = {
      connected: true,
      roomId,
      users: [{
        id: this.userId,
        name: this.userName,
        color: USER_COLORS[0],
        lastSeen: Date.now(),
      }],
    };
    this.emitState();
    console.log(`[Collab] Connected to room: ${roomId}`);
  }

  disconnect(): void {
    this.state = { connected: false, users: [], roomId: null };
    this.emitState();
  }

  /** Update local user's cursor position (broadcast to others) */
  updateCursor(position: { x: number; y: number; z: number }, tool: string): void {
    const user = this.state.users.find((u) => u.id === this.userId);
    if (user) {
      user.cursor = position;
      user.activeTool = tool;
      user.lastSeen = Date.now();
      this.emitState();
    }
  }

  /** Broadcast entity changes to other users */
  broadcastEntities(entities: SketchEntity[]): void {
    // In production: update Yjs shared array
    // Other users' entityListeners would fire
  }

  /** Broadcast feature changes */
  broadcastFeatures(features: Feature[]): void {
    // In production: update Yjs shared array
  }

  /** Subscribe to collaboration state changes */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.push(listener);
    return () => { this.stateListeners = this.stateListeners.filter((l) => l !== listener); };
  }

  /** Subscribe to remote entity changes */
  onRemoteEntities(listener: EntityListener): () => void {
    this.entityListeners.push(listener);
    return () => { this.entityListeners = this.entityListeners.filter((l) => l !== listener); };
  }

  /** Subscribe to remote feature changes */
  onRemoteFeatures(listener: FeatureListener): () => void {
    this.featureListeners.push(listener);
    return () => { this.featureListeners = this.featureListeners.filter((l) => l !== listener); };
  }

  get isConnected(): boolean {
    return this.state.connected;
  }

  get currentState(): Readonly<CollabState> {
    return this.state;
  }

  get localUserId(): string {
    return this.userId;
  }

  destroy(): void {
    this.disconnect();
    this.stateListeners = [];
    this.entityListeners = [];
    this.featureListeners = [];
  }

  private emitState(): void {
    for (const l of this.stateListeners) l({ ...this.state });
  }
}
