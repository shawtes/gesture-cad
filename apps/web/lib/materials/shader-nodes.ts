/**
 * Shader Node Types
 *
 * Concrete node definitions for the shader graph system.
 * Each node factory returns a ShaderNode with a `toGLSL` method
 * that emits the appropriate GLSL snippet.
 */

import type { ShaderNode, NodeInput, NodeOutput } from "./shader-graph";

// ─── Node Factories ───────────────────────────────────────

let _nodeCounter = 0;
function uid(prefix: string): string {
  return `${prefix}_${_nodeCounter++}`;
}

/**
 * Math operations: add, multiply, subtract, divide, power, sin, cos,
 * abs, fract, clamp, min, max, sqrt, floor, ceil.
 */
export function createMathNode(
  operation:
    | "add"
    | "subtract"
    | "multiply"
    | "divide"
    | "power"
    | "sin"
    | "cos"
    | "abs"
    | "fract"
    | "clamp"
    | "min"
    | "max"
    | "sqrt"
    | "floor"
    | "ceil",
  position: [number, number] = [0, 0]
): ShaderNode {
  const isUnary = ["sin", "cos", "abs", "fract", "sqrt", "floor", "ceil"].includes(
    operation
  );
  const isTernary = operation === "clamp";

  const inputs = new Map<string, NodeInput>();
  inputs.set("a", { name: "A", type: "float", value: 0 });
  if (!isUnary) {
    inputs.set("b", { name: "B", type: "float", value: 1 });
  }
  if (isTernary) {
    inputs.set("min", { name: "Min", type: "float", value: 0 });
    inputs.set("max", { name: "Max", type: "float", value: 1 });
  }

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Result", type: "float" });

  return {
    id: uid("math"),
    type: "math",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const a = vars["a"] ?? "0.0";
      const b = vars["b"] ?? "1.0";
      switch (operation) {
        case "add":
          return `(${a} + ${b})`;
        case "subtract":
          return `(${a} - ${b})`;
        case "multiply":
          return `(${a} * ${b})`;
        case "divide":
          return `(${b} != 0.0 ? ${a} / ${b} : 0.0)`;
        case "power":
          return `pow(${a}, ${b})`;
        case "sin":
          return `sin(${a})`;
        case "cos":
          return `cos(${a})`;
        case "abs":
          return `abs(${a})`;
        case "fract":
          return `fract(${a})`;
        case "sqrt":
          return `sqrt(max(0.0, ${a}))`;
        case "floor":
          return `floor(${a})`;
        case "ceil":
          return `ceil(${a})`;
        case "min":
          return `min(${a}, ${b})`;
        case "max":
          return `max(${a}, ${b})`;
        case "clamp":
          return `clamp(${a}, ${vars["min"] ?? "0.0"}, ${vars["max"] ?? "1.0"})`;
      }
    },
  };
}

/**
 * Mix/blend two vec3 inputs by a float factor.
 */
export function createMixNode(
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("a", { name: "A", type: "vec3", value: [0, 0, 0] });
  inputs.set("b", { name: "B", type: "vec3", value: [1, 1, 1] });
  inputs.set("factor", { name: "Factor", type: "float", value: 0.5 });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Result", type: "vec3" });

  return {
    id: uid("mix"),
    type: "mix",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      return `mix(${vars["a"] ?? "vec3(0.0)"}, ${vars["b"] ?? "vec3(1.0)"}, ${vars["factor"] ?? "0.5"})`;
    },
  };
}

/**
 * Procedural noise node. Emits inline GLSL noise functions.
 * Types: perlin, voronoi, simplex.
 */
export function createNoiseNode(
  noiseType: "perlin" | "voronoi" | "simplex" = "perlin",
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("coord", { name: "Coord", type: "vec2", value: [0, 0] });
  inputs.set("scale", { name: "Scale", type: "float", value: 5 });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Value", type: "float" });

  return {
    id: uid("noise"),
    type: "noise",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const coord = vars["coord"] ?? "vUv";
      const scale = vars["scale"] ?? "5.0";
      const sc = `(${coord} * ${scale})`;

      switch (noiseType) {
        case "perlin":
          // Simple value noise approximation
          return `fract(sin(dot(${sc}, vec2(12.9898, 78.233))) * 43758.5453)`;
        case "voronoi":
          // Voronoi distance approximation
          return `(length(fract(${sc}) - vec2(0.5)) * 2.0)`;
        case "simplex":
          // Simplex-like noise via sin mixing
          return `(fract(sin(dot(${sc}, vec2(127.1, 311.7))) * 43758.5453) * 0.5 + fract(sin(dot(${sc}, vec2(269.5, 183.3))) * 43758.5453) * 0.5)`;
      }
    },
  };
}

