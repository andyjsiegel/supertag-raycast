/**
 * Open Terminal.app with a command
 */
export async function openInTerminal(command: string): Promise<void> {
  // Use AppleScript to open Terminal and run command
  const script = `
    tell application "Terminal"
      activate
      do script "${command.replace(/"/g, '\\"')}"
    end tell
  `;

  // Execute via osascript
  const { execa } = await import("execa");
  await execa("osascript", ["-e", script]);
}
