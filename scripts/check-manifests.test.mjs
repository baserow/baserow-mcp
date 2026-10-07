import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSync,
  checkSchemas,
  checkSkills,
  loadManifests,
} from "./check-manifests.mjs";

const SCHEMA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "schemas");
const URL = "https://api.baserow.io/mcp";
const AGENT_SCHEMA = "https://agent-plugins.org/schemas/1.0.0";
const REGISTRY_SCHEMA = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

function validManifests() {
  return {
    claudePlugin: {
      name: "baserow",
      version: "0.1.0",
      userConfig: { mcp_url: { type: "string", default: URL, required: true } },
    },
    claudeMarketplace: { name: "baserow", plugins: [{ name: "baserow", source: "./" }] },
    claudeMcp: { mcpServers: { baserow: { type: "http", url: "${user_config.mcp_url}" } } },
    agentPlugin: { $schema: `${AGENT_SCHEMA}/plugin.schema.json`, name: "baserow", version: "0.1.0", description: "d" },
    agentMcp: { $schema: `${AGENT_SCHEMA}/mcp.schema.json`, mcpServers: { baserow: { type: "streamable-http", url: URL } } },
    codexMarketplace: { name: "baserow", plugins: [{ name: "baserow" }] },
    gemini: { name: "baserow", version: "0.1.0", mcpServers: { baserow: { httpUrl: URL } } },
    registry: {
      $schema: REGISTRY_SCHEMA,
      description: "d",
      name: "io.baserow/baserow",
      version: "0.1.0",
      remotes: [{ type: "streamable-http", url: URL }],
    },
  };
}

test("valid manifests have no sync errors", () => {
  assert.deepEqual(checkSync(validManifests()), []);
});

test("a version mismatch names the odd file", () => {
  const m = validManifests();
  m.gemini.version = "0.2.0";
  const errors = checkSync(m);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /version/);
  assert.match(errors[0], /gemini-extension\.json=0\.2\.0/);
});

test("a SaaS URL mismatch is reported", () => {
  const m = validManifests();
  m.agentMcp.mcpServers.baserow.url = "https://api.baserow.io/mcp/";
  assert.match(checkSync(m).join("\n"), /SaaS URL differs/);
});

test("a missing SaaS URL is reported with its file", () => {
  const m = validManifests();
  delete m.claudePlugin.userConfig.mcp_url.default;
  assert.match(checkSync(m).join("\n"), /\.claude-plugin\/plugin\.json: SaaS URL missing/);
});

test("the SaaS URL must be https and end in /mcp", () => {
  const m = validManifests();
  for (const key of ["agentMcp"]) m[key].mcpServers.baserow.url = "http://api.baserow.io/mcp";
  m.claudePlugin.userConfig.mcp_url.default = "http://api.baserow.io/mcp";
  m.gemini.mcpServers.baserow.httpUrl = "http://api.baserow.io/mcp";
  m.registry.remotes[0].url = "http://api.baserow.io/mcp";
  assert.match(checkSync(m).join("\n"), /must start with https:\/\/ and end with \/mcp/);
});

test("an extra MCP server is reported", () => {
  const m = validManifests();
  m.agentMcp.mcpServers["baserow-key"] = { type: "streamable-http", url: URL };
  assert.match(checkSync(m).join("\n"), /mcp\.json: servers must be exactly \[baserow\]/);
});

test("a wrong plugin name in a marketplace is reported", () => {
  const m = validManifests();
  m.claudeMarketplace.plugins[0].name = "baserow-poc";
  assert.match(checkSync(m).join("\n"), /marketplace\.json: plugins must be exactly \[baserow\]/);
});

test("valid manifests pass the schemas", async () => {
  assert.deepEqual(await checkSchemas(validManifests(), SCHEMA_DIR), []);
});

test("an Agent Plugins mcp.json without type fails the schema", async () => {
  const m = validManifests();
  delete m.agentMcp.mcpServers.baserow.type;
  const errors = await checkSchemas(m, SCHEMA_DIR);
  assert.ok(
    errors.some((e) => /^mcp\.json: \/mcpServers\/baserow must have required property 'type'/.test(e)),
    errors.join("\n"),
  );
});

async function repoWithSkill(name, body) {
  const root = await mkdtemp(path.join(tmpdir(), "skills-"));
  await mkdir(path.join(root, "skills", name), { recursive: true });
  await writeFile(path.join(root, "skills", name, "SKILL.md"), body);
  return root;
}

test("a skill with name and description passes", async () => {
  const root = await repoWithSkill("baserow-basics", "---\nname: baserow-basics\ndescription: Use when x.\n---\n\nBody\n");
  assert.deepEqual(await checkSkills(root), []);
});

test("a skill without description fails", async () => {
  const root = await repoWithSkill("baserow-basics", "---\nname: baserow-basics\n---\n\nBody\n");
  assert.match((await checkSkills(root)).join("\n"), /description/);
});

test("a skill whose name differs from its folder fails", async () => {
  const root = await repoWithSkill("baserow-basics", "---\nname: basics\ndescription: d\n---\n");
  assert.match((await checkSkills(root)).join("\n"), /name "basics" must match folder "baserow-basics"/);
});

test("missing manifest files are reported by path", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "empty-"));
  const { errors } = await loadManifests(root);
  assert.ok(errors.includes("gemini-extension.json: file missing"), errors.join("\n"));
});
