import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { TextDecoder } from "node:util";

import { digest, normalizeRepository } from "./canonical.mjs";
import {
  LICENSE,
  NOTICE_KEYS,
  validateCommit,
  validateOwner,
} from "./contracts.mjs";
import { fail } from "./errors.mjs";

const OFFICIAL_SEED = "https://github.com/openboa-ai/coffee-chat-roastery";
const TRUSTED_CONTRACT = Object.freeze(
  JSON.parse(
    readFileSync(
      new URL("../config/roastery-contract.json", import.meta.url),
      "utf8",
    ),
  ),
);
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BEAN_PATH =
  /^roastery\/beans\/([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.md$/u;
const utf8 = new TextDecoder("utf-8", { fatal: true });
const verifiedBoundaries = new WeakSet();
const verifiedForkProofs = new WeakSet();
const SPECIAL_HOST_SUFFIXES = [
  "localhost",
  "local",
  "internal",
  "invalid",
  "test",
  "example",
  "home.arpa",
  "onion",
];

/** @returns {never} */
function acquisitionFailure(code, message) {
  fail(code, message, { modelContext: 0, registryWrites: 0, writes: 0 });
}

function normalize(value, code = "invalid_snapshot") {
  try {
    return normalizeRepository(value);
  } catch {
    acquisitionFailure(
      code,
      "Repository metadata is not one canonical public GitHub repository.",
    );
  }
}

function decodeBytes(value, path) {
  let bytes;
  if (typeof value === "string") bytes = Buffer.from(value, "utf8");
  else if (value instanceof Uint8Array) bytes = Buffer.from(value);
  else
    acquisitionFailure(
      "invalid_snapshot",
      `Committed bytes are missing for ${path}.`,
    );
  if (bytes.length > 1024 * 1024)
    acquisitionFailure(
      "invalid_snapshot",
      `Committed file exceeds the bounded byte limit: ${path}.`,
    );
  try {
    return { bytes, source: utf8.decode(bytes) };
  } catch {
    acquisitionFailure(
      "invalid_snapshot",
      `Committed file is not valid UTF-8: ${path}.`,
    );
  }
}

function parseJsonFile(file) {
  try {
    return JSON.parse(file.source);
  } catch {
    acquisitionFailure(
      "invalid_snapshot",
      `Committed JSON is invalid: ${file.path}.`,
    );
  }
}

function exactKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

function parseManifest(file, repository) {
  const value = parseJsonFile(file);
  if (
    !exactKeys(value, ["repository", "contract"]) ||
    !exactKeys(value.contract, ["repository", "commit", "digest"])
  )
    acquisitionFailure(
      "invalid_snapshot",
      "The committed Roastery declaration shape is invalid.",
    );
  if (normalize(value.repository) !== repository)
    acquisitionFailure(
      "identity_mismatch",
      "The committed declaration repository differs from public repository metadata.",
    );
  if (
    value.contract.repository !== TRUSTED_CONTRACT.repository ||
    value.contract.commit !== TRUSTED_CONTRACT.commit ||
    value.contract.digest !== TRUSTED_CONTRACT.bundleDigest
  )
    acquisitionFailure(
      "invalid_contract_pin",
      "The committed declaration does not match the package's trusted contract tuple.",
    );
  return value;
}

function parseIndex(file) {
  const value = parseJsonFile(file);
  if (!exactKeys(value, ["beans"]) || !Array.isArray(value.beans))
    acquisitionFailure(
      "invalid_snapshot",
      "The committed Roastery index shape is invalid.",
    );
  const seen = new Set();
  for (const entry of value.beans) {
    if (
      !exactKeys(entry, ["id", "content_digest"]) ||
      !UUID_V7.test(entry.id) ||
      !/^sha256:[0-9a-f]{64}$/u.test(entry.content_digest) ||
      seen.has(entry.id)
    )
      acquisitionFailure(
        "invalid_snapshot",
        "The committed Roastery index contains an invalid Bean entry.",
      );
    seen.add(entry.id);
  }
  const sorted = [...value.beans].sort((left, right) =>
    Buffer.from(left.id).compare(Buffer.from(right.id)),
  );
  if (JSON.stringify(sorted) !== JSON.stringify(value.beans))
    acquisitionFailure(
      "invalid_snapshot",
      "The committed Roastery index is not bytewise sorted.",
    );
  return value;
}

function parseOwner(file) {
  const match =
    /^---\nscope: roastery\/beans\/\*\*\nlicense: ([^\n]+)\nattribution: ("[^\n]+")\n---\n/u.exec(
      file.source,
    );
  if (!match)
    acquisitionFailure(
      "invalid_content_license",
      "The committed Bean content declaration is malformed.",
    );
  if (match[1] !== LICENSE.spdx)
    acquisitionFailure(
      "unsupported_content_license",
      "Only the fixed CC BY 4.0 Bean license is supported.",
    );
  if (!file.source.includes(`Official license: ${LICENSE.url}`))
    acquisitionFailure(
      "invalid_content_license",
      "The committed Bean content declaration lacks the official license URL.",
    );
  let attribution;
  try {
    attribution = JSON.parse(match[2]);
  } catch {
    acquisitionFailure(
      "invalid_content_license",
      "The committed attribution is malformed.",
    );
  }
  const separator = attribution.lastIndexOf(" — ");
  if (separator <= 0)
    acquisitionFailure(
      "invalid_content_license",
      "The committed attribution lacks an owner URL.",
    );
  try {
    return validateOwner({
      name: attribution.slice(0, separator),
      url: attribution.slice(separator + 3),
    });
  } catch {
    acquisitionFailure(
      "invalid_content_license",
      "The committed owner attribution is invalid.",
    );
  }
}

function isPublicHttpsOrigin(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/u, "");
    const addressLiteral = hostname.replace(/^\[|\]$/gu, "");
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      isIP(addressLiteral) === 0 &&
      hostname.includes(".") &&
      !SPECIAL_HOST_SUFFIXES.some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
      )
    );
  } catch {
    return false;
  }
}

