/**
 * Shader Graph — Node-based GLSL Compiler
 *
 * Manages a directed acyclic graph of shader nodes and compiles
 * them into vertex + fragment GLSL shader strings via topological sort.
 */

// ─── Types ─────────────────────────────────────────────────

export type ShaderValueType = "float" | "vec2" | "vec3" | "vec4" | "sampler2D";

export interface NodeInput {
  name: string;
  type: ShaderValueType;
  value?: number | number[];
  /** Connection: "nodeId.outputName" */
  connected?: string;
}

export interface NodeOutput {
  name: string;
  type: ShaderValueType;
}

export interface ShaderNode {
  id: string;
  type: string;
  inputs: Map<string, NodeInput>;
  outputs: Map<string, NodeOutput>;
  position: [number, number];
  /** Each node type provides its own GLSL snippet generator */
  toGLSL?: (inputVarNames: Record<string, string>) => string;
}

export interface ShaderConnection {
  fromNode: string;
  fromOutput: string;
  toNode: string;
  toInput: string;
}

// ─── Shader Graph ─────────────────────────────────────────

export class ShaderGraph {
  nodes: Map<string, ShaderNode> = new Map();
  connections: ShaderConnection[] = [];

  private nextId = 0;

  /** Generate a unique node ID */
  generateId(): string {
    return `node_${this.nextId++}`;
  }

  addNode(node: ShaderNode): void {
    this.nodes.set(node.id, node);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.connections = this.connections.filter(
      (c) => c.fromNode !== nodeId && c.toNode !== nodeId
    );
  }

  connect(
    fromNode: string,
    fromOutput: string,
    toNode: string,
    toInput: string
  ): void {
    // Remove any existing connection to this input
    this.connections = this.connections.filter(
      (c) => !(c.toNode === toNode && c.toInput === toInput)
    );

    this.connections.push({ fromNode, fromOutput, toNode, toInput });

    // Mark input as connected
    const node = this.nodes.get(toNode);
    if (node) {
      const input = node.inputs.get(toInput);
      if (input) {
        input.connected = `${fromNode}.${fromOutput}`;
      }
    }
  }

  disconnect(toNode: string, toInput: string): void {
    this.connections = this.connections.filter(
      (c) => !(c.toNode === toNode && c.toInput === toInput)
    );

    const node = this.nodes.get(toNode);
    if (node) {
      const input = node.inputs.get(toInput);
      if (input) {
        input.connected = undefined;
      }
    }
  }

  /** Get all connections feeding into a node */
  getInputConnections(nodeId: string): ShaderConnection[] {
    return this.connections.filter((c) => c.toNode === nodeId);
  }

  /** Get all connections leaving a node */
  getOutputConnections(nodeId: string): ShaderConnection[] {
    return this.connections.filter((c) => c.fromNode === nodeId);
  }

  /** Deep clone the graph */
  clone(): ShaderGraph {
    const g = new ShaderGraph();
    g.nextId = this.nextId;

    for (const [id, node] of this.nodes) {
      g.nodes.set(id, {
        ...node,
        inputs: new Map(
          Array.from(node.inputs).map(([k, v]) => [k, { ...v }])
        ),
        outputs: new Map(
          Array.from(node.outputs).map(([k, v]) => [k, { ...v }])
        ),
        position: [...node.position],
      });
    }

    g.connections = this.connections.map((c) => ({ ...c }));
    return g;
  }
}

// ─── Compiler ─────────────────────────────────────────────

/**
 * Compile a ShaderGraph into GLSL vertex and fragment shader strings.
 * Performs topological sort to determine evaluation order, then emits
 * GLSL variable declarations and operations per node.
 */
