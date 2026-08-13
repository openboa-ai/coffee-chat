import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  ContentLicenseError,
  renderContentLicense,
} from "../contract/roastery/dist/content-license.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

const authority = deepFreeze(
  JSON.parse(
    readFileSync(
      new URL("../contract/roastery-authority.json", import.meta.url),
      "utf8",
    ),
  ),
);

const CALVER = "2026.8.13";
const OWNER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/iu;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;

const notices = Object.freeze([
  {
    id: "public-beans",
    text: "Standard Roastery Beans are public.",
  },
  {
    id: "sharing-commercial-ai-adaptation",
    text: "CC BY 4.0 permits sharing, commercial use, and adaptations, including AI-assisted or AI-generated adaptations.",
  },
  {
    id: "attribution-change-no-endorsement",
    text: "Downstream users must provide attribution, link the license, and indicate changes without implying endorsement.",
  },
  {
    id: "irrevocable",
    text: "The grant is not revocable for recipients who already received the content under the license.",
  },
  {
    id: "rights-authority",
    text: "The publisher may license only rights they own or control.",
  },
  {
    id: "origin-exclusion",
    text: "Origin URLs and the resources they identify are excluded from the Bean-content license.",
  },
  {
    id: "ai-response-disclosure",
    text: "An AI Coffee response is not the publisher's original wording or endorsement.",
  },
]);

export class InitError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "InitError";
    this.code = code;
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalValue(value)))
    .digest("hex")}`;
}

function exactInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InitError("invalid_init_input");
  }
  if ("license" in input || "scope" in input || "contentLicense" in input) {
    throw new InitError(
      "unsupported_content_license",
      "Init has no license-choice input",
    );
  }
  if (
    JSON.stringify(Object.keys(input).sort()) !==
    JSON.stringify(["attribution", "owner"])
  ) {
    throw new InitError("invalid_init_input");
  }
  if (typeof input.owner !== "string" || !OWNER.test(input.owner)) {
    throw new InitError("invalid_owner");
  }
  if (typeof input.attribution !== "string") {
    throw new InitError("invalid_content_license");
  }
  return {
    attribution: input.attribution,
    owner: input.owner.toLowerCase(),
  };
}

function contractPin() {
  return {
    repository: authority.contract.repository,
    commit: authority.contract.commit,
    digest: authority.contract.digest,
  };
}

function bindPreview(preview) {
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
    return undefined;
  }
  const owner = preview.target?.owner;
  const attribution = preview.declaration?.attribution;
  if (typeof owner !== "string" || typeof attribution !== "string") {
    return undefined;
  }
  let expected;
  try {
    expected = createInitPreview({ owner, attribution });
  } catch {
    return undefined;
  }
  return JSON.stringify(canonicalValue(preview)) ===
    JSON.stringify(canonicalValue(expected))
    ? expected
    : undefined;
}

export function createInitPreview(input) {
  const normalized = exactInput(input);
  let declaration;
  try {
    declaration = renderContentLicense(normalized.attribution);
  } catch (error) {
    if (error instanceof ContentLicenseError) {
      throw new InitError(error.code, error.message);
    }
    throw error;
  }
  const targetRepository = `https://github.com/${normalized.owner}/${authority.seed.forkName}`;
  const preview = {
    schema: "coffee-chat-init-preview",
    calver: CALVER,
    operation: "init",
    status: "preview",
    source: {
      repository: authority.seed.repository,
      commit: authority.seed.commit,
      tree: authority.seed.tree,
      defaultBranch: authority.seed.defaultBranch,
    },
    target: {
      owner: normalized.owner,
      repository: targetRepository,
      name: authority.seed.forkName,
      visibility: "public",
      defaultBranch: "main",
    },
    contract: contractPin(),
    declaration,
    notices: notices.map((notice) => ({ ...notice })),
    rightsAttestation:
      "I attest that I may license only Bean content rights I own or control under the fixed CC BY 4.0 declaration.",
    publication: {
      branchPullRequestOnly: true,
      requiredCi: true,
      squashMerge: true,
      registerAfterPublicMainVerification: true,
    },
    localState: {
      registryWrite: "after-public-main-verification",
      cloneWrite: "none",
    },
    recovery:
      "After the first accepted external write, failure is reported with the last completed stage; Init never deletes the public fork implicitly.",
  };
  return { ...preview, previewDigest: digest(preview) };
}