function parseBean(file, expectedId, owner) {
  const pathMatch = BEAN_PATH.exec(file.path);
  if (
    !pathMatch ||
    pathMatch[1] !== expectedId ||
    !file.source.startsWith("---\n") ||
    file.source.includes("\r")
  )
    acquisitionFailure(
      "invalid_snapshot",
      "A committed Bean path or frontmatter is invalid.",
    );
  const boundary = file.source.indexOf("\n---\n", 4);
  if (boundary < 0)
    acquisitionFailure(
      "invalid_snapshot",
      "A committed Bean frontmatter boundary is invalid.",
    );
  const lines = file.source.slice(4, boundary).split("\n");
  if (lines[0] !== `id: ${expectedId}`)
    acquisitionFailure(
      "invalid_snapshot",
      "A committed Bean ID differs from its index entry.",
    );
  if (lines.length > 1) {
    const origins = lines
      .slice(2)
      .map((line) => /^  - (\S.*)$/u.exec(line)?.[1]);
    if (
      lines[1] !== "origins:" ||
      origins.length === 0 ||
      origins.some((origin) => !origin || !isPublicHttpsOrigin(origin)) ||
      new Set(origins).size !== origins.length
    )
      acquisitionFailure(
        "invalid_snapshot",
        "A committed Bean has invalid frontmatter.",
      );
  }
  const content = file.source.slice(boundary + 5);
  if (!content.trim())
    acquisitionFailure("invalid_snapshot", "A committed Bean body is empty.");
  return { uuid: expectedId, content, owner };
}

