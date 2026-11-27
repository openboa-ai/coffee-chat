import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  addToShelf,
  approveOAuthAuthorization,
  canonicalizeJcs,
  CoffeeChatError,
  comparePerspectives,
  computeJcsDigest,
  computePkceS256,
  createDatabase,
  type DatabaseHandle,
  deleteBean,
  ensureUser,
  exchangeAuthorizationCode,
  exportUserBeans,
  getBean,
  getPersonalInsights,
  getPersonProfile,
  getSourceCompare,
  getViewerStanceForOrigin,
  linkProviderAccount,
  listBeans,
  listBeansPage,
  listHydratedShelfRefs,
  listPublicPeoplePage,
  listPublicSourcesPage,
  listShelf,
  normalizeOriginUrl,
  prepareBean,
  refreshOAuthToken,
  registerOAuthClientCimd,
  registerOAuthClientDcr,
  revokeUserGrant,
  saveBean,
  SCHEMA_DDL,
  setBeanVisibility,
  splitSqlStatements,
  unlinkProviderAccount,
  verifyAccessToken,
} from "../src/index.js";

describe("RFC 8785 JCS & URL normalization", () => {
  it("produces deterministic RFC 8785 JCS output and SHA-256 test vectors", () => {
    const a = { b: 1, a: [true, null, "hi"], c: { z: -0, y: 2 } };
    const b = { c: { y: 2, z: 0 }, a: [true, null, "hi"], b: 1 };
    expect(canonicalizeJcs(a)).toBe('{"a":[true,null,"hi"],"b":1,"c":{"y":2,"z":0}}');
    expect(computeJcsDigest(a).digest).toBe(computeJcsDigest(b).digest);
  });

  it("normalizes HTTP(S) URLs, extracts fragment locator, and rejects credentials", () => {
    const res = normalizeOriginUrl("HTTPS://Example.COM:443/post?a=1&b=2#section-3");
    expect(res.normalizedUrl).toBe("https://example.com/post?a=1&b=2");
    expect(res.fragmentLocator).toBe("section-3");

    expect(() => normalizeOriginUrl("https://user:pass@example.com/p")).toThrow(
      CoffeeChatError,
    );
    expect(() => normalizeOriginUrl("javascript:alert(1)")).toThrow(CoffeeChatError);
  });
});

