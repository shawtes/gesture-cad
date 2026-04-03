/**
 * RAG Retriever — finds relevant knowledge chunks for Claude's context.
 *
 * Uses TF-IDF-style keyword matching (no embeddings API needed).
 * Searches across: PDF books, Onshape curriculum, research docs, CAD tutorials.
 *
 * Improvements over v1:
 * - Tokenizer preserves CAD-relevant short terms (xz, xy, yz, 2d, 3d)
 * - Balanced phrase-match bonus (scaled by IDF, not a flat +10)
 * - LRU cache for repeated queries
 * - Memoized stats computation
 * - Category-filtered retrieval support
 */

import knowledgeBase from "./knowledge-base.json";

interface KnowledgeChunk {
  source: string;
  page: number;
  text: string;
  category?: string;
}

const chunks: KnowledgeChunk[] = knowledgeBase as KnowledgeChunk[];

// CAD-specific terms that should not be filtered by length
const CAD_SHORT_TERMS = new Set([
  "xz", "xy", "yz", "2d", "3d", "mm", "cm", "in", "ft",
  "cw", "ccw", "id", "od", "r3f", "ui", "stl", "obj", "glb",
  "brep", "csg", "dxf", "dwg", "igs", "stp",
]);

// Pre-compute word frequency index for fast search
const wordIndex: Map<string, Set<number>> = new Map();

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 || CAD_SHORT_TERMS.has(w));
}

// Infer category from source name for existing chunks without metadata
const SOURCE_CATEGORY_MAP: Record<string, string> = {
  "drawing-fundamentals": "sketch",
  "blender-3d-modeling": "modeling",
  "onshape-curriculum": "modeling",
  "EngineeringDrawings-AS1100": "drawing",
  "ShapeNet": "dataset",
  "ModelNet": "dataset",
  "Thingiverse": "dataset",
  "ABC-Dataset": "dataset",
  "SketchGraphs": "sketch",
  "Fusion360-Gallery": "modeling",
  "CAD-Workflow": "modeling",
  "FloorPlanCAD": "architecture",
  "FloorPlanCAD-patterns": "architecture",
  "Furniture-Standards": "architecture",
  "Architecture-Detailed": "architecture",
  "Mechanical-Parts": "modeling",
  "Character-Design": "modeling",
  "Design-Literature": "general",
  "SAM-Sketches-manual": "sketch",
  "ArchCAD-manual": "architecture",
};

function inferCategory(source: string): string {
  for (const [key, cat] of Object.entries(SOURCE_CATEGORY_MAP)) {
    if (source.includes(key)) return cat;
  }
  if (source.includes("research/")) return "research";
  return "general";
}

// Build index on load + assign categories
for (let i = 0; i < chunks.length; i++) {
  if (!chunks[i].category) {
    chunks[i].category = inferCategory(chunks[i].source);
  }
  const words = tokenize(chunks[i].text);
  for (const word of words) {
    if (!wordIndex.has(word)) wordIndex.set(word, new Set());
    wordIndex.get(word)!.add(i);
  }
}

// LRU cache for retrieve() — avoids recomputing scores for repeated queries
const CACHE_MAX = 64;
const queryCache: Map<string, ReturnType<typeof retrieve>> = new Map();

function cacheKey(query: string, topK: number, category?: string): string {
  return `${query}|${topK}|${category || ""}`;
}

/**
 * Retrieve the most relevant chunks for a query.
 * Returns up to `topK` chunks sorted by relevance score.
 * Optionally filter by category (sketch, modeling, drawing, architecture, etc.)
 */
export function retrieve(query: string, topK: number = 5, category?: string): {
  chunks: { source: string; page: number; text: string; score: number; category: string }[];
  totalSearched: number;
} {
  const key = cacheKey(query, topK, category);
  const cached = queryCache.get(key);
  if (cached) return cached;

  const queryTokens = tokenize(query);
  const scores: Map<number, number> = new Map();

  for (const token of queryTokens) {
    const matchingChunks = wordIndex.get(token);
    if (!matchingChunks) continue;

    // Pre-compute IDF for this token
    const idf = Math.log(chunks.length / (matchingChunks.size + 1));

    for (const idx of matchingChunks) {
      // Skip chunks not in requested category
      if (category && chunks[idx].category !== category) continue;

      const current = scores.get(idx) || 0;
      scores.set(idx, current + idf);
    }
  }

  // Boost exact phrase matches — scaled proportionally to max IDF, not a flat value
  if (query.length > 3) {
    const queryLower = query.toLowerCase();
    const maxIdf = Math.log(chunks.length);
    const phraseBonus = maxIdf * 1.5; // ~1.5x the max single-term IDF
    for (let i = 0; i < chunks.length; i++) {
      if (category && chunks[i].category !== category) continue;
      if (chunks[i].text.toLowerCase().includes(queryLower)) {
        scores.set(i, (scores.get(i) || 0) + phraseBonus);
      }
    }
  }

  // Sort by score descending
  const sorted = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  const result = {
    chunks: sorted.map(([idx, score]) => ({
      source: chunks[idx].source,
      page: chunks[idx].page,
      text: chunks[idx].text,
      score,
      category: chunks[idx].category || "general",
    })),
    totalSearched: category
      ? chunks.filter((c) => c.category === category).length
      : chunks.length,
  };

  // LRU eviction
  if (queryCache.size >= CACHE_MAX) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) queryCache.delete(oldest);
  }
  queryCache.set(key, result);

  return result;
}

/**
 * Format retrieved chunks as context string for Claude.
 */
export function formatContext(query: string, topK: number = 5, category?: string): string {
  const results = retrieve(query, topK, category);

  if (results.chunks.length === 0) {
    return "";
  }

  let ctx = "\n\nRELEVANT KNOWLEDGE (from books & research):";
  for (const chunk of results.chunks) {
    ctx += `\n\n[${chunk.source} p${chunk.page}] (${chunk.category}, relevance: ${chunk.score.toFixed(1)}):\n${chunk.text}`;
  }

  return ctx;
}

// Memoized stats — computed once since knowledge base is static
let cachedStats: ReturnType<typeof getStats> | null = null;

/**
 * Get stats about the knowledge base.
 */
export function getStats(): {
  totalChunks: number;
  sources: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  totalWords: number;
} {
  if (cachedStats) return cachedStats;

  const sourceCounts: Map<string, number> = new Map();
  const categoryCounts: Map<string, number> = new Map();
  let totalWords = 0;

  for (const chunk of chunks) {
    sourceCounts.set(chunk.source, (sourceCounts.get(chunk.source) || 0) + 1);
    const cat = chunk.category || "general";
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    totalWords += chunk.text.split(/\s+/).length;
  }

  cachedStats = {
    totalChunks: chunks.length,
    sources: Array.from(sourceCounts.entries()).map(([name, count]) => ({ name, count })),
    categories: Array.from(categoryCounts.entries()).map(([name, count]) => ({ name, count })),
    totalWords,
  };
  return cachedStats;
}