function verifyMetadata(
  metadata,
  requestedRepository,
  { requireOfficialFork },
) {
  if (!metadata || typeof metadata !== "object")
    acquisitionFailure(
      "repository_verification_failed",
      "Public repository metadata is missing.",
    );
  const repository = normalize(
    metadata.repository,
    "repository_verification_failed",
  );
  if (repository !== requestedRepository || metadata.visibility !== "public")
    acquisitionFailure(
      "repository_verification_failed",
      "Public repository identity or visibility does not match the request.",
    );
  let defaultBranchCommit;
  try {
    defaultBranchCommit = validateCommit(metadata.defaultBranchCommit);
  } catch {
    acquisitionFailure(
      "repository_verification_failed",
      "Default-branch metadata lacks one exact commit.",
    );
  }
  if (!metadata.defaultBranch || typeof metadata.defaultBranch !== "string")
    acquisitionFailure(
      "repository_verification_failed",
      "Default-branch metadata is missing.",
    );
  const parentRepository =
    metadata.parentRepository === undefined
      ? null
      : normalize(metadata.parentRepository, "repository_verification_failed");
  if (
    requireOfficialFork &&
    (metadata.fork !== true || parentRepository !== OFFICIAL_SEED)
  )
    acquisitionFailure(
      "repository_verification_failed",
      "The repository is not a public fork of the official Roastery seed.",
    );
  return {
    repository,
    visibility: metadata.visibility,
    fork: metadata.fork === true,
    parentRepository,
    defaultBranch: metadata.defaultBranch,
    defaultBranchCommit,
  };
}

async function acquireExactFiles({
  readCommitFiles,
  repository,
  commit,
  paths,
}) {
  const acquired = await readCommitFiles({ repository, commit, paths });
  let acquiredCommit;
  try {
    acquiredCommit = validateCommit(acquired?.commit);
  } catch {
    acquisitionFailure(
      "invalid_snapshot",
      "Acquired bytes lack the verified public repository commit.",
    );
  }
  if (
    !acquired ||
    normalize(acquired.repository) !== repository ||
    acquiredCommit !== commit ||
    !Array.isArray(acquired.files) ||
    acquired.files.length !== paths.length
  )
    acquisitionFailure(
      "invalid_snapshot",
      "Acquired bytes do not match the requested public repository commit and paths.",
    );
  const expected = new Set(paths);
  const files = new Map();
  let totalBytes = 0;
  for (const entry of acquired.files) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !expected.has(entry.path) ||
      files.has(entry.path)
    )
      acquisitionFailure(
        "invalid_snapshot",
        "Acquired committed paths are missing, duplicated, or outside the requested set.",
      );
    const decoded = decodeBytes(entry.bytes, entry.path);
    totalBytes += decoded.bytes.length;
    files.set(entry.path, { path: entry.path, ...decoded });
  }
  return { files, totalBytes };
}