function initializationFiles(preview) {
  return {
    "roastery/roastery.json": `${JSON.stringify(
      {
        repository: preview.target.repository,
        contract: preview.contract,
      },
      null,
      2,
    )}\n`,
    "roastery/CONTENT_LICENSE.md": preview.declaration.content,
  };
}

function failed(stage, error) {
  return {
    status: "initialization_failed",
    stage,
    code:
      error && typeof error === "object" && typeof error.code === "string"
        ? error.code
        : "boundary_failed",
  };
}

export async function executeInit({
  preview: suppliedPreview,
  acceptance,
  github,
  registry,
}) {
  if (acceptance?.decision === "reject") return { status: "rejected" };
  if (acceptance?.decision === "cancel") return { status: "cancelled" };
  if (acceptance?.decision !== "accept") {
    return { status: "invalid_acceptance" };
  }
  const preview = bindPreview(suppliedPreview);
  if (
    !preview ||
    !DIGEST.test(acceptance.previewDigest ?? "") ||
    acceptance.previewDigest !== preview.previewDigest
  ) {
    return { status: "stale_preview" };
  }
  if (acceptance.rightsAttested !== true) {
    return { status: "rights_not_attested" };
  }

  let registryPreflight;
  try {
    registryPreflight = await registry.preflightOwned(preview);
  } catch (error) {
    return {
      status: "preflight_failed",
      code:
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "registry_preflight_failed",
    };
  }
  if (
    registryPreflight?.status !== "ready" ||
    registryPreflight.repository !== preview.target.repository
  ) {
    return {
      status: "preflight_failed",
      code: registryPreflight?.code ?? "registry_preflight_mismatch",
    };
  }

  let preflight;
  try {
    preflight = await github.preflight(preview);
  } catch (error) {
    return {
      status: "preflight_failed",
      code:
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "github_preflight_failed",
    };
  }
  if (
    preflight?.status !== "ready" ||
    preflight.owner !== preview.target.owner ||
    preflight.sourceCommit !== preview.source.commit
  ) {
    return {
      status: "preflight_failed",
      code: preflight?.code ?? "preflight_mismatch",
    };
  }

  let fork;
  try {
    fork = await github.fork(preview);
    if (
      fork?.status !== "forked" ||
      fork.repository !== preview.target.repository ||
      fork.commit !== preview.source.commit
    ) {
      throw new InitError("fork_mismatch");
    }
  } catch (error) {
    return failed("fork", error);
  }

  try {
    const protection = await github.protect(preview);
    if (
      protection?.status !== "protected" ||
      protection.repository !== preview.target.repository
    ) {
      throw new InitError("protection_mismatch");
    }
  } catch (error) {
    return failed("protect", error);
  }

  let proposal;
  try {
    proposal = await github.propose({
      preview,
      acceptance: {
        previewDigest: preview.previewDigest,
        rightsAttested: true,
      },
      files: initializationFiles(preview),
      fork,
    });
    if (
      proposal?.status !== "proposed" ||
      proposal.repository !== preview.target.repository
    ) {
      throw new InitError("proposal_mismatch");
    }
  } catch (error) {
    return failed("propose", error);
  }

  let merge;
  try {
    merge = await github.awaitProtectedMerge(proposal);
    if (
      merge?.status !== "merged" ||
      merge.repository !== preview.target.repository ||
      merge.number !== proposal.number ||
      typeof merge.commit !== "string"
    ) {
      throw new InitError("merge_mismatch");
    }
  } catch (error) {
    return failed("await_protected_merge", error);
  }

  let verified;
  try {
    verified = await github.verifyOwned({ preview, merge });
    if (
      verified?.status !== "verified" ||
      verified.repository !== preview.target.repository ||
      verified.commit !== merge.commit
    ) {
      throw new InitError("verification_mismatch");
    }
  } catch (error) {
    return failed("verify_owned", error);
  }

  try {
    const registered = await registry.registerOwned({
      role: "owned",
      repository: verified.repository,
      commit: verified.commit,
      contract: preview.contract,
    });
    if (registered?.status !== "registered") {
      throw new InitError("registry_mismatch");
    }
  } catch (error) {
    return failed("register_owned", error);
  }

  return {
    status: "initialized",
    repository: verified.repository,
    commit: verified.commit,
    pullRequest: proposal.number,
  };
}
