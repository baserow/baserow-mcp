// Checks that every harness manifest and the README point at the same server, URL and version.
// Schemas in scripts/schemas/ are vendored copies of:
//   plugin.schema.json  https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
//   mcp.schema.json     https://agent-plugins.org/schemas/1.0.0/mcp.schema.json
//   server.schema.json  https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
import { realpathSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const SERVER_NAME = "baserow";
const CLAUDE_URL = "${user_config.mcp_url}";
const README = "README.md";

export const FILES = {
  claudePlugin: ".claude-plugin/plugin.json",
  claudeMarketplace: ".claude-plugin/marketplace.json",
  claudeMcp: ".mcp.json",
  agentPlugin: "plugin.json",
  agentMcp: "mcp.json",
  codexMarketplace: ".agents/plugins/marketplace.json",
  gemini: "gemini-extension.json",
  registry: "server.json",
};

const SCHEMAS = {
  agentPlugin: "plugin.schema.json",
  agentMcp: "mcp.schema.json",
  registry: "server.schema.json",
};

export async function loadManifests(root) {
  const manifests = {};
  const errors = [];
  for (const [key, rel] of Object.entries(FILES)) {
    let text;
    try {
      text = await readFile(path.join(root, rel), "utf8");
    } catch {
      errors.push(`${rel}: file missing`);
      continue;
    }
    try {
      manifests[key] = JSON.parse(text);
    } catch (e) {
      errors.push(`${rel}: invalid JSON (${e.message})`);
    }
  }
  return { manifests, errors };
}

function sameValue(label, valuesByFile) {
  const errors = [];
  const present = Object.entries(valuesByFile).filter(([file, value]) => {
    if (value === undefined) errors.push(`${file}: ${label} missing`);
    return value !== undefined;
  });
  if (new Set(present.map(([, v]) => v)).size > 1) {
    errors.push(`${label} differs: ${present.map(([f, v]) => `${f}=${v}`).join(", ")}`);
  }
  return errors;
}

function exactly(file, what, names) {
  const ok = Array.isArray(names) && names.length === 1 && names[0] === SERVER_NAME;
  return ok ? [] : [`${file}: ${what} must be exactly [${SERVER_NAME}], got [${(names ?? []).join(", ")}]`];
}

const pluginNames = (plugins) => (Array.isArray(plugins) ? plugins.map((p) => p?.name) : undefined);

// Returns why a server URL is wrong, or undefined. Registry URL templates like
// https://{host}/mcp are checked with each variable filled in.
export function urlProblem(url) {
  if (typeof url !== "string" || /\s/.test(url)) return "must be a URL without spaces";
  let parsed;
  try {
    parsed = new URL(url.replace(/\{[^}]+\}/g, "example.com"));
  } catch {
    return "is not a valid URL";
  }
  if (parsed.protocol !== "https:" || parsed.search || parsed.hash || !parsed.pathname.endsWith("/mcp")) {
    return "must start with https:// and end with /mcp, without a query or fragment";
  }
  return undefined;
}

export function checkSync(m) {
  const remotes = Array.isArray(m.registry?.remotes) ? m.registry.remotes : [];
  const versions = {
    [FILES.claudePlugin]: m.claudePlugin?.version,
    [FILES.agentPlugin]: m.agentPlugin?.version,
    [FILES.gemini]: m.gemini?.version,
    [FILES.registry]: m.registry?.version,
  };
  const urls = {
    [FILES.claudePlugin]: m.claudePlugin?.userConfig?.mcp_url?.default,
    [FILES.claudeMcp]: m.claudeMcp?.mcpServers?.[SERVER_NAME]?.url,
    [FILES.agentMcp]: m.agentMcp?.mcpServers?.[SERVER_NAME]?.url,
    [FILES.gemini]: m.gemini?.mcpServers?.[SERVER_NAME]?.httpUrl,
    [FILES.registry]: remotes.find((r) => !r?.variables)?.url,
  };
  const errors = [...sameValue("version", versions), ...sameValue("SaaS URL", urls)];
  for (const [file, url] of Object.entries(urls)) {
    const problem = url === undefined ? undefined : urlProblem(url);
    if (problem) errors.push(`${file}: SaaS URL ${url} ${problem}`);
  }
  for (const remote of remotes.filter((r) => r?.variables)) {
    const problem = urlProblem(remote.url);
    if (problem) errors.push(`${FILES.registry}: remote ${remote.url} ${problem}`);
  }
  // Claude Code fills in the user's URL; every other client reads the literal URL in .mcp.json.
  const claudeUrl = m.claudePlugin?.mcpServers?.[SERVER_NAME]?.url;
  if (m.claudePlugin && claudeUrl !== CLAUDE_URL) {
    errors.push(`${FILES.claudePlugin}: mcpServers.${SERVER_NAME}.url must be ${CLAUDE_URL}, got ${claudeUrl}`);
  }
  errors.push(
    ...exactly(FILES.claudePlugin, "servers", Object.keys(m.claudePlugin?.mcpServers ?? {})),
    ...exactly(FILES.claudeMcp, "servers", Object.keys(m.claudeMcp?.mcpServers ?? {})),
    ...exactly(FILES.agentMcp, "servers", Object.keys(m.agentMcp?.mcpServers ?? {})),
    ...exactly(FILES.gemini, "servers", Object.keys(m.gemini?.mcpServers ?? {})),
    ...exactly(FILES.claudeMarketplace, "plugins", pluginNames(m.claudeMarketplace?.plugins)),
    ...exactly(FILES.codexMarketplace, "plugins", pluginNames(m.codexMarketplace?.plugins)),
  );
  for (const key of ["claudePlugin", "agentPlugin", "gemini", "claudeMarketplace", "codexMarketplace"]) {
    if (m[key] && m[key].name !== SERVER_NAME) {
      errors.push(`${FILES[key]}: name must be "${SERVER_NAME}", got "${m[key].name}"`);
    }
  }
  return errors;
}

