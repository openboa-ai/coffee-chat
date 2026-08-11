import { createGitHubBoundary } from "./github.mjs";
import { createInitPreview, executeInit, InitError } from "./init.mjs";
import { createOwnedRegistry } from "./registry.mjs";

const valueFlags = new Set([
  "--owner",
  "--attribution",
  "--decision",
  "--preview-digest",
]);

function parse(argv) {
  const command = argv[0];
  if (command !== "preview" && command !== "apply") {
    throw new InitError("invalid_init_command");
  }
  const values = {};
  let rightsAttested = false;
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--license" || flag === "--scope") {
      throw new InitError("unsupported_content_license");
    }
    if (flag === "--rights-attested") {
      if (rightsAttested) throw new InitError("duplicate_init_argument");
      rightsAttested = true;
      continue;
    }
    if (!valueFlags.has(flag)) throw new InitError("invalid_init_argument");
    if (flag in values) throw new InitError("duplicate_init_argument");
    if (index + 1 >= argv.length) throw new InitError("missing_init_argument");
    values[flag] = argv[(index += 1)];
  }
  const owner = values["--owner"];
  const attribution = values["--attribution"];
  if (owner === undefined || attribution === undefined) {
    throw new InitError("missing_init_identity");
  }
  if (command === "preview") {
    if (
      values["--decision"] !== undefined ||
      values["--preview-digest"] !== undefined ||
      rightsAttested
    ) {
      throw new InitError("invalid_preview_argument");
    }
    return { command, owner, attribution };
  }
  const decision = values["--decision"];
  const previewDigest = values["--preview-digest"];
  if (
    !["accept", "reject", "cancel"].includes(decision) ||
    previewDigest === undefined
  ) {
    throw new InitError("invalid_acceptance");
  }
  return {
    command,
    owner,
    attribution,
    acceptance: { decision, previewDigest, rightsAttested },
  };
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

export async function runInitCli(
  argv,
  {
    stdout = process.stdout,
    stderr = process.stderr,
    github = undefined,
    registry = undefined,
  } = {},
) {
  try {
    const input = parse(argv);
    const preview = createInitPreview({
      owner: input.owner,
      attribution: input.attribution,
    });
    if (input.command === "preview") {
      writeJson(stdout, preview);
      return 0;
    }
    const result = await executeInit({
      preview,
      acceptance: input.acceptance,
      github: github ?? createGitHubBoundary(),
      registry: registry ?? createOwnedRegistry(),
    });
    if (
      result.status === "initialized" ||
      result.status === "rejected" ||
      result.status === "cancelled"
    ) {
      writeJson(stdout, result);
      return 0;
    }
    writeJson(stderr, result);
    return 3;
  } catch (error) {
    writeJson(stderr, {
      status: "invalid",
      code: error instanceof InitError ? error.code : "init_failed",
    });
    return 64;
  }
}
