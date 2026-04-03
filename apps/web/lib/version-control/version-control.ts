/**
 * Version Control — git-like snapshots, branching, and merging for CAD models.
 */

import type { SketchEntity } from "../sketch-entities";
import type { Feature } from "../features";
import type { SketchConstraint } from "../constraints";

export interface Snapshot {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  branchId: string;
  parentId: string | null;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  features: Feature[];
}

export interface Branch {
  id: string;
  name: string;
  headSnapshotId: string;
  createdAt: number;
}

export interface VersionState {
  snapshots: Snapshot[];
  branches: Branch[];
  activeBranchId: string;
  currentSnapshotId: string | null;
}

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

export function createInitialVersionState(): VersionState {
  const mainBranch: Branch = { id: "branch_main", name: "main", headSnapshotId: "", createdAt: Date.now() };
  return { snapshots: [], branches: [mainBranch], activeBranchId: "branch_main", currentSnapshotId: null };
}

/**
 * Create a snapshot (commit) of the current state.
 */
export function createSnapshot(
  state: VersionState,
  message: string,
  entities: SketchEntity[],
  constraints: SketchConstraint[],
  features: Feature[],
  author: string = "User"
): VersionState {
  const snapshot: Snapshot = {
    id: nextId("snap"),
    message,
    author,
    timestamp: Date.now(),
    branchId: state.activeBranchId,
    parentId: state.currentSnapshotId,
    entities: JSON.parse(JSON.stringify(entities)),
    constraints: JSON.parse(JSON.stringify(constraints)),
    features: JSON.parse(JSON.stringify(features)),
  };

  const branches = state.branches.map((b) =>
    b.id === state.activeBranchId ? { ...b, headSnapshotId: snapshot.id } : b
  );

  return {
    ...state,
    snapshots: [...state.snapshots, snapshot],
    branches,
    currentSnapshotId: snapshot.id,
  };
}

/**
 * Create a new branch from the current snapshot.
 */
export function createBranch(state: VersionState, name: string): VersionState {
  const branch: Branch = {
    id: nextId("branch"),
    name,
    headSnapshotId: state.currentSnapshotId || "",
    createdAt: Date.now(),
  };
  return { ...state, branches: [...state.branches, branch], activeBranchId: branch.id };
}

/**
 * Switch to a different branch.
 */
export function switchBranch(state: VersionState, branchId: string): { state: VersionState; snapshot: Snapshot | null } {
  const branch = state.branches.find((b) => b.id === branchId);
  if (!branch) return { state, snapshot: null };

  const snapshot = state.snapshots.find((s) => s.id === branch.headSnapshotId) || null;
  return {
    state: { ...state, activeBranchId: branchId, currentSnapshotId: branch.headSnapshotId },
    snapshot,
  };
}

/**
 * Get the history chain from a snapshot back to the root.
 */
export function getHistory(state: VersionState, snapshotId?: string): Snapshot[] {
  const history: Snapshot[] = [];
  let currentId = snapshotId || state.currentSnapshotId;

  while (currentId) {
    const snap = state.snapshots.find((s) => s.id === currentId);
    if (!snap) break;
    history.push(snap);
    currentId = snap.parentId;
  }

  return history.reverse();
}

/**
 * Compute a diff between two snapshots.
 */
export function diffSnapshots(a: Snapshot, b: Snapshot): {
  entitiesAdded: number;
  entitiesRemoved: number;
  featuresAdded: number;
  featuresRemoved: number;
} {
  const aEntityIds = new Set(a.entities.map((e) => e.id));
  const bEntityIds = new Set(b.entities.map((e) => e.id));
  const aFeatureIds = new Set(a.features.map((f) => f.id));
  const bFeatureIds = new Set(b.features.map((f) => f.id));

  return {
    entitiesAdded: [...bEntityIds].filter((id) => !aEntityIds.has(id)).length,
    entitiesRemoved: [...aEntityIds].filter((id) => !bEntityIds.has(id)).length,
    featuresAdded: [...bFeatureIds].filter((id) => !aFeatureIds.has(id)).length,
    featuresRemoved: [...aFeatureIds].filter((id) => !bFeatureIds.has(id)).length,
  };
}