// Returns the server URL an install link in the README points at.
function linkUrl(link) {
  const parsed = new URL(link);
  if (parsed.protocol === "cursor:") {
    return JSON.parse(Buffer.from(parsed.searchParams.get("config") ?? "", "base64").toString()).url;
  }
  if (parsed.protocol === "vscode:") return JSON.parse(decodeURIComponent(parsed.search.slice(1))).url;
  if (parsed.protocol === "goose:") return parsed.searchParams.get("url");
  return undefined;
}

export function checkReadme(text, saasUrl) {
  const errors = [];
  for (let [url] of text.matchAll(/https:\/\/[^\s"'`<>()\]]+/g)) {
    url = url.replace(/[.,;:]+$/, "");
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (/\/mcp(\/|$)/.test(parsed.pathname) && !parsed.hostname.endsWith("example.com") && url !== saasUrl) {
      errors.push(`${README}: ${url} differs from the SaaS URL ${saasUrl}`);
    }
  }
  for (const [, link] of text.matchAll(/\]\(((?:cursor|vscode|goose):[^)\s]+)\)/g)) {
    let url;
    try {
      url = linkUrl(link);
    } catch (e) {
      errors.push(`${README}: can't read install link ${link} (${e.message})`);
      continue;
    }
    if (url !== saasUrl) errors.push(`${README}: install link ${link} points at ${url}, not ${saasUrl}`);
  }
  return errors;
}

function compile(schema) {
  const draft2020 = String(schema.$schema ?? "").includes("2020-12");
  const ajv = draft2020 ? new Ajv2020({ strict: false, allErrors: true }) : new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

export async function checkSchemas(m, schemaDir) {
  const errors = [];
  for (const [key, schemaFile] of Object.entries(SCHEMAS)) {
    if (!m[key]) continue;
    const schema = JSON.parse(await readFile(path.join(schemaDir, schemaFile), "utf8"));
    const validate = compile(schema);
    if (!validate(m[key])) {
      for (const err of validate.errors) {
        errors.push(`${FILES[key]}: ${err.instancePath || "/"} ${err.message}`);
      }
    }
  }
  return errors;
}

export async function checkSkills(root) {
  const errors = [];
  const skillsDir = path.join(root, "skills");
  let names;
  try {
    names = (await readdir(skillsDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return ["skills/: folder missing"];
  }
  if (names.length === 0) errors.push("skills/: no skills");
  for (const dir of names) {
    const file = `skills/${dir}/SKILL.md`;
    let text;
    try {
      text = await readFile(path.join(root, file), "utf8");
    } catch {
      errors.push(`${file}: file missing`);
      continue;
    }
    text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const front = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!front) {
      errors.push(`${file}: front matter missing`);
      continue;
    }
    const field = (k) =>
      front[1]
        .match(new RegExp(`^${k}:[ \\t]*(.*)$`, "m"))?.[1]
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2");
    const name = field("name");
    if (!name) errors.push(`${file}: name missing`);
    else if (name !== dir) errors.push(`${file}: name "${name}" must match folder "${dir}"`);
    if (!field("description")) errors.push(`${file}: description missing`);
  }
  return errors;
}

export async function runAll(root) {
  const { manifests, errors } = await loadManifests(root);
  const schemaDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "schemas");
  const saasUrl = manifests.agentMcp?.mcpServers?.[SERVER_NAME]?.url;
  let readme;
  try {
    readme = await readFile(path.join(root, README), "utf8");
  } catch {
    errors.push(`${README}: file missing`);
  }
  return [
    ...errors,
    ...checkSync(manifests),
    ...(readme === undefined || saasUrl === undefined ? [] : checkReadme(readme, saasUrl)),
    ...(await checkSchemas(manifests, schemaDir)),
    ...(await checkSkills(root)),
  ];
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? ".");
  const errors = await runAll(root);
  for (const e of errors) console.error(e);
  if (errors.length) process.exit(1);
  console.log("manifests ok");
}
