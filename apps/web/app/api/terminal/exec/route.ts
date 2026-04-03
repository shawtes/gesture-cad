/**
 * Terminal Execution API Route
 *
 * Runs shell commands from the integrated terminal.
 * This enables: !ls, !git status, !claude "prompt", etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const MAX_COMMAND_LENGTH = 2000;

// Read-only and build commands only — no file-modifying commands
const ALLOWED_PREFIXES = [
  "ls", "pwd", "echo", "cat", "head", "tail", "wc",
  "git", "npm", "npx", "pnpm", "node",
  "claude",  // Claude Code CLI
  "python", "python3",
  "which", "whoami", "date",
  "find", "grep",
];

// Dangerous patterns that should never appear in commands
const BLOCKED_PATTERNS = [
  /rm\s+(-rf?|--recursive)/i,
  />\s*\//,            // redirect to absolute path
  /;\s*(rm|dd|mkfs)/,  // chained destructive commands
  /\|\s*(rm|dd)/,      // piped destructive commands
  /`/,                 // backtick command substitution
  /\$\(/,             // $() command substitution
];

function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  if (trimmed.length > MAX_COMMAND_LENGTH) return false;

  const firstWord = trimmed.split(/\s+/)[0];

  // Check first word against allowlist
  let allowed = false;
  for (const prefix of ALLOWED_PREFIXES) {
    if (firstWord === prefix || firstWord.endsWith(`/${prefix}`)) {
      allowed = true;
      break;
    }
  }
  if (!allowed) return false;

  // Block dangerous patterns even in allowed commands
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "No command provided" }, { status: 400 });
    }

    if (!isCommandAllowed(command)) {
      return NextResponse.json({
        stdout: "",
        stderr: `Command not allowed: "${command.split(/\s+/)[0]}". Allowed: ${ALLOWED_PREFIXES.join(", ")}`,
      }, { status: 200 });
    }

    // Set working directory to project root
    const cwd = process.cwd();

    // Claude commands need longer timeout
    const isClaude = command.trim().startsWith("claude");
    const timeout = isClaude ? 120000 : 30000;

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 5, // 5MB max output for claude responses
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
      },
    });

    return NextResponse.json({ stdout: stdout.trim(), stderr: stderr.trim() });
  } catch (err: any) {
    return NextResponse.json({
      stdout: "",
      stderr: err.stderr?.trim() || err.message || "Command failed",
      exitCode: err.code || 1,
    });
  }
}
