# Reproduces this machine's Claude Code CLI setup (marketplaces, plugins,
# local MCP servers, skills, CLI settings) on a new Windows PC.
# Run in PowerShell AFTER cloning/copying this repo to the new machine.
#
# NOT covered here (per-account, not per-machine — already available once
# you sign in with the same Anthropic account on the new PC):
#   claude.ai Connectors (Notion, Google Calendar/Gmail, Vercel, Supabase
#   dashboard, Google Drive, Slack, etc.) — reconnect any that need
#   per-machine OAuth re-approval via `claude mcp login <name>` if prompted.
#
# NOT covered here (secrets — never captured/scripted):
#   .credentials.json, any API keys/tokens.

$ErrorActionPreference = "Stop"

# 1. Claude Code CLI itself
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    npm install -g @anthropic-ai/claude-code
}

# 2. Plugin marketplaces (source repos plugins are installed from)
$marketplaces = @(
    "anthropics/claude-plugins-official",
    "https://github.com/Yeachan-Heo/oh-my-claudecode.git",
    "forrestchang/andrej-karpathy-skills",
    "DietrichGebert/ponytail",
    "warpdotdev/claude-code-warp",
    "https://github.com/paper-design/agent-plugins.git"
)
foreach ($m in $marketplaces) {
    claude plugin marketplace add $m
}

# 3. Plugins (name@marketplace)
$plugins = @(
    "frontend-design@claude-plugins-official",
    "code-review@claude-plugins-official",
    "typescript-lsp@claude-plugins-official",
    "chrome-devtools-mcp@claude-plugins-official",
    "superpowers@claude-plugins-official",
    "github@claude-plugins-official",
    "oh-my-claudecode@omc",
    "andrej-karpathy-skills@karpathy-skills",
    "ponytail@ponytail",
    "warp@claude-code-warp",
    "paper-desktop@paper"
)
foreach ($p in $plugins) {
    claude plugin install $p
}

# 4. Local (non-plugin, non-connector) MCP server: Pencil desktop app.
# Requires the Pencil app installed on this PC first — its MCP exe ships
# inside the app install, this only registers it with Claude Code.
$pencilExe = "C:\Program Files\Pencil\resources\app.asar.unpacked\out\mcp-server-windows-x64.exe"
if (Test-Path $pencilExe) {
    claude mcp add pencil -- "$pencilExe" --app desktop --agent claudeCodeCLI
} else {
    Write-Warning "Pencil not found at $pencilExe — install Pencil desktop first, then re-run: claude mcp add pencil -- `"$pencilExe`" --app desktop --agent claudeCodeCLI"
}

# 5. Statusline package used by ~/.claude/settings.json ("ccstatusline")
npm install -g ccstatusline

Write-Host "`nDone. Remaining manual steps:"
Write-Host "1. Copy user-level custom skills (not tied to a plugin) from this"
Write-Host "   machine's ~/.claude/skills/ to the new PC's ~/.claude/skills/:"
Write-Host "   caveman, find-skills, improve-codebase-architecture,"
Write-Host "   marketing-strategy-pmm, micro-saas-launcher,"
Write-Host "   vercel-react-best-practices, web-design-guidelines."
Write-Host "2. Sign in to Claude Code on the new PC with the same Anthropic"
Write-Host "   account so claude.ai Connectors (Notion, Google, Vercel, etc.)"
Write-Host "   carry over automatically."
Write-Host "3. Project-scoped MCP (Supabase, via .mcp.json) needs no action —"
Write-Host "   it travels with the repo; approve it on first use in this project."
Write-Host "4. ~/.claude/settings.json also sets effortLevel=low and theme=dark"
Write-Host "   — set these via 'claude config' or the /config UI if you want them too."
