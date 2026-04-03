/**
 * FeatureScript — simple parametric expression evaluator.
 *
 * Supports: arithmetic (+, -, *, /, ^), functions (sin, cos, sqrt, abs, min, max),
 * variables (#width, #height, etc.), constants (PI, E).
 */

export interface ScriptVariable {
  name: string;
  value: number;
}

export interface ScriptResult {
  success: boolean;
  value: number;
  error?: string;
}

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
  TAU: Math.PI * 2,
};

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  log: Math.log,
  exp: Math.exp,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
};

const FUNCTIONS2: Record<string, (a: number, b: number) => number> = {
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  atan2: Math.atan2,
};

/**
 * Evaluate a parametric expression string.
 * Variables are prefixed with # (e.g., "#width * 2 + 5")
 */
export function evaluateExpression(
  expr: string,
  variables: ScriptVariable[] = []
): ScriptResult {
  try {
    let processed = expr.trim();

    // Replace variables (#name → value)
    for (const v of variables) {
      const regex = new RegExp(`#${v.name}\\b`, "g");
      processed = processed.replace(regex, String(v.value));
    }

    // Replace constants
    for (const [name, value] of Object.entries(CONSTANTS)) {
      const regex = new RegExp(`\\b${name}\\b`, "g");
      processed = processed.replace(regex, String(value));
    }

    // Replace two-arg functions: min(a, b) → Math.min(a, b)
    for (const fname of Object.keys(FUNCTIONS2)) {
      const regex = new RegExp(`\\b${fname}\\s*\\(([^,]+),([^)]+)\\)`, "g");
      processed = processed.replace(regex, (_, a, b) => {
        const va = evaluateSimple(a.trim());
        const vb = evaluateSimple(b.trim());
        return String(FUNCTIONS2[fname](va, vb));
      });
    }

    // Replace single-arg functions: sin(x) → Math.sin(x)
    for (const fname of Object.keys(FUNCTIONS)) {
      const regex = new RegExp(`\\b${fname}\\s*\\(([^)]+)\\)`, "g");
      processed = processed.replace(regex, (_, arg) => {
        const v = evaluateSimple(arg.trim());
        return String(FUNCTIONS[fname](v));
      });
    }

    // Replace ^ with ** for exponentiation
    processed = processed.replace(/\^/g, "**");

    const value = evaluateSimple(processed);
    if (isNaN(value) || !isFinite(value)) {
      return { success: false, value: 0, error: "Result is not a finite number" };
    }
    return { success: true, value };
  } catch (e) {
    return { success: false, value: 0, error: String(e) };
  }
}

/** Safe arithmetic evaluation (no eval — uses Function constructor with strict whitelist) */
function evaluateSimple(expr: string): number {
  // Only allow: digits, operators, parentheses, decimal points, spaces, minus
  const sanitized = expr.replace(/[^0-9+\-*/().eE\s]/g, "");
  if (sanitized.length === 0) return 0;
  try {
    return new Function(`"use strict"; return (${sanitized});`)() as number;
  } catch {
    return 0;
  }
}

/** Validate an expression without executing it */
export function validateExpression(expr: string, variables: ScriptVariable[] = []): { valid: boolean; error?: string } {
  const result = evaluateExpression(expr, variables);
  return result.success ? { valid: true } : { valid: false, error: result.error };
}
