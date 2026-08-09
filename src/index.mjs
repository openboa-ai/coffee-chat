import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { digest, normalizeRepository } from "./canonical.mjs";
import {
  LICENSE,
  NOTICE_KEYS,
  validateBeans,
  validateCommit,
  validateDeclaration,
  validateOwner,
} from "./contracts.mjs";
import { CoffeeChatError, fail } from "./errors.mjs";
import {
  acquireVerifiedExternal,
  requireVerifiedForkProof,
} from "./verified-acquisition.mjs";

const notices = Object.freeze(
  Object.fromEntries(NOTICE_KEYS.map((key) => [key, true])),
);
const trustedContract = Object.freeze(
  JSON.parse(
    readFileSync(
      new URL("../config/roastery-contract.json", import.meta.url),
      "utf8",
    ),
  ),
);

function contentLicenseText(owner) {
  const attribution = `${owner.name} — ${owner.url}`;
  if (attribution.length > 120) {
    fail(
      "invalid_owner_attribution",
      "Combined owner attribution must be 120 characters or fewer.",
      { writes: 0 },
    );
  }
  return `---\nscope: roastery/beans/**\nlicense: CC-BY-4.0\nattribution: ${JSON.stringify(attribution)}\n---\n\n# Bean Content License\n\nThe files under \`roastery/beans/**\` are licensed under \`CC-BY-4.0\`.\n\nAttribution: ${attribution}\n\nOfficial license: ${LICENSE.url}\n\nOrigin URLs and the resources they identify are excluded from this Bean content license.\n\nThe publisher can license only rights they own or control.\n`;
}

export function prepareInit(input) {
  if ("license" in input || "contentLicense" in input) {
    fail(
      "unsupported_content_license",
      "Coffee Chat does not offer a license choice.",
      { writes: 0 },
    );
  }
  const owner = validateOwner(input.owner);
  const repository = normalizeRepository(input.repository);
  if (!repository.endsWith("/coffee-chat")) {
    fail(
      "invalid_roastery_name",
      "The public fork must be named coffee-chat.",
      { writes: 0 },
    );
  }
  const forkProof = requireVerifiedForkProof(input.forkProof, repository);
  const declaration = {
    repository,
    contract: {
      repository: trustedContract.repository,
      commit: trustedContract.commit,
      digest: trustedContract.bundleDigest,
    },
  };
  const preview = {
    status: "awaiting_approval",
    seed: "https://github.com/openboa-ai/coffee-chat-roastery",
    visibility: "public",
    repository,
    forkProof,
    owner,
    contract: declaration.contract,
    contentLicense: { spdx: LICENSE.spdx, url: LICENSE.url },
    notices,
    renderedDeclaration: `${JSON.stringify(declaration, null, 2)}\n`,
    renderedContentLicense: contentLicenseText(owner),
    writes: [],
  };
  return { ...preview, previewDigest: digest(preview) };
}

export function acceptInit({ preview, acceptedPreviewDigest, rightsAttested }) {
  const { previewDigest, ...previewBody } = preview ?? {};
  if (
    preview?.status !== "awaiting_approval" ||
    previewDigest !== digest(previewBody) ||
    acceptedPreviewDigest !== previewDigest
  ) {
    fail("stale_preview", "Approval must bind the exact current Preview.", {
      writes: 0,
    });
  }
  requireVerifiedForkProof(preview.forkProof, preview.repository);
  if (!/^[0-9a-f]{40}$/u.test(preview.contract?.commit)) {
    fail(
      "contract_pin_pending",
      "Init is unavailable until the trusted Roastery contract commit reaches protected main.",
      { writes: 0 },
    );
  }
  if (rightsAttested !== true) {
    fail(
      "rights_attestation_required",
      "The owner must attest publication rights.",
      { writes: 0 },
    );
  }
  return {
    status: "approved_write_plan",
    delivery: "protected_branch_pull_request",
    previewDigest,
    writes: [
      { path: "roastery/roastery.json", content: preview.renderedDeclaration },
      {
        path: "roastery/CONTENT_LICENSE.md",
        content: preview.renderedContentLicense,
      },
    ],
  };
}

function validateSnapshot(snapshot) {
  const repository = normalizeRepository(snapshot.repository);
  const commit = validateCommit(snapshot.commit);
  const declaration = validateDeclaration(
    snapshot.declaration,
    repository,
    trustedContract,
  );
  const beans = validateBeans(snapshot.beans, declaration.owner);
  return { repository, commit, declaration, beans };
}

