import { execa, type ExecaError } from "execa";
import { CLIResponseSchema, type CLIResponse } from "./types";
import { homedir } from "os";

/**
 * Path to k CLI binary
 */
const K_PATH = process.env.K_PATH || `${homedir()}/bin/k`;

/**
 * Default timeout for CLI commands (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Execute a k CLI command and parse JSON response
 */
export async function runCLI<T>(
  command: string,
  args: string[] = [],
  options: { timeout?: number } = {}
): Promise<CLIResponse<T>> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  try {
    const { stdout, stderr, exitCode } = await execa(K_PATH, [command, ...args, "--json"], {
      timeout,
      reject: false, // Don't throw on non-zero exit
      env: {
        ...process.env,
        // Ensure PATH includes common locations
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });

    // Try to parse stdout as JSON first
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        const validated = CLIResponseSchema.parse(parsed);
        return validated as CLIResponse<T>;
      } catch {
        // stdout wasn't valid JSON
      }
    }

    // If we have stderr or non-zero exit, return error
    if (exitCode !== 0) {
      return {
        success: false,
        error: stderr || stdout || `Command exited with code ${exitCode}`,
      };
    }

    return {
      success: false,
      error: "No valid response from CLI",
    };
  } catch (error) {
    const execaError = error as ExecaError;

    // Check for timeout
    if (execaError.timedOut) {
      return {
        success: false,
        error: `Command timed out after ${timeout}ms`,
      };
    }

    // Check for command not found
    if (execaError.code === "ENOENT") {
      return {
        success: false,
        error: `k CLI not found at ${K_PATH}. Make sure kai-launcher is installed.`,
      };
    }

    return {
      success: false,
      error: execaError.message || "Unknown error occurred",
    };
  }
}

/**
 * Check if k CLI is available
 */
export async function checkCLI(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const { stdout, exitCode } = await execa(K_PATH, ["--version"], {
      timeout: 5000,
      reject: false,
      env: {
        ...process.env,
        PATH: `${homedir()}/bin:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
      },
    });
    if (exitCode === 0) {
      return {
        available: true,
        version: stdout.trim(),
      };
    }
    return {
      available: false,
      error: "k CLI returned non-zero exit code",
    };
  } catch (error) {
    return {
      available: false,
      error:
        error instanceof Error
          ? error.message
          : "k CLI not found",
    };
  }
}

/**
 * Export context to clipboard
 */
export async function exportContext(
  profile: "minimal" | "standard" | "full" = "minimal"
): Promise<CLIResponse<{ content: string; tokenCount: number }>> {
  return runCLI("context", ["export", "--profile", profile]);
}

/**
 * Create Tana node
 */
export async function captureTana(
  text: string,
  supertag: "todo" | "note" | "idea" = "todo"
): Promise<CLIResponse<{ message: string; paste: string }>> {
  return runCLI("tana", ["create", text, "--supertag", supertag]);
}

/**
 * Get daily briefing
 */
export async function getBriefing(): Promise<CLIResponse<unknown>> {
  return runCLI("briefing", []);
}

/**
 * List available commands
 */
export async function listCommands(): Promise<
  CLIResponse<{ commands: unknown[]; total: number }>
> {
  return runCLI("commands", ["list"]);
}

/**
 * Execute a prompt
 */
export async function executePrompt(
  query: string
): Promise<CLIResponse<{ response: string; query: string }>> {
  return runCLI("prompt", [query], { timeout: 60000 }); // 60s for prompts
}
