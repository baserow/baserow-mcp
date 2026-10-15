#!/usr/bin/env bash
# Builds the ZIP uploaded to the OpenAI Platform (Plugins → Upload): the Agent
# Plugins manifest, the MCP config, the skill and the logo. Nothing Claude-, Cursor-
# or Gemini-specific, and no tooling.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p 'require("./plugin.json").version')
out="dist/baserow-openai-$version.zip"
mkdir -p dist
rm -f "$out"
zip -qrX "$out" plugin.json mcp.json skills assets LICENSE -x '*.DS_Store'
echo "$out"
