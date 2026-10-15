import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkAssets,
  checkReadme,
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
      mcpServers: { baserow: { type: "http", url: "${user_config.mcp_url}" } },
    },
    claudeMarketplace: { name: "baserow", plugins: [{ name: "baserow", source: "./" }] },
    claudeMcp: { mcpServers: { baserow: { type: "http", url: URL } } },
    agentPlugin: { $schema: `${AGENT_SCHEMA}/plugin.schema.json`, name: "baserow", version: "0.1.0", description: "d" },
    agentMcp: { $schema: `${AGENT_SCHEMA}/mcp.schema.json`, mcpServers: { baserow: { type: "streamable-http", url: URL } } },
    codexMarketplace: { name: "baserow", plugins: [{ name: "baserow" }] },
    cursorPlugin: { name: "baserow", version: "0.1.0", mcpServers: "./.mcp.json" },
    gemini: { name: "baserow", version: "0.1.0", mcpServers: { baserow: { httpUrl: URL } } },
    registry: {
      $schema: REGISTRY_SCHEMA,
      description: "d",
      name: "io.baserow/baserow",
      version: "0.1.0",
      remotes: [
        { type: "streamable-http", url: URL },
        { type: "streamable-http", url: "https://{host}/mcp", variables: { host: { isRequired: true } } },
      ],
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
  m.agentMcp.mcpServers.baserow.url = "http://api.baserow.io/mcp";
  m.claudePlugin.userConfig.mcp_url.default = "http://api.baserow.io/mcp";
  m.gemini.mcpServers.baserow.httpUrl = "http://api.baserow.io/mcp";
  m.registry.remotes[0].url = "http://api.baserow.io/mcp";
  m.claudeMcp.mcpServers.baserow.url = "http://api.baserow.io/mcp";
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

test("a wrong .mcp.json server set is reported", () => {
  const m = validManifests();
  m.claudeMcp.mcpServers = { other: { type: "http", url: URL } };
  assert.match(checkSync(m).join("\n"), /\.mcp\.json: servers must be exactly \[baserow\]/);
});

test("a wrong plugin name in the Codex marketplace is reported", () => {
  const m = validManifests();
  m.codexMarketplace.plugins[0].name = "other";
  assert.match(checkSync(m).join("\n"), /\.agents\/plugins\/marketplace\.json: plugins must be exactly \[baserow\]/);
});

test("a wrong manifest name is reported", () => {
  const m = validManifests();
  m.gemini.name = "other";
  assert.match(checkSync(m).join("\n"), /gemini-extension\.json: name must be "baserow", got "other"/);
});

test("a wrong marketplace name is reported", () => {
  for (const key of ["claudeMarketplace", "codexMarketplace"]) {
    const m = validManifests();
    m[key].name = "other";
    assert.match(checkSync(m).join("\n"), /marketplace\.json: name must be "baserow", got "other"/);
  }
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

async function tempDir(t, prefix) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

async function repoWithSkill(t, name, body) {
  const root = await tempDir(t, "skills-");
  await mkdir(path.join(root, "skills", name), { recursive: true });
  await writeFile(path.join(root, "skills", name, "SKILL.md"), body);
  return root;
}

test("a skill with name and description passes", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", "---\nname: baserow-basics\ndescription: Use when x.\n---\n\nBody\n");
  assert.deepEqual(await checkSkills(root), []);
});

test("a skill without description fails", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", "---\nname: baserow-basics\n---\n\nBody\n");
  assert.match((await checkSkills(root)).join("\n"), /description/);
});

test("a skill whose name differs from its folder fails", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", "---\nname: basics\ndescription: d\n---\n");
  assert.match((await checkSkills(root)).join("\n"), /name "basics" must match folder "baserow-basics"/);
});

test("missing manifest files are reported by path", async (t) => {
  const root = await tempDir(t, "empty-");
  const { errors } = await loadManifests(root);
  assert.ok(errors.includes("gemini-extension.json: file missing"), errors.join("\n"));
});

test("invalid JSON is reported by path", async (t) => {
  const root = await tempDir(t, "badjson-");
  await writeFile(path.join(root, "server.json"), "{ nope");
  const { errors } = await loadManifests(root);
  assert.ok(errors.some((e) => /^server\.json: invalid JSON/.test(e)), errors.join("\n"));
});

test("a skill without front matter fails", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", "Body only\n");
  assert.deepEqual(await checkSkills(root), ["skills/baserow-basics/SKILL.md: front matter missing"]);
});

test("an empty skills folder is reported", async (t) => {
  const root = await tempDir(t, "noskills-");
  await mkdir(path.join(root, "skills"));
  assert.deepEqual(await checkSkills(root), ["skills/: no skills"]);
});

