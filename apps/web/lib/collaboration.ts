/** Collaboration: real-time sync, cursor sharing, version control. */

export interface CollaboratorCursor {
  userId: string;
  name: string;
  color: string;
  position: { x: number; y: number; z: number };
  activeTool: string;
  timestamp: number;
}

export interface VersionEntry {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  entityCount: number;
  featureCount: number;
}

export interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  headVersionId: string;
  createdAt: number;
}

/** Generate a unique color for a collaborator based on their ID. */
export function getCollaboratorColor(userId: string): string {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

/** Create a version snapshot of the current state. */
export function createVersion(
  message: string,
  author: string,
  entityCount: number,
  featureCount: number
): VersionEntry {
  return {
    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    author,
    timestamp: Date.now(),
    entityCount,
    featureCount,
  };
}
