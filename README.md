# KAI Raycast Extension

Quick access to KAI AI assistant capabilities from Raycast.

## Commands

| Command | Description | Mode |
|---------|-------------|------|
| Export Context | Export personal context to clipboard | No View |
| Capture to Tana | Quick capture with supertag selection | Form |
| Ask KAI | Ask a question, get inline or terminal response | Form + Detail |
| Today's Briefing | Show daily summary (calendar, tasks, email) | Detail |
| KAI Commands | Browse and launch k CLI commands | List |

## Prerequisites

- [Raycast](https://raycast.com/) installed
- `k` CLI (kai-launcher) installed at `~/bin/k`
- KAI infrastructure set up

## Installation

### Development

```bash
cd ~/work/kai-raycast
npm install
npm run dev  # Opens extension in Raycast
```

### Local Installation

```bash
npm run build
# Then import via Raycast > Extensions > + > Import Extension
```

## Architecture

```
kai-raycast
├── src/
│   ├── export-context.tsx   # No-view command
│   ├── capture-tana.tsx     # Form command
│   ├── ask-kai.tsx          # Form + Detail command
│   ├── briefing.tsx         # Detail command
│   ├── commands.tsx         # List command
│   └── lib/
│       ├── cli.ts           # k CLI wrapper (execa)
│       ├── types.ts         # Zod schemas
│       ├── fallbacks.ts     # Error handling utilities
│       └── terminal.ts      # Terminal launcher
```

## How It Works

All commands call the `k` CLI with `--json` flag and parse the response:

```typescript
// Example: Export context
const result = await exportContext("minimal");
if (result.success) {
  await Clipboard.copy(result.data.content);
}
```

## Fallback Behavior

When CLI commands fail:
1. Show error toast
2. Offer "Open in Terminal" action
3. For Tana capture: offer to copy Tana Paste manually

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| K_PATH | ~/bin/k | Path to k CLI binary |

## Dependencies

- `@raycast/api` - Raycast extension SDK
- `execa` - Execute k CLI commands
- `zod` - Validate CLI responses

## Related

- [kai-launcher](../kai-launcher) - The `k` CLI that powers this extension
- [KAI Skills](~/.claude/skills) - Full KAI infrastructure
