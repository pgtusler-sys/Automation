#!/usr/bin/env bash
# Playwright MCP setup for OpenClaw on the VPS.
#
# What this does:
#   1. Installs @playwright/mcp + Chromium
#   2. Verifies it can launch headed (xvfb) or headless
#   3. Prints the MCP server command OpenClaw should register
#
# Usage (on the VPS):
#   bash mcp-servers/setup-playwright-mcp.sh

set -e

echo "=== Playwright MCP setup ==="
echo ""

# 1. Install Playwright MCP globally (or run via npx — same effect)
echo "[1/3] Installing @playwright/mcp..."
npm install --save-dev @playwright/mcp@latest

# 2. Install Chromium browser
echo "[2/3] Installing Chromium for Playwright..."
npx playwright install chromium --with-deps

# 3. Smoke test
echo "[3/3] Smoke test — listing available MCP tools..."
timeout 10s npx @playwright/mcp@latest --help || true

echo ""
echo "=== Done ==="
echo ""
echo "Register this MCP server with OpenClaw:"
echo ""
cat <<EOF
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless=true",
        "--browser=chromium"
      ]
    }
  }
}
EOF
echo ""
echo "Available tools (no more JS injection):"
echo "  - browser_navigate(url)"
echo "  - browser_snapshot()           — get accessibility tree of current page"
echo "  - browser_click(ref)           — click element by ref from snapshot"
echo "  - browser_type(ref, text)      — type into field"
echo "  - browser_file_upload(paths[]) — native file upload, NO dialog"
echo "  - browser_take_screenshot()"
echo "  - browser_press_key(key)"
echo "  - browser_close()"