test("the Claude plugin must fill in the user's URL", () => {
  const m = validManifests();
  m.claudePlugin.mcpServers.baserow.url = URL;
  assert.match(checkSync(m).join("\n"), /plugin\.json: mcpServers\.baserow\.url must be \$\{user_config\.mcp_url\}/);
});

test("a placeholder in .mcp.json is reported, since only Claude Code fills it in", () => {
  const m = validManifests();
  m.claudeMcp.mcpServers.baserow.url = "${user_config.mcp_url}";
  assert.match(checkSync(m).join("\n"), /SaaS URL differs/);
});

test("the registry SaaS remote is found whatever the order", () => {
  const m = validManifests();
  m.registry.remotes.reverse();
  assert.deepEqual(checkSync(m), []);
});

test("a self-hosted registry remote must end in /mcp", () => {
  const m = validManifests();
  m.registry.remotes[1].url = "https://{host}";
  assert.match(checkSync(m).join("\n"), /server\.json: remote https:\/\/\{host\} must start with https:\/\//);
});

test("a SaaS URL with a query, fragment or space is rejected", () => {
  for (const bad of ["https://api.baserow.io/mcp?x=/mcp", "https://api.baserow.io#/mcp", "https://bad host/mcp"]) {
    const m = validManifests();
    m.agentMcp.mcpServers.baserow.url = bad;
    assert.ok(checkSync(m).some((e) => e.startsWith(`mcp.json: SaaS URL ${bad} `)), bad);
  }
});

test("malformed marketplace plugins are reported without crashing", () => {
  for (const plugins of [{ baserow: {} }, [null]]) {
    const m = validManifests();
    m.claudeMarketplace.plugins = plugins;
    assert.match(checkSync(m).join("\n"), /marketplace\.json: plugins must be exactly \[baserow\]/);
  }
});

const cursorLink = (url) =>
  `https://cursor.com/install-mcp?name=baserow&config=${Buffer.from(JSON.stringify({ url })).toString("base64")}`;
const vscodeLink = (url) =>
  `https://vscode.dev/redirect/mcp/install?name=baserow&config=${encodeURIComponent(JSON.stringify({ type: "http", url }))}`;
const gooseLink = (url) => `https://goose-docs.ai/extension?url=${encodeURIComponent(url)}&id=baserow`;

test("a README that matches the SaaS URL passes", () => {
  const readme = [
    `Use \`${URL}\` or \`https://baserow.example.com/mcp\`.`,
    "See [the docs](https://github.com/baserow/baserow/blob/develop/docs/installation/mcp-oauth.md).",
    `[Add to Cursor](${cursorLink(URL)})`,
    `| [Add to VS Code](${vscodeLink(URL)}) |`,
    `[Add to Goose](${gooseLink(URL)})`,
  ].join("\n");
  assert.deepEqual(checkReadme(readme, URL), []);
});

test("a stale URL or install link in the README is reported", () => {
  const old = "https://old.baserow.io/mcp";
  const readme = [
    `{ "url": "${old}" }`,
    `${URL}/`,
    `**${old}**`,
    `| ${old}|`,
    `http://api.baserow.io/mcp`,
    `[a](${cursorLink(old)})`,
    `[b](${vscodeLink(old)})`,
    `[c](${gooseLink(old)})`,
  ].join("\n");
  const errors = checkReadme(readme, URL);
  assert.equal(errors.length, 8, errors.join("\n"));
});

test("app-scheme install links are reported, since GitHub strips them", () => {
  const errors = checkReadme("[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=baserow)", URL);
  assert.match(errors.join("\n"), /isn't clickable on GitHub/);
});

test("a skill with CRLF line endings, a BOM and a quoted name passes", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", '\uFEFF---\r\nname: "baserow-basics"\r\ndescription: d\r\n---\r\n');
  assert.deepEqual(await checkSkills(root), []);
});

test("an empty description doesn't borrow the next line", async (t) => {
  const root = await repoWithSkill(t, "baserow-basics", "---\nname: baserow-basics\ndescription:\nlicense: MIT\n---\n");
  assert.deepEqual(await checkSkills(root), ["skills/baserow-basics/SKILL.md: description missing"]);
});

test("a listing logo that doesn't exist is reported", async (t) => {
  const root = await tempDir(t, "assets-");
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "assets", "logo.png"), "");
  await writeFile(path.join(root, ".mcp.json"), "{}");
  const m = validManifests();
  m.agentPlugin.extensions = { "com.openai": { interface: { logo: "./assets/logo.png", composerIcon: "./assets/missing.svg" } } };
  assert.deepEqual(await checkAssets(m, root), ["plugin.json: interface.composerIcon ./assets/missing.svg not found"]);
});