export function compileGraph(graph: ShaderGraph): {
  vertexShader: string;
  fragmentShader: string;
} {
  const sorted = topologicalSort(graph);

  // Map from "nodeId.outputName" -> GLSL variable name
  const varMap = new Map<string, string>();
  const glslLines: string[] = [];
  let varIdx = 0;

  // Track which sampler2D uniforms are needed
  const samplerUniforms: string[] = [];

  for (const nodeId of sorted) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;

    // Resolve input variable names
    const inputVarNames: Record<string, string> = {};
    for (const [inputName, input] of node.inputs) {
      if (input.connected) {
        const resolved = varMap.get(input.connected);
        if (resolved) {
          inputVarNames[inputName] = resolved;
          continue;
        }
      }
      // Use default value as literal
      inputVarNames[inputName] = defaultValueGLSL(input);
    }

    // Generate GLSL for this node
    if (node.toGLSL) {
      const snippet = node.toGLSL(inputVarNames);

      // Assign output variables
      for (const [outputName, output] of node.outputs) {
        const varName = `v${varIdx++}_${sanitize(nodeId)}_${outputName}`;
        varMap.set(`${nodeId}.${outputName}`, varName);
        glslLines.push(`${output.type} ${varName} = ${snippet};`);
      }
    }

    // Track texture samplers
    for (const [, input] of node.inputs) {
      if (input.type === "sampler2D" && input.value !== undefined) {
        const name = `u_texture_${sanitize(String(input.value))}`;
        if (!samplerUniforms.includes(name)) {
          samplerUniforms.push(name);
        }
      }
    }
  }

  // Find output node
  const outputNode = Array.from(graph.nodes.values()).find(
    (n) => n.type === "output"
  );

  let finalColor = "vec4(1.0, 0.0, 1.0, 1.0)"; // magenta fallback
  if (outputNode) {
    const colorKey = `${outputNode.id}.color`;
    const resolved = varMap.get(colorKey);
    if (resolved) {
      finalColor = `vec4(${resolved}, 1.0)`;
    }
    // Check if there is a direct vec4 output
    const vec4Key = `${outputNode.id}.result`;
    const vec4Resolved = varMap.get(vec4Key);
    if (vec4Resolved) {
      finalColor = vec4Resolved;
    }
  }

  // Assemble shaders
  const samplerDecls = samplerUniforms
    .map((s) => `uniform sampler2D ${s};`)
    .join("\n");

  const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`.trim();

  const fragmentShader = `
precision highp float;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

${samplerDecls}

void main() {
  vec3 normal = normalize(vNormal);
  vec2 uv = vUv;
  vec3 viewDir = normalize(-vPosition);

  ${glslLines.join("\n  ")}

  gl_FragColor = ${finalColor};
}
`.trim();

  return { vertexShader, fragmentShader };
}

// ─── Topological Sort ─────────────────────────────────────

function topologicalSort(graph: ShaderGraph): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  // Build adjacency: for each node, which nodes must come before it
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const [id] of graph.nodes) {
    inDegree.set(id, 0);
    dependents.set(id, []);
  }

  for (const conn of graph.connections) {
    inDegree.set(conn.toNode, (inDegree.get(conn.toNode) ?? 0) + 1);
    const deps = dependents.get(conn.fromNode);
    if (deps) deps.push(conn.toNode);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    result.push(nodeId);

    const deps = dependents.get(nodeId) ?? [];
    for (const dep of deps) {
      const newDegree = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDegree);
      if (newDegree === 0) queue.push(dep);
    }
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

function defaultValueGLSL(input: NodeInput): string {
  if (input.value === undefined) {
    switch (input.type) {
      case "float":
        return "0.0";
      case "vec2":
        return "vec2(0.0)";
      case "vec3":
        return "vec3(0.0)";
      case "vec4":
        return "vec4(0.0)";
      case "sampler2D":
        return "vec4(0.0)";
    }
  }

  if (typeof input.value === "number") {
    return formatFloat(input.value);
  }

  if (Array.isArray(input.value)) {
    const vals = input.value.map(formatFloat).join(", ");
    switch (input.type) {
      case "vec2":
        return `vec2(${vals})`;
      case "vec3":
        return `vec3(${vals})`;
      case "vec4":
        return `vec4(${vals})`;
      default:
        return vals;
    }
  }

  return "0.0";
}

function formatFloat(n: number): string {
  const s = n.toString();
  return s.includes(".") ? s : `${s}.0`;
}