/**
 * Fresnel effect: dot(viewDir, normal) based.
 */
export function createFresnelNode(
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("power", { name: "Power", type: "float", value: 2 });
  inputs.set("bias", { name: "Bias", type: "float", value: 0 });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Fresnel", type: "float" });

  return {
    id: uid("fresnel"),
    type: "fresnel",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const power = vars["power"] ?? "2.0";
      const bias = vars["bias"] ?? "0.0";
      return `(${bias} + (1.0 - ${bias}) * pow(1.0 - max(0.0, dot(viewDir, normal)), ${power}))`;
    },
  };
}

/**
 * Normal map application in tangent space.
 */
export function createNormalMapNode(
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("texture", { name: "Normal Map", type: "sampler2D" });
  inputs.set("strength", { name: "Strength", type: "float", value: 1 });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Normal", type: "vec3" });

  return {
    id: uid("normalmap"),
    type: "normalMap",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const tex = vars["texture"] ?? "vec3(0.5, 0.5, 1.0)";
      const strength = vars["strength"] ?? "1.0";
      // Decode tangent-space normal and blend with geometric normal
      return `normalize(mix(normal, (${tex} * 2.0 - 1.0), ${strength}))`;
    },
  };
}

/**
 * Color ramp / gradient lookup: maps a float value to a color
 * using a linear interpolation between two colors.
 */
export function createColorRampNode(
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("factor", { name: "Factor", type: "float", value: 0.5 });
  inputs.set("colorA", { name: "Color A", type: "vec3", value: [0, 0, 0] });
  inputs.set("colorB", { name: "Color B", type: "vec3", value: [1, 1, 1] });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("result", { name: "Color", type: "vec3" });

  return {
    id: uid("colorramp"),
    type: "colorRamp",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const factor = vars["factor"] ?? "0.5";
      const a = vars["colorA"] ?? "vec3(0.0)";
      const b = vars["colorB"] ?? "vec3(1.0)";
      return `mix(${a}, ${b}, clamp(${factor}, 0.0, 1.0))`;
    },
  };
}

/**
 * Texture sampler node: looks up a sampler2D at given UV coordinates.
 */
export function createTextureNode(
  uniformName = "u_texture_diffuse",
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("uv", { name: "UV", type: "vec2", value: [0, 0] });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("color", { name: "Color", type: "vec3" });
  outputs.set("alpha", { name: "Alpha", type: "float" });

  return {
    id: uid("texture"),
    type: "texture",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const uvVar = vars["uv"] ?? "vUv";
      return `texture2D(${uniformName}, ${uvVar}).rgb`;
    },
  };
}

/**
 * Output node: final material outputs (color, roughness, metalness, normal).
 * This is the terminal node in any shader graph.
 */
export function createOutputNode(
  position: [number, number] = [0, 0]
): ShaderNode {
  const inputs = new Map<string, NodeInput>();
  inputs.set("color", { name: "Color", type: "vec3", value: [0.8, 0.8, 0.8] });
  inputs.set("roughness", { name: "Roughness", type: "float", value: 0.5 });
  inputs.set("metalness", { name: "Metalness", type: "float", value: 0 });
  inputs.set("normal", { name: "Normal", type: "vec3", value: [0, 0, 1] });
  inputs.set("emission", { name: "Emission", type: "vec3", value: [0, 0, 0] });

  const outputs = new Map<string, NodeOutput>();
  outputs.set("color", { name: "Final Color", type: "vec3" });

  return {
    id: uid("output"),
    type: "output",
    inputs,
    outputs,
    position,
    toGLSL(vars: Record<string, string>): string {
      const color = vars["color"] ?? "vec3(0.8)";
      const emission = vars["emission"] ?? "vec3(0.0)";
      // Simple PBR-ish output: color + emission
      return `(${color} + ${emission})`;
    },
  };
}
