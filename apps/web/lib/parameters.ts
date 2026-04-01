/** Parametric design: named parameters and expression evaluation. */

export interface NamedParameter {
  name: string;
  value: number;
  expression?: string;
}

/**
 * Safe expression parser — evaluates math expressions with named parameter references.
 * Supports: +, -, *, /, parentheses, named references, numbers.
 * NO eval() — fully sandboxed.
 */
export function evaluateExpression(
  expr: string,
  params: Map<string, number>
): number {
  const tokens = tokenize(expr);
  const result = parseExpression(tokens, params);
  return result;
}

type Token =
  | { type: "number"; value: number }
  | { type: "name"; value: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: "(" | ")" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] || ""))) {
      let num = "";
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) {
        num += expr[i++];
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let name = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        name += expr[i++];
      }
      tokens.push({ type: "name", value: name });
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

function parseExpression(
  tokens: Token[],
  params: Map<string, number>
): number {
  let pos = 0;

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < tokens.length && tokens[pos].type === "op" && (tokens[pos].value === "+" || tokens[pos].value === "-")) {
      const op = tokens[pos++].value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePrimary();
    while (pos < tokens.length && tokens[pos].type === "op" && (tokens[pos].value === "*" || tokens[pos].value === "/")) {
      const op = tokens[pos++].value;
      const right = parsePrimary();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parsePrimary(): number {
    const tok = tokens[pos];
    if (!tok) throw new Error("Unexpected end of expression");

    if (tok.type === "number") {
      pos++;
      return tok.value;
    }
    if (tok.type === "name") {
      pos++;
      const val = params.get(tok.value);
      if (val === undefined) throw new Error(`Unknown parameter: ${tok.value}`);
      return val;
    }
    if (tok.type === "paren" && tok.value === "(") {
      pos++;
      const val = parseAddSub();
      if (tokens[pos]?.type !== "paren" || tokens[pos]?.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      pos++;
      return val;
    }
    if (tok.type === "op" && tok.value === "-") {
      pos++;
      return -parsePrimary();
    }
    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }

  return parseAddSub();
}

/** Default parameter set for a new project. */
export function createDefaultParameters(): NamedParameter[] {
  return [
    { name: "width", value: 2.0 },
    { name: "height", value: 1.5 },
    { name: "depth", value: 1.0 },
    { name: "radius", value: 0.5 },
  ];
}