export function syncOwned({
  currentCommit,
  remoteCommit,
  clean,
  remoteDescendsFromCurrent,
}) {
  validateCommit(currentCommit);
  validateCommit(remoteCommit);
  if (clean !== true) {
    fail(
      "owned_roastery_not_clean",
      "Owned Sync requires a clean worktree and index.",
      { writes: 0 },
    );
  }
  if (currentCommit === remoteCommit) {
    return {
      status: "up_to_date",
      from: currentCommit,
      to: remoteCommit,
      writes: [],
    };
  }
  if (remoteDescendsFromCurrent !== true) {
    fail(
      "owned_roastery_not_fast_forward",
      "Owned Sync permits only a clean fast-forward.",
      { writes: 0 },
    );
  }
  return {
    status: "fast_forward_plan",
    from: currentCommit,
    to: remoteCommit,
    operation: "git_fast_forward_only",
    writes: [],
  };
}

function installExternalSnapshot({ registry, snapshot }) {
  const valid = validateSnapshot(snapshot);
  const id = digest({ repository: valid.repository });
  const relationship = {
    id,
    repository: valid.repository,
    commit: valid.commit,
    scope: "global",
    readOnly: true,
    snapshotDigest: digest(valid),
    acquisitionDigest: digest(snapshot.acquisition),
  };
  return {
    status: "synced",
    relationship,
    registry: [
      ...registry.filter((entry) => entry.id !== id),
      relationship,
    ].sort((a, b) => a.id.localeCompare(b.id, "en")),
    modelContext: valid.beans.map(({ uuid, content }) => ({ uuid, content })),
    persistence: {
      copiedIntoOwnedRoastery: false,
      coffee: false,
      transcript: false,
    },
  };
}

export function createExternalSync(boundary) {
  /** @param {{consent: boolean, registry?: any[], repository: string}} input */
  return async function syncVerifiedExternal({
    consent,
    registry = [],
    repository,
  }) {
    if (consent !== true)
      fail("consent_required", "Confirm before reading an external Roastery.", {
        writes: 0,
      });
    const snapshot = await acquireVerifiedExternal(boundary, repository);
    return installExternalSnapshot({ registry, snapshot });
  };
}

/** @param {Record<string, any>} input */
export async function syncExternal({ consent }) {
  if (consent !== true)
    fail("consent_required", "Confirm before reading an external Roastery.", {
      writes: 0,
    });
  fail(
    "verified_acquisition_required",
    "External Sync is unavailable without a trusted public-repository acquisition boundary.",
    { modelContext: 0, registryWrites: 0, writes: 0 },
  );
}

/** @param {{registry?: any[], id: string}} input */
export function unsync({ registry = [], id }) {
  const matches = registry.filter((entry) => entry.id === id);
  if (matches.length !== 1)
    fail("unknown_relationship", "Unsync requires one exact registered ID.", {
      writes: 0,
    });
  return {
    status: "unsynced",
    removed: matches[0],
    registry: registry.filter((entry) => entry.id !== id),
    deleted: {
      remote: false,
      clone: false,
      hostHistory: false,
      priorLicenseGrant: false,
    },
  };
}

function uuidV7(timestamp, material, previousUuid) {
  let milliseconds = BigInt(new Date(timestamp).getTime());
  if (milliseconds < 0n || !Number.isFinite(new Date(timestamp).getTime())) {
    fail("invalid_timestamp", "Roast requires a valid timestamp.");
  }
  if (previousUuid) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        previousUuid,
      )
    ) {
      fail("invalid_previous_uuid", "The previous Bean ID must be UUIDv7.");
    }
    const previousTime = BigInt(
      `0x${previousUuid.replaceAll("-", "").slice(0, 12)}`,
    );
    if (milliseconds <= previousTime) milliseconds = previousTime + 1n;
  }
  const time = milliseconds.toString(16).padStart(12, "0").slice(-12);
  const random = createHash("sha256").update(material).digest("hex");
  return `${time.slice(0, 8)}-${time.slice(8)}-7${random.slice(0, 3)}-8${random.slice(3, 6)}-${random.slice(6, 18)}`;
}

/** @param {{owned: boolean, bean: any, owner: any, timestamp: string, expectedHead: string, previousUuid?: string}} input */
export function prepareRoast({
  owned,
  bean,
  owner,
  timestamp,
  expectedHead,
  previousUuid,
}) {
  if (owned !== true) {
    fail(
      "external_to_owned_persistence_forbidden",
      "External Taste cannot be persisted into an owned Roastery.",
      { writes: 0 },
    );
  }
  if (
    bean?.additionalAttributionRequired ||
    bean?.priorModificationNoticeRequired
  ) {
    fail(
      "unrepresentable_third_party_rights",
      "The fixed Bean model cannot represent additional third-party rights.",
      { writes: 0 },
    );
  }
  const validOwner = validateOwner(owner);
  validateCommit(expectedHead);
  if (!bean?.title?.trim() || !bean?.content?.trim())
    fail("invalid_bean", "One complete Bean is required.", { writes: 0 });
  const stagedBean = {
    uuid: uuidV7(
      timestamp,
      `${bean.title}\n${bean.content}\n${validOwner.name}`,
      previousUuid,
    ),
    title: bean.title.trim(),
    content: bean.content.trim(),
    owner: validOwner,
  };
  const preview = {
    status: "awaiting_approval",
    expectedHead,
    bean: stagedBean,
    staging: { insideClone: false },
    changeSetDigest: digest({ bean: stagedBean }),
    writes: [],
  };
  return { ...preview, previewDigest: digest(preview) };
}