describe("Core domain, privacy, concurrency, and OAuth 2.1 invariants (PGlite)", () => {
  let handle: DatabaseHandle;
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    handle = await createDatabase();
    const alice = await ensureUser(handle.db, {
      handle: "alice",
      name: "Alice Park",
      email: "alice@example.test",
      providerId: "github",
      providerAccountId: "gh-alice",
    });
    const bob = await ensureUser(handle.db, {
      handle: "bob",
      name: "Bob Kim",
      email: "bob@example.test",
      providerId: "google",
      providerAccountId: "gg-bob",
    });
    aliceId = alice.id;
    bobId = bob.id;
  });

  afterEach(async () => {
    await handle.close();
  });

  it("defaults every Bean to private, enforces JCS digest, idempotency, and optimistic locking", async () => {
    const prepared = await prepareBean(handle.db, aliceId, {
      title: "Prefer small reversible experiments",
      take: "Fast feedback beats upfront speculation when reversibility is high.",
      tradeoff: "Ship a small reversible probe even if polish is incomplete.",
      boundary: "Do not apply to irreversible schema or security boundary changes.",
      tags: ["Product", "Experimentation"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://EXAMPLE.com:443/articles/shipping#para-2",
          sourceTitle: "Shipping Fast",
          quotation: "Reversible decisions should optimize for learning speed.",
        },
      ],
    });

    // Default visibility is strictly private.
    expect(prepared.canonicalPayload.visibility).toBe("private");
    expect(prepared.canonicalPayload.origins[0]?.url).toBe(
      "https://example.com/articles/shipping",
    );
    expect(prepared.canonicalPayload.origins[0]?.locator).toBe("para-2");

    // prepare_bean wrote nothing to DB.
    expect(await listBeans(handle.db, aliceId, { scope: "mine" })).toHaveLength(0);

    // Tampered payload fails DIGEST_MISMATCH.
    await expect(
      saveBean(handle.db, aliceId, {
        ...prepared.canonicalPayload,
        title: "Tampered title",
        digest: prepared.digest,
        operationKey: prepared.operationKey,
      }),
    ).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    // Valid save persists version 1, revision 1.
    const saved = await saveBean(handle.db, aliceId, {
      ...prepared.canonicalPayload,
      digest: prepared.digest,
      operationKey: prepared.operationKey,
    });
    expect(saved.replayed).toBe(false);
    expect(saved.bean.visibility).toBe("private");
    expect(saved.bean.version).toBe(1);
    expect(saved.bean.revisionNumber).toBe(1);

    // Exact replay with same operationKey returns idempotently without duplicating.
    const replayed = await saveBean(handle.db, aliceId, {
      ...prepared.canonicalPayload,
      digest: prepared.digest,
      operationKey: prepared.operationKey,
    });
    expect(replayed.replayed).toBe(true);
    expect(replayed.bean.id).toBe(saved.bean.id);
    expect(await listBeans(handle.db, aliceId, { scope: "mine" })).toHaveLength(1);

    // Reusing operationKey with a different payload fails IDEMPOTENCY_CONFLICT.
    await expect(
      saveBean(handle.db, aliceId, {
        ...prepared.canonicalPayload,
        title: "Different title",
        digest: prepared.digest,
        operationKey: prepared.operationKey,
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    // Publish Bean -> version 2; then privatize -> version 3.
    const pub = await setBeanVisibility(handle.db, aliceId, {
      beanId: saved.bean.id,
      visibility: "public",
      expectedVersion: 1,
      operationKey: "vis-1",
    });
    expect(pub.bean.version).toBe(2);
    expect(pub.bean.visibility).toBe("public");

    const priv = await setBeanVisibility(handle.db, aliceId, {
      beanId: saved.bean.id,
      visibility: "private",
      expectedVersion: 2,
      operationKey: "vis-2",
    });
    expect(priv.bean.version).toBe(3);
    expect(priv.bean.visibility).toBe("private");

    // Stale expectedVersion=2 cannot re-publish a newly privatized Bean!
    await expect(
      setBeanVisibility(handle.db, aliceId, {
        beanId: saved.bean.id,
        visibility: "public",
        expectedVersion: 2,
        operationKey: "vis-stale",
      }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    // Delete Bean and ensure replay of prior create operationKey never resurrects it.
    const del = await deleteBean(handle.db, aliceId, {
      beanId: saved.bean.id,
      expectedVersion: 3,
      operationKey: "del-1",
    });
    expect(del.deleted).toBe(true);
    expect(await listBeans(handle.db, aliceId, { scope: "mine" })).toHaveLength(0);

    await expect(
      saveBean(handle.db, aliceId, {
        ...prepared.canonicalPayload,
        digest: prepared.digest,
        operationKey: prepared.operationKey,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enforces work_episode redaction guard, public/private counts, and zero graph/source leakage", async () => {
    // Private work_episode Bean
    const workPrep = await prepareBean(handle.db, aliceId, {
      title: "Prefer explicit contracts over implicit magic",
      take: "Caught an agent silently inventing fallback behavior during refactor.",
      tradeoff: "Choose explicit failure over silent convenience.",
      boundary: "Applies to persistence and auth paths; UI polish can use defaults.",
      origins: [
        {
          kind: "work_episode",
          episodeSummary: "Corrected code review where fallback hid auth errors.",
        },
      ],
    });
    const workSaved = await saveBean(handle.db, aliceId, {
      ...workPrep.canonicalPayload,
      digest: workPrep.digest,
      operationKey: workPrep.operationKey,
    });

    // Attempting to publish a work_episode without redactionConfirmed fails.
    await expect(
      setBeanVisibility(handle.db, aliceId, {
        beanId: workSaved.bean.id,
        visibility: "public",
        expectedVersion: 1,
        operationKey: "pub-work-fail",
      }),
    ).rejects.toMatchObject({ code: "REDACTION_REQUIRED" });

    // Also create a private URL Bean to verify private-only URL isolation.
    const privUrlPrep = await prepareBean(handle.db, aliceId, {
      title: "Private internal RFC notes",
      take: "Keep internal architecture notes private.",
      tradeoff: "Confidentiality over open discussion.",
      boundary: "Internal only.",
      origins: [
        {
          kind: "source_excerpt",
          url: "https://internal.example.com/secret-rfc",
          sourceTitle: "Secret RFC",
        },
      ],
    });
    const privUrlSaved = await saveBean(handle.db, aliceId, {
      ...privUrlPrep.canonicalPayload,
      digest: privUrlPrep.digest,
      operationKey: privUrlPrep.operationKey,
    });

    // Public Bean that refines the private work_episode Bean!
    const pubPrep = await prepareBean(handle.db, aliceId, {
      title: "Reliability before velocity on auth paths",
      take: "Never cut corners on authentication invariants.",
      tradeoff: "Slower shipping over ambiguous authorization state.",
      boundary: "All auth and payment endpoints.",
      visibility: "public",
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/auth-checklist",
          sourceTitle: "Auth Checklist",
        },
      ],
      relations: [
        {
          toBeanId: workSaved.bean.id,
          kind: "refines",
          note: "Derived from private work correction",
        },
      ],
    });
    const pubSaved = await saveBean(handle.db, aliceId, {
      ...pubPrep.canonicalPayload,
      digest: pubPrep.digest,
      operationKey: pubPrep.operationKey,
    });

    // Owner sees relation to private Bean; Bob (non-owner) sees ZERO leaked edges.
    const ownerView = await getBean(handle.db, aliceId, pubSaved.bean.id);
    expect(ownerView.relations).toHaveLength(1);
    const bobView = await getBean(handle.db, bobId, pubSaved.bean.id);
    expect(bobView.relations).toHaveLength(0);
    expect(bobView.revisions).toBeUndefined();

    // Bob gets 404 on Alice's private Bean ID and private-only URL source.
    await expect(getBean(handle.db, bobId, workSaved.bean.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      getSourceCompare(handle.db, "https://internal.example.com/secret-rfc"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Person Page publicly exposes exact aggregate counts (1 public, 2 private)
    // while returning ONLY the 1 public Bean and zero private content/edges!
    const profile = await getPersonProfile(handle.db, bobId, "alice");
    expect(profile.publicCount).toBe(1);
    expect(profile.privateCount).toBe(2);
    expect(profile.publicBeans).toHaveLength(1);
    expect(profile.publicBeans[0]?.id).toBe(pubSaved.bean.id);
    expect(profile.publicBeans[0]?.relations).toHaveLength(0);

    // Shelf live-reference check: Bob saves Alice's public Bean -> visible; Alice privatizes -> vanishes immediately!
    await addToShelf(handle.db, bobId, {
      targetType: "bean",
      beanId: pubSaved.bean.id,
    });
    expect(await listShelf(handle.db, bobId)).toHaveLength(1);

    await setBeanVisibility(handle.db, aliceId, {
      beanId: pubSaved.bean.id,
      visibility: "private",
      expectedVersion: 1,
      operationKey: "alice-privatize",
    });
    expect(await listShelf(handle.db, bobId)).toHaveLength(0);

    // Export includes only Alice's Beans (3 total).
    const exportedJson = await exportUserBeans(handle.db, aliceId, "json");
    expect(JSON.parse(exportedJson.body).count).toBe(3);
    const exportedMd = await exportUserBeans(handle.db, aliceId, "markdown");
    expect(exportedMd.body).toContain("Reliability before velocity");
    expect(privUrlSaved.bean.visibility).toBe("private");
  });

  it("compares A vs B public perspectives on the same URL and supports full-text search", async () => {
    const sharedUrl = "https://example.com/monolith-vs-microservices";

    const aPrep = await prepareBean(handle.db, aliceId, {
      title: "Start modular monolith",
      take: "Keep deployment topology simple until team scaling demands splits.",
      tradeoff: "Single deploy simplicity over independent team deploys.",
      boundary: "Teams under 30 engineers.",
      visibility: "public",
      origins: [{ kind: "source_excerpt", url: sharedUrl, quotation: "Network boundaries are expensive." }],
    });
    await saveBean(handle.db, aliceId, {
      ...aPrep.canonicalPayload,
      digest: aPrep.digest,
      operationKey: aPrep.operationKey,
    });

    const bPrep = await prepareBean(handle.db, bobId, {
      title: "Isolate high-risk services early",
      take: "Security and blast-radius boundaries justify service isolation early.",
      tradeoff: "Strict blast-radius isolation over simpler local debugging.",
      boundary: "Financial or PII-handling subsystems.",
      visibility: "public",
      origins: [{ kind: "source_excerpt", url: sharedUrl, quotation: "Blast radius dictates boundaries." }],
    });
    await saveBean(handle.db, bobId, {
      ...bPrep.canonicalPayload,
      digest: bPrep.digest,
      operationKey: bPrep.operationKey,
    });

    const comparison = await comparePerspectives(handle.db, null, { url: sharedUrl });
    expect(comparison.perspectives).toHaveLength(2);

    const fts = await listBeans(handle.db, null, {
      scope: "public",
      query: "blast-radius",
    });
    expect(fts).toHaveLength(1);
    expect(fts[0]?.ownerHandle).toBe("bob");
  });

  it("enforces OAuth 2.1 PKCE, CIMD SSRF guard, instant grant revocation, and non-revival on re-consent", async () => {
    // SSRF guard rejects private/local CIMD URLs.
    await expect(
      registerOAuthClientCimd(handle.db, {
        clientIdUrl: "https://127.0.0.1/client.json",
        clientName: "Bad",
        redirectUris: ["http://127.0.0.1:4321/cb"],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    // Valid DCR client + PKCE S256 flow.
    const client = await registerOAuthClientDcr(handle.db, {
      clientName: "Codex CLI",
      redirectUris: ["http://127.0.0.1:4321/callback"],
    });
    const verifier = "verifier-secret-string-with-enough-entropy-for-pkce-s256";
    const challenge = computePkceS256(verifier);
    const resource = "http://localhost:3000/api/mcp";

    const { code, grantId } = await approveOAuthAuthorization(handle.db, {
      userId: aliceId,
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:4321/callback",
      resource,
      scopes: ["beans:read", "beans:write", "offline_access"],
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    });

    // Wrong verifier fails.
    await expect(
      exchangeAuthorizationCode(handle.db, {
        code,
        clientId: client.client_id,
        redirectUri: "http://127.0.0.1:4321/callback",
        codeVerifier: "wrong-verifier-value-that-does-not-match-challenge",
        resource,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // Valid verifier succeeds.
    const tokens = await exchangeAuthorizationCode(handle.db, {
      code,
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:4321/callback",
      codeVerifier: verifier,
      resource,
    });
    expect(tokens.access_token).toMatch(/^cc_at_/);
    expect(tokens.refresh_token).toMatch(/^cc_rt_/);

    // Uncached introspection succeeds for matching resource & scope.
    const principal = await verifyAccessToken(
      handle.db,
      tokens.access_token,
      resource,
      "beans:write",
    );
    expect(principal.userId).toBe(aliceId);

    // Refresh works before revocation.
    const rotated = await refreshOAuthToken(handle.db, {
      refreshToken: tokens.refresh_token!,
      clientId: client.client_id,
      resource,
    });
    expect(rotated.access_token).not.toBe(tokens.access_token);

    // Revoke grant -> both access AND refresh fail immediately!
    await revokeUserGrant(handle.db, aliceId, grantId);

    await expect(
      verifyAccessToken(handle.db, rotated.access_token, resource, "beans:read"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      refreshOAuthToken(handle.db, {
        refreshToken: rotated.refresh_token!,
        clientId: client.client_id,
        resource,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    // Re-consent creates a NEW grantId and NEVER revives old revoked tokens!
    const reconsent = await approveOAuthAuthorization(handle.db, {
      userId: aliceId,
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:4321/callback",
      resource,
      scopes: ["beans:read"],
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    });
    expect(reconsent.grantId).not.toBe(grantId);
    await expect(
      verifyAccessToken(handle.db, rotated.access_token, resource, "beans:read"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("enforces explicit provider linking and refuses unlinking the last login method", async () => {
    // Linking Google to Alice succeeds without overwriting handle/name.
    const linked = await linkProviderAccount(handle.db, aliceId, "google", "gg-alice");
    expect(linked.providerId).toBe("google");

    // Trying to link Bob's already-owned Google identity to Alice fails 409.
    await expect(
      linkProviderAccount(handle.db, aliceId, "google", "gg-bob"),
    ).rejects.toMatchObject({ code: "ACCOUNT_ALREADY_LINKED" });

    // Unlinking one of two providers succeeds.
    await expect(
      unlinkProviderAccount(handle.db, aliceId, linked.id),
    ).resolves.toEqual({ unlinked: true });

    // Unlinking Bob's ONLY provider fails LAST_LOGIN_METHOD.
    const bobAccount = await linkProviderAccount(handle.db, bobId, "google", "gg-bob");
    await expect(
      unlinkProviderAccount(handle.db, bobId, bobAccount.id),
    ).rejects.toMatchObject({ code: "LAST_LOGIN_METHOD" });
  });

  it("computes deterministic Personal Insights (Tasting Notes) with mutually exclusive lifecycle, non-exclusive originMix, and live shelfCount", async () => {
    // 1) Multi-origin Bean (BOTH source_excerpt AND work_episode) -> ui_attested, private
    const b1Prep = await prepareBean(handle.db, aliceId, {
      title: "Synthesize architecture docs with incident learnings",
      take: "Reading and production calls both matter.",
      tradeoff: "Favor explicit boundaries over convenience.",
      boundary: "Not for throwaway scripts.",
      tags: ["architecture", "reliability"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/essay-a#intro",
          sourceTitle: "Essay A",
          quotation: "Explicit boundaries compound.",
        },
        {
          kind: "work_episode",
          episodeSummary: "Postmortem on silent retry storm.",
        },
      ],
    });
    const b1 = await saveBean(handle.db, aliceId, {
      ...b1Prep.canonicalPayload,
      digest: b1Prep.digest,
      operationKey: b1Prep.operationKey,
      attestationKind: "ui_attested",
    });

    // Update b1 to revision 2 so revisionCount tracks immutable history
    const b1v2Prep = await prepareBean(handle.db, aliceId, {
      beanId: b1.bean.id,
      expectedVersion: b1.bean.version,
      title: "Synthesize architecture docs with incident learnings (v2)",
      take: "Reading and production calls both matter even more at scale.",
      tradeoff: "Favor explicit boundaries over convenience.",
      boundary: "Not for throwaway scripts.",
      tags: ["architecture", "reliability"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/essay-a",
          sourceTitle: "Essay A",
        },
        {
          kind: "work_episode",
          episodeSummary: "Postmortem on silent retry storm.",
        },
      ],
    });
    const b1v2 = await saveBean(handle.db, aliceId, {
      ...b1v2Prep.canonicalPayload,
      digest: b1v2Prep.digest,
      operationKey: b1v2Prep.operationKey,
      attestationKind: "agent_attested",
    });

    // 2) Public reading Bean that has BOTH tension with b1 AND gets superseded by b3
    const b2Prep = await prepareBean(handle.db, aliceId, {
      title: "Ship fast with minimal ceremony",
      take: "Move fast early.",
      tradeoff: "Speed over upfront review.",
      boundary: "Pre-PMF prototypes only.",
      visibility: "public",
      tags: ["product", "architecture"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/essay-a",
          sourceTitle: "Essay A",
        },
      ],
      relations: [{ toBeanId: b1v2.bean.id, kind: "tensions_with", note: "speed vs rigor" }],
    });
    const b2 = await saveBean(handle.db, aliceId, {
      ...b2Prep.canonicalPayload,
      digest: b2Prep.digest,
      operationKey: b2Prep.operationKey,
      attestationKind: "ui_attested",
    });

    // 3) Private Bean superseding b2 (so b2 is BOTH superseded AND in_tension -> MUST count as superseded only!)
    const b3Prep = await prepareBean(handle.db, aliceId, {
      title: "Stage-gated shipping beats blanket speed",
      take: "Keep prototypes fast, gate shared state.",
      tradeoff: "Clear risk tiers over one-size speed.",
      boundary: "Teams with shared production data.",
      tags: ["product"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/essay-b",
          sourceTitle: "Essay B",
        },
      ],
      relations: [{ toBeanId: b2.bean.id, kind: "supersedes", note: "evolved view" }],
    });
    const b3 = await saveBean(handle.db, aliceId, {
      ...b3Prep.canonicalPayload,
      digest: b3Prep.digest,
      operationKey: b3Prep.operationKey,
      attestationKind: "agent_attested",
    });

    // Bob publishes a Bean and Alice saves it to Shelf
    const bobPrep = await prepareBean(handle.db, bobId, {
      title: "Bob public note on Essay A",
      take: "Bob takes a different angle.",
      tradeoff: "Clarity over brevity.",
      boundary: "Public RFCs.",
      visibility: "public",
      tags: ["writing"],
      origins: [
        {
          kind: "source_excerpt",
          url: "https://example.com/essay-a",
          sourceTitle: "Essay A",
        },
      ],
    });
    const bobSaved = await saveBean(handle.db, bobId, {
      ...bobPrep.canonicalPayload,
      digest: bobPrep.digest,
      operationKey: bobPrep.operationKey,
    });
    const shelfEntry = await addToShelf(handle.db, aliceId, {
      targetType: "bean",
      beanId: bobSaved.bean.id,
    });
    expect(shelfEntry.bean?.firstSourceOriginId).toBeTruthy();

    // Grant Alice an active OAuth grant
    const client = await registerOAuthClientDcr(handle.db, {
      clientName: "Codex CLI",
      redirectUris: ["http://127.0.0.1:4321/cb"],
    });
    const grant = await approveOAuthAuthorization(handle.db, {
      userId: aliceId,
      clientId: client.client_id,
      redirectUri: "http://127.0.0.1:4321/cb",
      resource: "http://127.0.0.1:3000/api/mcp",
      scopes: ["beans:read"],
      codeChallenge: computePkceS256("v".repeat(48)),
      codeChallengeMethod: "S256",
    });

    const insights = await getPersonalInsights(handle.db, aliceId);
    expect(insights.totalCount).toBe(3);
    expect(insights.publicCount).toBe(1);
    expect(insights.privateCount).toBe(2);
    // Multi-origin b1 increments BOTH readingCount and workCount!
    expect(insights.originMix.readingCount).toBe(3);
    expect(insights.originMix.workCount).toBe(1);
    expect(insights.originMix.uniqueSourceUrlCount).toBe(2);
    // Current revision attestations: b1v2=agent, b2=ui, b3=agent
    expect(insights.captureMix.agentAttestedCount).toBe(2);
    expect(insights.captureMix.uiAttestedCount).toBe(1);
    // Mutually exclusive lifecycle: b2=superseded (even though also in tension), b1=in_tension, b3=active
    expect(insights.lifecycle).toEqual({
      activeCount: 1,
      inTensionCount: 1,
      supersededCount: 1,
    });
    expect(
      insights.lifecycle.activeCount +
        insights.lifecycle.inTensionCount +
        insights.lifecycle.supersededCount,
    ).toBe(insights.totalCount);
    // b1 had 2 revisions + b2 (1) + b3 (1) = 4
    expect(insights.revisionCount).toBe(4);
    expect(insights.relationCounts).toEqual({
      supersedes: 1,
      refines: 0,
      tensionsWith: 1,
    });
    expect(insights.topTags[0]).toEqual({ tag: "architecture", count: 2 });
    expect(insights.activeGrantCount).toBe(1);
    expect(insights.shelfCount).toBe(1);
    expect(insights.monthlyActivity.length).toBeGreaterThanOrEqual(1);

    // Live Shelf & Grant revocation update insights immediately
    await setBeanVisibility(handle.db, bobId, {
      beanId: bobSaved.bean.id,
      visibility: "private",
      expectedVersion: bobSaved.bean.version,
      operationKey: "bob-priv-1",
    });
    await revokeUserGrant(handle.db, aliceId, grant.grantId);

    const updatedInsights = await getPersonalInsights(handle.db, aliceId);
    expect(updatedInsights.shelfCount).toBe(0);
    expect(updatedInsights.activeGrantCount).toBe(0);

    // Non-owner lifecycleState privacy guard:
    // b2 is public, superseded by private b3 and in tension with private b1.
    // Owner sees b2 under superseded; non-owner Bob must NEVER infer private relations!
    const aliceSuperseded = await listBeansPage(handle.db, aliceId, {
      scope: "mine",
      lifecycleState: "superseded",
    });
    expect(aliceSuperseded.items.map((x) => x.id)).toEqual([b2.bean.id]);

    const bobPublicSuperseded = await listBeansPage(handle.db, bobId, {
      scope: "public",
      lifecycleState: "superseded",
    });
    expect(bobPublicSuperseded.items).toHaveLength(0);

    const bobPublicTension = await listBeansPage(handle.db, bobId, {
      scope: "public",
      lifecycleState: "in_tension",
    });
    expect(bobPublicTension.items).toHaveLength(0);

    const bobPublicActive = await listBeansPage(handle.db, bobId, {
      scope: "public",
      lifecycleState: "active",
    });
    expect(bobPublicActive.items.map((x) => x.id)).toEqual([b2.bean.id]);

    // Also verify all_accessible non-owned rows never leak private relations
    const bobAllSuperseded = await listBeansPage(handle.db, bobId, {
      scope: "all_accessible",
      lifecycleState: "superseded",
    });
    expect(bobAllSuperseded.items).toHaveLength(0);

    // Pagination accuracy on listBeansPage
    const page1 = await listBeansPage(handle.db, aliceId, {
      scope: "mine",
      limit: 2,
      offset: 0,
    });
    expect(page1.totalCount).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    const page2 = await listBeansPage(handle.db, aliceId, {
      scope: "mine",
      limit: 2,
      offset: 2,
    });
    expect(page2.totalCount).toBe(3);
    expect(page2.items).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    // originKind filter works for multi-origin beans
    const workOnly = await listBeansPage(handle.db, aliceId, {
      scope: "mine",
      originKind: "work_episode",
    });
    expect(workOnly.items.map((x) => x.id)).toEqual([b1v2.bean.id]);

    // getViewerStanceForOrigin null guard + owner-private stance + private-only 404 invariant
    const publicSource = await getSourceCompare(handle.db, "https://example.com/essay-a");
    expect(await getViewerStanceForOrigin(handle.db, null, publicSource.originId)).toBeNull();
    expect(await getViewerStanceForOrigin(handle.db, undefined, publicSource.originId)).toBeNull();
    expect(await getViewerStanceForOrigin(handle.db, "   ", publicSource.originId)).toBeNull();

    const aliceStance = await getViewerStanceForOrigin(
      handle.db,
      aliceId,
      publicSource.originId,
    );
    expect(aliceStance?.map((b) => b.id).sort()).toEqual(
      [b1v2.bean.id, b2.bean.id].sort(),
    );

    // Private-only URL (essay-b) STILL throws 404 on getSourceCompare!
    await expect(
      getSourceCompare(handle.db, "https://example.com/essay-b"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Public search/pagination helpers never leak private tags or private-only sources
    const sourcesPage = await listPublicSourcesPage(handle.db, {
      query: "essay-b",
    });
    expect(sourcesPage.totalCount).toBe(0);

    const sourcesFound = await listPublicSourcesPage(handle.db, {
      query: "essay-a",
      tag: "product",
    });
    expect(sourcesFound.totalCount).toBe(1);
    expect(sourcesFound.items[0]?.tags).toContain("product");
    expect(sourcesFound.items[0]?.tags).not.toContain("reliability"); // private-only tag!

    const peopleFound = await listPublicPeoplePage(handle.db, {
      tag: "reliability", // only on Alice's private Bean!
    });
    expect(peopleFound.totalCount).toBe(0);

    // listHydratedShelfRefs drops privatized targets and returns exact shelfItemId for active ones
    expect(await listHydratedShelfRefs(handle.db, aliceId)).toHaveLength(0);
    const savedPerson = await addToShelf(handle.db, aliceId, {
      targetType: "person",
      handle: "bob",
    });
    const hydrated = await listHydratedShelfRefs(handle.db, aliceId);
    expect(hydrated).toEqual([
      {
        targetType: "person",
        targetId: bobId,
        shelfItemId: savedPerson.id,
      },
    ]);
    // Keep unused reference check clean
    expect(b3.bean.id).toBeTruthy();
  });

  it("creates Neon Pool driver supporting interactive transactions and installs all hot-path indexes", async () => {
    const statements = splitSqlStatements(SCHEMA_DDL);
    expect(statements.length).toBeGreaterThanOrEqual(25);
    expect(statements.every((s) => !s.endsWith(";"))).toBe(true);

    const idxResult = await handle.db.execute(
      sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const indexNames = new Set(
      ((idxResult as unknown as { rows?: Array<{ indexname: string }> }).rows ?? []).map(
        (r) => r.indexname,
      ),
    );
    for (const expectedIndex of [
      "sessions_user_idx",
      "accounts_user_idx",
      "beans_visibility_updated_idx",
      "beans_owner_updated_idx",
      "bean_relations_to_bean_idx",
      "shelf_items_user_target_bean_idx",
      "shelf_items_user_target_user_idx",
      "oauth_grants_user_active_idx",
    ]) {
      expect(indexNames.has(expectedIndex), `missing index ${expectedIndex}`).toBe(true);
    }

    // Verify Neon Pool driver wiring without making an external network connection.
    const neonHandle = await createDatabase({
      databaseUrl: "postgresql://user:pass@ep-demo.us-east-2.aws.neon.tech/neondb?sslmode=require",
    });
    expect(neonHandle.driver).toBe("neon");
    expect(typeof neonHandle.db.transaction).toBe("function");
    await neonHandle.close();
  });
});
