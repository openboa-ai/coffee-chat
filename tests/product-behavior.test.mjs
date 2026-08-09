import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { digest } from "../src/canonical.mjs";

import {
  acceptInit,
  approveRoast,
  brew,
  coffeeBlend,
  coffeeChat,
  createExternalSync,
  prepareInit,
  prepareRoast,
  syncOwned,
  syncExternal,
  unsync,
} from "../src/index.mjs";
import { createVerifiedAcquisitionBoundary } from "../src/verified-acquisition.mjs";

const commit = "1234567890abcdef1234567890abcdef12345678";
const repository = "https://github.com/example/coffee-chat";
const trustedContract = {
  repository: "https://github.com/openboa-ai/coffee-chat-roastery",
  commit: ["__PENDING", "ROASTERY", "MAIN", "COMMIT__"].join("_"),
  digest:
    "sha256:6cc68d5ecff920235c093922a563e9297fc0e7f073f831070c822c0df56ca151",
};
const hasCode = (error, code) => error.code === code;
const hasZeroWriteCode = (error, code) =>
  error.code === code && error.details.writes === 0;
const hasNoExternalInstall = (error) =>
  error.code === "invalid_snapshot" &&
  error.details.modelContext === 0 &&
  error.details.registryWrites === 0;

const declaration = {
  repository,
  contract: trustedContract,
  owner: { name: "Example Roaster", url: "https://example.com" },
  contentLicense: {
    spdx: "CC-BY-4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  notices: {
    publicBeans: true,
    sharingCommercialAiAdaptations: true,
    attributionLicenseChangesNoEndorsement: true,
    irrevocable: true,
    rightsAuthority: true,
    originExcluded: true,
    aiCoffeeNonAuthorshipNonEndorsement: true,
  },
};

const beans = [
  {
    uuid: "018f47f6-1234-7abc-8abc-1234567890ab",
    title: "Calm technical writing",
    content: "Prefer direct language and state uncertainty.",
    owner: declaration.owner,
  },
];

const beanId = beans[0].uuid;
const beanBytes = `---\nid: ${beanId}\n---\n${beans[0].content}\n`;
const declarationBytes = `${JSON.stringify(
  { repository, contract: trustedContract },
  null,
  2,
)}\n`;
const contentLicenseBytes = `---\nscope: roastery/beans/**\nlicense: CC-BY-4.0\nattribution: "Example Roaster — https://example.com"\n---\n\n# Bean Content License\n\nOfficial license: https://creativecommons.org/licenses/by/4.0/\n`;

function acquisitionBoundary({
  metadataRepository = repository,
  parentRepository = trustedContract.repository,
  visibility = "public",
  acquiredBeanBytes = beanBytes,
  indexedBeanBytes = beanBytes,
  acquiredDeclarationBytes = declarationBytes,
  acquiredContentLicenseBytes = contentLicenseBytes,
  onBeanRead = () => {},
} = {}) {
  const indexedBeanDigest = `sha256:${createHash("sha256")
    .update(indexedBeanBytes)
    .digest("hex")}`;
  const acquiredIndexBytes = `${JSON.stringify(
    { beans: [{ id: beanId, content_digest: indexedBeanDigest }] },
    null,
    2,
  )}\n`;
  return createVerifiedAcquisitionBoundary({
    inspectRepository: async () => ({
      repository: metadataRepository,
      visibility,
      fork: true,
      parentRepository,
      defaultBranch: "main",
      defaultBranchCommit: commit,
    }),
    readCommitFiles: async ({ paths }) => {
      const files = [
        { path: "roastery/roastery.json", bytes: acquiredDeclarationBytes },
        { path: "roastery/index.json", bytes: acquiredIndexBytes },
        {
          path: "roastery/CONTENT_LICENSE.md",
          bytes: acquiredContentLicenseBytes,
        },
        {
          path: `roastery/beans/${beanId}.md`,
          bytes: acquiredBeanBytes,
        },
      ];
      if (!paths || paths.some((path) => path.startsWith("roastery/beans/")))
        onBeanRead();
      return {
        repository: metadataRepository,
        commit,
        files: paths ? files.filter(({ path }) => paths.includes(path)) : files,
      };
    },
  });
}