export function createVerifiedAcquisitionBoundary({
  inspectRepository,
  readCommitFiles,
}) {
  if (
    typeof inspectRepository !== "function" ||
    typeof readCommitFiles !== "function"
  )
    throw new TypeError(
      "Verified acquisition requires repository-inspection and commit-byte transports.",
    );
  const boundary = Object.freeze({
    async verifyFork(repositoryInput) {
      const repository = normalize(
        repositoryInput,
        "repository_verification_failed",
      );
      const metadata = verifyMetadata(
        await inspectRepository({ repository }),
        repository,
        {
          requireOfficialFork: true,
        },
      );
      const proofBody = {
        kind: "verified_public_official_fork",
        repository: metadata.repository,
        parentRepository: metadata.parentRepository,
        visibility: metadata.visibility,
        defaultBranch: metadata.defaultBranch,
        defaultBranchCommit: metadata.defaultBranchCommit,
      };
      const proof = Object.freeze({ ...proofBody, digest: digest(proofBody) });
      verifiedForkProofs.add(proof);
      return proof;
    },
    async acquireExternal(repositoryInput) {
      const repository = normalize(repositoryInput);
      const metadata = verifyMetadata(
        await inspectRepository({ repository }),
        repository,
        {
          requireOfficialFork: false,
        },
      );
      const metadataPaths = [
        "roastery/roastery.json",
        "roastery/index.json",
        "roastery/CONTENT_LICENSE.md",
      ];
      const metadataAcquisition = await acquireExactFiles({
        readCommitFiles,
        repository,
        commit: metadata.defaultBranchCommit,
        paths: metadataPaths,
      });
      const files = metadataAcquisition.files;
      const manifestFile = files.get("roastery/roastery.json");
      const indexFile = files.get("roastery/index.json");
      const licenseFile = files.get("roastery/CONTENT_LICENSE.md");
      if (!manifestFile || !indexFile || !licenseFile)
        acquisitionFailure(
          "invalid_snapshot",
          "Required committed Roastery files are missing.",
        );
      const manifest = parseManifest(manifestFile, repository);
      const index = parseIndex(indexFile);
      const owner = parseOwner(licenseFile);
      if (index.beans.length > 1000)
        acquisitionFailure(
          "invalid_snapshot",
          "The committed Roastery index exceeds the bounded Bean count.",
        );
      const beanPaths = index.beans.map(
        (entry) => `roastery/beans/${entry.id}.md`,
      );
      const beanAcquisition =
        beanPaths.length === 0
          ? { files: new Map(), totalBytes: 0 }
          : await acquireExactFiles({
              readCommitFiles,
              repository,
              commit: metadata.defaultBranchCommit,
              paths: beanPaths,
            });
      if (
        metadataAcquisition.totalBytes + beanAcquisition.totalBytes >
        10 * 1024 * 1024
      )
        acquisitionFailure(
          "invalid_snapshot",
          "Acquired committed bytes exceed the bounded snapshot limit.",
        );
      for (const [path, file] of beanAcquisition.files) files.set(path, file);
      const beans = index.beans.map((entry) => {
        const path = `roastery/beans/${entry.id}.md`;
        const file = files.get(path);
        if (!file)
          acquisitionFailure(
            "invalid_snapshot",
            `The committed index references a missing Bean: ${entry.id}.`,
          );
        const actualDigest = `sha256:${createHash("sha256").update(file.bytes).digest("hex")}`;
        if (actualDigest !== entry.content_digest)
          acquisitionFailure(
            "invalid_snapshot",
            `The committed Bean digest differs from the index: ${entry.id}.`,
          );
        return parseBean(file, entry.id, owner);
      });
      return {
        repository,
        commit: metadata.defaultBranchCommit,
        declaration: {
          ...manifest,
          owner,
          contentLicense: { spdx: LICENSE.spdx, url: LICENSE.url },
          notices: Object.fromEntries(NOTICE_KEYS.map((key) => [key, true])),
        },
        beans,
        acquisition: {
          repository,
          commit: metadata.defaultBranchCommit,
          fileDigests: [...files.values()]
            .map(({ path, bytes }) => ({
              path,
              digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
            }))
            .sort((left, right) =>
              Buffer.from(left.path).compare(Buffer.from(right.path)),
            ),
        },
      };
    },
  });
  verifiedBoundaries.add(boundary);
  return boundary;
}

export function requireVerifiedForkProof(proof, repository) {
  if (!verifiedForkProofs.has(proof))
    fail(
      "verified_fork_required",
      "Init requires metadata verified by the trusted repository boundary.",
      { writes: 0 },
    );
  const { digest: proofDigest, ...proofBody } = proof;
  if (
    proof.repository !== repository ||
    proof.parentRepository !== OFFICIAL_SEED ||
    proof.visibility !== "public" ||
    proof.kind !== "verified_public_official_fork" ||
    proofDigest !== digest(proofBody)
  )
    fail(
      "verified_fork_mismatch",
      "Verified fork metadata does not match the Init repository.",
      { writes: 0 },
    );
  return proof;
}

export async function acquireVerifiedExternal(boundary, repository) {
  if (!verifiedBoundaries.has(boundary))
    acquisitionFailure(
      "verified_acquisition_required",
      "External Sync requires the sealed verified-acquisition boundary.",
    );
  return boundary.acquireExternal(repository);
}
