/** 3D Comment/Annotation System */

export interface ModelComment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  /** 3D world position where the comment is anchored */
  position: [number, number, number];
  /** Optional entity/feature reference */
  entityId?: string;
  featureId?: string;
  resolved: boolean;
}

let commentCounter = 0;

export function createComment(
  text: string,
  position: [number, number, number],
  author: string = "User",
  entityId?: string,
  featureId?: string
): ModelComment {
  return {
    id: `comment_${++commentCounter}_${Date.now()}`,
    text,
    author,
    timestamp: Date.now(),
    position,
    entityId,
    featureId,
    resolved: false,
  };
}

export function resolveComment(comment: ModelComment): ModelComment {
  return { ...comment, resolved: true };
}

export function filterActiveComments(comments: ModelComment[]): ModelComment[] {
  return comments.filter((c) => !c.resolved);
}