test("Init requires verified official-fork metadata and binds it into the Preview", async () => {
  await assert.rejects(
    async () => prepareInit({ owner: declaration.owner, repository }),
    (error) => hasZeroWriteCode(error, "verified_fork_required"),
  );
  const boundary = acquisitionBoundary();
  const forkProof = await boundary.verifyFork(repository);
  const preview = prepareInit({
    owner: declaration.owner,
    repository,
    forkProof,
  });
  assert.equal(preview.status, "awaiting_approval");
  assert.equal(preview.contentLicense.spdx, "CC-BY-4.0");
  assert.equal(preview.writes.length, 0);
  assert.equal(preview.forkProof.repository, repository);
  assert.equal(preview.forkProof.parentRepository, trustedContract.repository);
  assert.equal(preview.forkProof.visibility, "public");
  assert.equal(preview.forkProof.defaultBranchCommit, commit);
  assert.match(preview.forkProof.digest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(Object.values(preview.notices).filter(Boolean).length, 7);
  assert.deepEqual(
    Object.keys(JSON.parse(preview.renderedDeclaration)).sort(),
    ["contract", "repository"],
  );
  assert.match(preview.renderedContentLicense, /scope: roastery\/beans\/\*\*/u);
  assert.match(preview.renderedContentLicense, /license: CC-BY-4\.0/u);
  assert.match(
    preview.renderedContentLicense,
    /Attribution: Example Roaster — https:\/\/example\.com/u,
  );

  assert.throws(
    () =>
      acceptInit({
        preview,
        acceptedPreviewDigest: preview.previewDigest,
        rightsAttested: true,
      }),
    (error) => hasZeroWriteCode(error, "contract_pin_pending"),
  );

  const otherRepository = "https://github.com/another/coffee-chat";
  const mismatchedProof = await acquisitionBoundary({
    metadataRepository: otherRepository,
  }).verifyFork(otherRepository);
  assert.throws(
    () =>
      prepareInit({
        owner: declaration.owner,
        repository,
        forkProof: mismatchedProof,
      }),
    (error) => hasZeroWriteCode(error, "verified_fork_mismatch"),
  );

  const { previewDigest: ignoredDigest, ...previewBody } = preview;
  const readyBody = {
    ...previewBody,
    contract: { ...preview.contract, commit },
    renderedDeclaration: `${JSON.stringify(
      {
        repository,
        contract: { ...preview.contract, commit },
      },
      null,
      2,
    )}\n`,
  };
  const readyPreview = { ...readyBody, previewDigest: digest(readyBody) };

  const accepted = acceptInit({
    preview: readyPreview,
    acceptedPreviewDigest: readyPreview.previewDigest,
    rightsAttested: true,
  });
  assert.equal(accepted.status, "approved_write_plan");
  assert.deepEqual(
    accepted.writes.map(({ path }) => path),
    ["roastery/roastery.json", "roastery/CONTENT_LICENSE.md"],
  );
  assert.equal(accepted.delivery, "protected_branch_pull_request");

  const fabricatedBody = structuredClone(readyBody);
  const fabricatedPreview = {
    ...fabricatedBody,
    previewDigest: digest(fabricatedBody),
  };
  assert.throws(
    () =>
      acceptInit({
        preview: fabricatedPreview,
        acceptedPreviewDigest: fabricatedPreview.previewDigest,
        rightsAttested: true,
      }),
    (error) => hasZeroWriteCode(error, "verified_fork_required"),
  );

  assert.throws(
    () =>
      acceptInit({
        preview: readyPreview,
        acceptedPreviewDigest: "sha256:stale",
        rightsAttested: true,
      }),
    (error) => hasZeroWriteCode(error, "stale_preview"),
  );
  assert.throws(
    () =>
      prepareInit({ owner: declaration.owner, repository, license: "CC0-1.0" }),
    (error) => hasCode(error, "unsupported_content_license"),
  );
});

test("external Sync accepts only sealed committed bytes after consent", async () => {
  const secureSync = createExternalSync(acquisitionBoundary());
  await assert.rejects(
    async () =>
      await secureSync({
        consent: false,
        registry: [],
        repository,
      }),
    (error) => hasZeroWriteCode(error, "consent_required"),
  );
  await assert.rejects(
    async () =>
      syncExternal({
        consent: true,
        registry: [],
        repository,
        snapshot: { repository, commit, declaration, beans },
      }),
    (error) => hasZeroWriteCode(error, "verified_acquisition_required"),
  );

  const result = await secureSync({
    consent: true,
    registry: [],
    repository,
  });
  assert.equal(result.relationship.scope, "global");
  assert.equal(result.relationship.readOnly, true);
  assert.equal(result.relationship.commit, commit);
  assert.equal(result.registry.length, 1);
  assert.deepEqual(result.modelContext, [
    { content: `${beans[0].content}\n`, uuid: beanId },
  ]);
  assert.doesNotMatch(
    JSON.stringify(result.modelContext),
    /creativecommons|CONTENT_LICENSE/u,
  );
  assert.equal(result.persistence.copiedIntoOwnedRoastery, false);

  const priorRegistry = [{ id: "prior", repository, commit: "a".repeat(40) }];
  const tamperedSync = createExternalSync(
    acquisitionBoundary({ acquiredBeanBytes: `${beanBytes}tampered\n` }),
  );
  await assert.rejects(
    async () =>
      await tamperedSync({
        consent: true,
        registry: priorRegistry,
        repository,
      }),
    hasNoExternalInstall,
  );

  const privateOriginBytes = `---\nid: ${beanId}\norigins:\n  - https://127.0.0.1/private\n---\nPrivate origin must not validate.\n`;
  const privateOriginSync = createExternalSync(
    acquisitionBoundary({
      acquiredBeanBytes: privateOriginBytes,
      indexedBeanBytes: privateOriginBytes,
    }),
  );
  await assert.rejects(
    async () =>
      await privateOriginSync({
        consent: true,
        registry: priorRegistry,
        repository,
      }),
    hasNoExternalInstall,
  );

  let beanReads = 0;
  const unsupportedLicenseSync = createExternalSync(
    acquisitionBoundary({
      acquiredContentLicenseBytes: contentLicenseBytes.replace(
        "license: CC-BY-4.0",
        "license: CC0-1.0",
      ),
      onBeanRead: () => {
        beanReads += 1;
      },
    }),
  );
  await assert.rejects(
    async () =>
      await unsupportedLicenseSync({
        consent: true,
        registry: priorRegistry,
        repository,
      }),
    (error) => hasCode(error, "unsupported_content_license"),
  );
  assert.equal(beanReads, 0, "license rejection must precede Bean acquisition");

  beanReads = 0;
  const mismatchedContractBytes = `${JSON.stringify(
    {
      repository,
      contract: { ...trustedContract, digest: `sha256:${"0".repeat(64)}` },
    },
    null,
    2,
  )}\n`;
  const mismatchedContractSync = createExternalSync(
    acquisitionBoundary({
      acquiredDeclarationBytes: mismatchedContractBytes,
      onBeanRead: () => {
        beanReads += 1;
      },
    }),
  );
  await assert.rejects(
    async () =>
      await mismatchedContractSync({
        consent: true,
        registry: priorRegistry,
        repository,
      }),
    (error) => hasCode(error, "invalid_contract_pin"),
  );
  assert.equal(
    beanReads,
    0,
    "contract-pin rejection must precede Bean acquisition",
  );
});

test("owned Sync permits only a clean fast-forward plan", () => {
  const remoteCommit = "abcdef1234567890abcdef1234567890abcdef12";
  const result = syncOwned({
    currentCommit: commit,
    remoteCommit,
    clean: true,
    remoteDescendsFromCurrent: true,
  });
  assert.equal(result.status, "fast_forward_plan");
  assert.equal(result.operation, "git_fast_forward_only");
  assert.equal(result.writes.length, 0);
  assert.throws(
    () =>
      syncOwned({
        currentCommit: commit,
        remoteCommit,
        clean: false,
        remoteDescendsFromCurrent: true,
      }),
    (error) => hasZeroWriteCode(error, "owned_roastery_not_clean"),
  );
  assert.throws(
    () =>
      syncOwned({
        currentCommit: commit,
        remoteCommit,
        clean: true,
        remoteDescendsFromCurrent: false,
      }),
    (error) => hasZeroWriteCode(error, "owned_roastery_not_fast_forward"),
  );
});

test("Unsync removes only the exact global relationship and disclaims historical deletion", async () => {
  const synced = await createExternalSync(acquisitionBoundary())({
    consent: true,
    registry: [],
    repository,
  });
  const result = unsync({
    registry: /** @type {any[]} */ (synced.registry),
    id: synced.relationship.id,
  });
  assert.equal(result.registry.length, 0);
  assert.equal(result.removed.id, synced.relationship.id);
  assert.equal(result.deleted.remote, false);
  assert.equal(result.deleted.clone, false);
  assert.equal(result.deleted.hostHistory, false);
  assert.equal(result.deleted.priorLicenseGrant, false);
});

test("Roast stages one owned Bean and cannot authorize writes before exact approval", () => {
  const preview = prepareRoast({
    owned: true,
    bean: { title: "A rule", content: "Show the evidence boundary." },
    owner: declaration.owner,
    timestamp: "2026-08-09T00:00:00.000Z",
    expectedHead: commit,
  });
  assert.equal(preview.status, "awaiting_approval");
  assert.equal(preview.writes.length, 0);
  assert.equal(preview.staging.insideClone, false);
  assert.match(preview.bean.uuid, /^[0-9a-f-]{36}$/u);
  const next = prepareRoast({
    owned: true,
    bean: { title: "A later rule", content: "Preserve monotonic identity." },
    owner: declaration.owner,
    timestamp: "2026-08-09T00:00:00.000Z",
    expectedHead: commit,
    previousUuid: preview.bean.uuid,
  });
  assert.ok(next.bean.uuid > preview.bean.uuid);

  const approved = approveRoast({
    preview,
    acceptedPreviewDigest: preview.previewDigest,
    currentHead: commit,
    distributionRightsAttested: true,
  });
  assert.equal(approved.status, "proposed");
  assert.equal(approved.delivery, "single_branch_pull_request");
  assert.equal(approved.writes.length, 1);
  assert.equal(approved.attestation.head, commit);

  assert.throws(
    () =>
      prepareRoast({
        owned: false,
        bean: { title: "External", content: "Do not copy me." },
        owner: declaration.owner,
        timestamp: "2026-08-09T00:00:00.000Z",
        expectedHead: commit,
      }),
    (error) => hasCode(error, "external_to_owned_persistence_forbidden"),
  );
  assert.throws(
    () =>
      prepareRoast({
        owned: true,
        bean: {
          title: "Mixed",
          content: "Contains attributed third-party material.",
          additionalAttributionRequired: true,
        },
        owner: declaration.owner,
        timestamp: "2026-08-09T00:00:00.000Z",
        expectedHead: commit,
      }),
    (error) => hasCode(error, "unrepresentable_third_party_rights"),
  );
});

test("Brew and Coffee Chat expose only validated Bean context with complete rights receipts", () => {
  const snapshot = { repository, commit, declaration, beans };
  const brewed = brew({
    prompt: "Draft a note",
    snapshots: [snapshot],
    target: repository,
  });
  assert.equal(brewed.receipt.transformation, "ai-generated-from-beans");
  assert.match(brewed.disclosure, /AI-generated/u);
  assert.match(brewed.disclosure, /cited Beans/u);
  assert.match(brewed.disclosure, /not publisher wording or endorsement/u);
  assert.equal(brewed.persistence.coffee, false);
  assert.equal(brewed.citations.length, 1);
  assert.deepEqual(Object.keys(brewed.citations[0].rights).sort(), [
    "attribution",
    "changes",
    "licenseLabel",
    "licenseUrl",
    "noEndorsement",
  ]);
  assert.match(brewed.citations[0].permalink, new RegExp(commit, "u"));

  const chatted = coffeeChat({
    prompt: "Talk this through",
    snapshots: [snapshot],
    target: repository,
  });
  assert.equal(chatted.mode, "coffee-chat");
  assert.deepEqual(chatted.citations, brewed.citations);
});

test("Coffee Blend requires complete owner identity and explicit material-use citations", () => {
  const secondRepository = "https://github.com/another/coffee-chat";
  const second = {
    repository: secondRepository,
    commit: "abcdef1234567890abcdef1234567890abcdef12",
    declaration: {
      ...declaration,
      repository: secondRepository,
      owner: { name: "Another Roaster", url: "https://another.example" },
    },
    beans: [
      {
        uuid: "018f47f6-5678-7abc-8abc-1234567890ab",
        title: "Precise caveats",
        content: "Name what has not been verified.",
        owner: { name: "Another Roaster", url: "https://another.example" },
      },
    ],
  };
  const result = coffeeBlend({
    prompt: "Blend these approaches",
    snapshots: [{ repository, commit, declaration, beans }, second],
    targets: [repository, secondRepository],
  });
  assert.equal(result.mode, "coffee-blend");
  assert.equal(result.citations.length, 2);
  assert.deepEqual(
    result.citations.map(({ owner }) => owner.name),
    ["Example Roaster", "Another Roaster"],
  );

  assert.throws(
    () =>
      coffeeBlend({
        prompt: "Blend",
        snapshots: [
          {
            repository,
            commit,
            declaration: { ...declaration, owner: { name: "" } },
            beans,
          },
          second,
        ],
        targets: [repository, secondRepository],
      }),
    (error) => hasCode(error, "invalid_owner_attribution"),
  );
});