export function approveRoast({
  preview,
  acceptedPreviewDigest,
  currentHead,
  distributionRightsAttested,
}) {
  if (
    preview?.status !== "awaiting_approval" ||
    acceptedPreviewDigest !== preview.previewDigest
  ) {
    fail(
      "stale_preview",
      "Approval must bind the exact current Roast Preview.",
      { writes: 0 },
    );
  }
  if (currentHead !== preview.expectedHead)
    fail("stale_preview", "The owned Roastery head changed.", { writes: 0 });
  if (distributionRightsAttested !== true)
    fail(
      "rights_attestation_required",
      "Distribution rights attestation is required.",
      { writes: 0 },
    );
  const attestation = {
    owner: preview.bean.owner,
    beanDigest: digest(preview.bean),
    changeSetDigest: preview.changeSetDigest,
    head: currentHead,
    declaration: LICENSE.spdx,
  };
  return {
    status: "proposed",
    delivery: "single_branch_pull_request",
    writes: [
      { path: `roastery/beans/${preview.bean.uuid}.md`, bean: preview.bean },
    ],
    attestation: { ...attestation, digest: digest(attestation) },
  };
}

function citation(snapshot, bean) {
  return {
    owner: snapshot.declaration.owner,
    repository: snapshot.repository,
    uuid: bean.uuid,
    permalink: `${snapshot.repository}/blob/${snapshot.commit}/roastery/beans/${bean.uuid}.md`,
    rights: {
      attribution: snapshot.declaration.owner.name,
      licenseLabel: LICENSE.label,
      licenseUrl: LICENSE.url,
      changes: "AI-generated adaptation; changes made",
      noEndorsement: true,
    },
  };
}

function makeCoffee({ mode, prompt, snapshots, targets }) {
  if (!prompt?.trim()) fail("incomplete_request", "Coffee requires a prompt.");
  if (!Array.isArray(targets) || targets.length === 0)
    fail("explicit_target_required", "Select a Roastery target explicitly.");
  const normalizedTargets = targets.map(normalizeRepository);
  const available = snapshots.map(validateSnapshot);
  const selected = normalizedTargets.map((target) => {
    const matches = available.filter(
      (snapshot) => snapshot.repository === target,
    );
    if (matches.length !== 1)
      fail(
        "invalid_target",
        "Each target must resolve to one current snapshot.",
      );
    return matches[0];
  });
  const material = selected.flatMap((snapshot) =>
    snapshot.beans.map((bean) => ({ snapshot, bean })),
  );
  if (material.length === 0)
    fail(
      "no_validated_beans",
      "No validated Beans are available for the selected target.",
    );
  const citations = material.map(({ snapshot, bean }) =>
    citation(snapshot, bean),
  );
  const context = material.map(({ snapshot, bean }) => ({
    repository: snapshot.repository,
    commit: snapshot.commit,
    uuid: bean.uuid,
    title: bean.title,
    content: bean.content,
    authority: "untrusted_taste_content_only",
  }));
  const receipt = {
    transformation: "ai-generated-from-beans",
    promptDigest: digest(prompt),
    materialUse: citations.map(({ repository, uuid }) => ({
      repository,
      uuid,
    })),
    citationsDigest: digest(citations),
  };
  return {
    status: "ready_for_generation",
    mode,
    prompt,
    context,
    citations,
    rightsLines: citations.map(
      ({ owner, rights }) =>
        `${owner.name} — ${rights.licenseLabel} (${rights.licenseUrl}); ${rights.changes}; no endorsement.`,
    ),
    disclosure:
      "AI-generated from the cited Beans; this is not publisher wording or endorsement.",
    receipt: { ...receipt, digest: digest(receipt) },
    persistence: { coffee: false, transcript: false, externalToOwned: false },
  };
}

export function brew({ prompt, snapshots, target }) {
  return makeCoffee({ mode: "brew", prompt, snapshots, targets: [target] });
}

export function coffeeChat({ prompt, snapshots, target }) {
  return makeCoffee({
    mode: "coffee-chat",
    prompt,
    snapshots,
    targets: [target],
  });
}

export function coffeeBlend({ prompt, snapshots, targets }) {
  if (!Array.isArray(targets) || targets.length < 2)
    fail(
      "blend_requires_multiple_targets",
      "Coffee Blend requires at least two explicit Roasteries.",
    );
  return makeCoffee({ mode: "coffee-blend", prompt, snapshots, targets });
}

export { CoffeeChatError };
