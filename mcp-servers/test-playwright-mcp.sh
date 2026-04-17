#!/usr/bin/env bash
# Standalone Playwright MCP smoke test — bypasses OpenClaw entirely.
#
# Starts the Playwright MCP server, sends a JSON-RPC "tools/list" request,
# and checks whether browser_navigate, browser_file_upload, etc. appear.
#
# Usage (on VPS):
#   bash mcp-servers/test-playwright-mcp.sh

set -e

echo "=== Playwright MCP standalone smoke test ==="
echo ""

# 1. List available tools via JSON-RPC over stdio
echo "[1/2] Querying MCP tool list..."

INIT_REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.1"}}}'
LIST_REQ='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

TOOLS_OUTPUT=$(echo -e "${INIT_REQ}\n${LIST_REQ}" | timeout 15s npx @playwright/mcp@latest --headless=true --browser=chromium 2>/dev/null || true)

if echo "$TOOLS_OUTPUT" | grep -q "browser_navigate"; then
    echo "  ✓ browser_navigate found"
else
    echo "  ✗ browser_navigate NOT found"
fi

if echo "$TOOLS_OUTPUT" | grep -q "browser_file_upload"; then
    echo "  ✓ browser_file_upload found"
else
    echo "  ✗ browser_file_upload NOT found"
fi

if echo "$TOOLS_OUTPUT" | grep -q "browser_snapshot"; then
    echo "  ✓ browser_snapshot found"
else
    echo "  ✗ browser_snapshot NOT found"
fi

if echo "$TOOLS_OUTPUT" | grep -q "browser_take_screenshot"; then
    echo "  ✓ browser_take_screenshot found"
else
    echo "  ✗ browser_take_screenshot NOT found"
fi

echo ""

# 2. Show where OpenClaw should be loading the config from
echo "[2/2] Config file locations to check:"
echo ""
echo "  This repo:        $(pwd)/mcp-servers/playwright-mcp.config.json"
echo "  OpenClaw default:  ~/.openclaw/mcp.json  (if this is where OpenClaw reads configs)"
echo "  OpenClaw alt:      ~/.config/openclaw/mcp-servers.json"
echo ""
echo "If OpenClaw isn't loading the tools, try copying the config:"
echo ""
echo "  # Option A: symlink into OpenClaw's config dir"
echo "  ln -sf $(pwd)/mcp-servers/playwright-mcp.config.json ~/.openclaw/mcp.json"
echo ""
echo "  # Option B: merge into OpenClaw's existing MCP config"
echo "  cat mcp-servers/playwright-mcp.config.json"
echo ""
echo "Then restart OpenClaw and check its tool list."
echo ""
echo "=== Done ==="
