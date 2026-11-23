import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  getPersonProfile,
  getSourceCompare,
  linkProviderAccount,
  listBeans,
  listShelf,
  normalizeOriginUrl,
  prepareBean,
  refreshOAuthToken,
  registerOAuthClientCimd,
  registerOAuthClientDcr,
  revokeUserGrant,
  saveBean,
  setBeanVisibility,
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
});
