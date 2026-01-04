import { execa } from "execa";
import type { BrowserTab } from "./types";

/**
 * Supported browser names
 */
export type BrowserName = "Safari" | "Google Chrome" | "Arc" | "Firefox";

/**
 * AppleScript templates for each browser
 */
const BROWSER_SCRIPTS: Record<BrowserName, { tab: string; selection: string }> = {
  Safari: {
    tab: `
      tell application "Safari"
        set theURL to URL of current tab of front window
        set theTitle to name of current tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Safari"
        set theSelection to do JavaScript "window.getSelection().toString()" in current tab of front window
        return theSelection
      end tell
    `,
  },
  "Google Chrome": {
    tab: `
      tell application "Google Chrome"
        set theURL to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Google Chrome"
        set theSelection to execute active tab of front window javascript "window.getSelection().toString()"
        return theSelection
      end tell
    `,
  },
  Arc: {
    tab: `
      tell application "Arc"
        set theURL to URL of active tab of front window
        set theTitle to title of active tab of front window
        return theURL & "\n" & theTitle
      end tell
    `,
    selection: `
      tell application "Arc"
        set theSelection to execute active tab of front window javascript "window.getSelection().toString()"
        return theSelection
      end tell
    `,
  },
  Firefox: {
    tab: `
      tell application "System Events"
        tell process "Firefox"
          -- Firefox doesn't expose URL via AppleScript easily
          -- We'll try to get it via UI scripting
          keystroke "l" using command down
          delay 0.1
          keystroke "c" using command down
          delay 0.1
          keystroke "w" using command down
        end tell
      end tell
      return (the clipboard)
    `,
    selection: `
      tell application "System Events"
        tell process "Firefox"
          keystroke "c" using command down
        end tell
      end tell
      delay 0.1
      return (the clipboard)
    `,
  },
};

/**
 * Get list of supported browsers
 */
export function getSupportedBrowsers(): BrowserName[] {
  return ["Safari", "Google Chrome", "Arc", "Firefox"];
}

/**
 * Detect which supported browser is currently frontmost
 */
export async function detectFrontmostBrowser(): Promise<BrowserName | null> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        return frontApp
      end tell
    `,
    ]);

    const appName = stdout.trim();

    // Map app names to our browser types
    if (appName === "Safari") return "Safari";
    if (appName === "Google Chrome") return "Google Chrome";
    if (appName === "Arc") return "Arc";
    if (appName === "Firefox") return "Firefox";

    return null;
  } catch {
    return null;
  }
}

/**
 * Get active tab information from the frontmost browser
 */
export async function getActiveTab(browser?: BrowserName): Promise<BrowserTab> {
  const targetBrowser = browser || (await detectFrontmostBrowser());

  if (!targetBrowser) {
    // Try browsers in order of likelihood
    for (const b of getSupportedBrowsers()) {
      try {
        return await getTabFromBrowser(b);
      } catch {
        continue;
      }
    }
    throw new Error("No supported browser found");
  }

  return getTabFromBrowser(targetBrowser);
}

/**
 * Get tab info from a specific browser
 */
async function getTabFromBrowser(browser: BrowserName): Promise<BrowserTab> {
  const script = BROWSER_SCRIPTS[browser].tab;

  try {
    const { stdout } = await execa("osascript", ["-e", script], {
      timeout: 5000,
    });

    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      throw new Error(`Invalid response from ${browser}`);
    }

    const url = lines[0].trim();
    const title = lines.slice(1).join("\n").trim(); // Title might have newlines

    // Validate URL
    new URL(url); // Throws if invalid

    return {
      url,
      title: title || "Untitled",
      browser,
    };
  } catch (error) {
    throw new Error(
      `Failed to get tab from ${browser}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get selected text from the frontmost browser
 */
export async function getSelection(browser?: BrowserName): Promise<string | null> {
  const targetBrowser = browser || (await detectFrontmostBrowser());

  if (!targetBrowser) {
    return null;
  }

  try {
    const script = BROWSER_SCRIPTS[targetBrowser].selection;
    const { stdout } = await execa("osascript", ["-e", script], {
      timeout: 5000,
    });

    const selection = stdout.trim();
    return selection || null;
  } catch {
    return null;
  }
}

/**
 * Check if a browser is running
 */
export async function isBrowserRunning(browser: BrowserName): Promise<boolean> {
  try {
    const { stdout } = await execa("osascript", [
      "-e",
      `
      tell application "System Events"
        return (name of processes) contains "${browser}"
      end tell
    `,
    ]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}
