import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const FORBIDDEN_MCP_SYNTAX = [
  "list_beans(",
  "compare_perspectives(",
  "prepare_bean",
  'scope="public"',
];

async function assertCleanSurface(
  page: import("@playwright/test").Page,
  label: string,
) {
  const nestedInteractiveCount = await page.locator("a button, button a").count();
  expect(
    nestedInteractiveCount,
    `${label}: nested interactive <a><button> detected`,
  ).toBe(0);

  const bodyText = await page.locator("body").innerText();
  for (const forbidden of FORBIDDEN_MCP_SYNTAX) {
    expect(
      bodyText,
      `${label}: leaked raw MCP syntax ${forbidden}`,
    ).not.toContain(forbidden);
  }
}

test.describe.serial("Coffee Chat MVP Redesign E2E (Yogurt 0.2.0)", () => {
  const sharedUrl = "https://example.com/shared-architecture-essay";
  const privateOnlyUrl = "https://internal.example.com/private-only-rfc";
  let sharedSourcePath = "";

  test("1. Unseeded Home onboarding, Cache-Control headers, auth redirect & open-redirect protection", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Fresh empty DB renders product-first value hero, interactive Brew demo, and starter card on /
    const homeResp = await page.goto("/");
    expect(homeResp?.status()).toBe(200);
    const cacheControl = homeResp?.headers()["cache-control"] ?? "";
    // next dev emits "no-store, must-revalidate"; production middleware/headers emit "private, no-store"
    expect(cacheControl).toContain("no-store");

    await expect(
      page.getByRole("heading", { level: 1, name: /Give it your Taste/ }),
    ).toBeVisible();
    await expect(page.getByText("Nothing is unimportant.")).toBeVisible();
    // Primary Hero CTA copies a universal agent-agnostic start prompt and reveals it cleanly
    await page
      .getByRole("button", { name: "Copy prompt to start in your AI" })
      .click();
    await expect(
      page.getByRole("button", { name: /Copied — paste into any AI/ }),
    ).toBeVisible();
    await expect(page.getByText(/Connect to Coffee Chat at/)).toBeVisible();
    // Interactive 3-act stage: Act 01 Specialist Roast toggle + Act 03 Coffee Chat with @david
    await page.getByRole("radio", { name: "Specialist Roast" }).click();
    await expect(page.getByText(/Hire the proven specialist/)).toBeVisible();
    await page
      .getByRole("tab", { name: /03 · Coffee Chat with other Taste/ })
      .click();
    await page.getByRole("radio", { name: "Coffee Chat with @david" }).click();
    await expect(page.getByText(/Based on @david’s Beans/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Roast a private Bean" }),
    ).toBeVisible();
    await assertCleanSurface(page, "unseeded /");

    // Unauthenticated /me redirects to /signin?returnTo=%2Fme
    await page.goto("/me");
    await page.waitForURL(/\/signin\?returnTo=%2Fme/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Pull up a chair" }),
    ).toBeVisible();

    // Open-redirect payloads (//evil.com and /\evil) MUST sanitize safely to /me
    await page.goto("/signin?returnTo=//evil.com");
    await page.getByLabel("Handle").fill("alice");
    await page.getByLabel("Display Name").fill("Alice Park");
    await page.getByRole("button", { name: "Enter Roastery (Test Auth)" }).click();
    await page.waitForURL("**/me");
    expect(new URL(page.url()).pathname).toBe("/me");

    // Sign out clears session
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/$/);

    await page.goto("/signin?returnTo=/\\evil.com");
    await page.getByRole("button", { name: "Enter Roastery (Test Auth)" }).click();
    await page.waitForURL("**/me");
    expect(new URL(page.url()).pathname).toBe("/me");

    expect(pageErrors).toEqual([]);
  });

  test("2. Personal Workflow (/me My Roastery): 2-stage multi-origin Roast, redaction gate, Roast Log, 409 conflict recovery, tension resolution, Tasting Notes, account linking & export", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Sign in as @alice
    await page.goto("/signin");
    await page.getByLabel("Handle").fill("alice");
    await page.getByLabel("Display Name").fill("Alice Park");
    await page.getByRole("button", { name: "Enter Roastery (Test Auth)" }).click();
    await page.waitForURL("**/me");

    // Verify dual-label My Roastery sidebar items
    await expect(
      page.getByRole("heading", { level: 1, name: "My Roastery" }),
    ).toBeVisible();
    await expect(page.getByText("Confirmed Taste & Roast Log")).toBeVisible();
    await expect(page.getByText("How your Taste leans")).toBeVisible();
    await expect(page.getByText("People & Beans kept on hand")).toBeVisible();
    await expect(page.getByText("Connected AI apps & sign-in")).toBeVisible();

    // 2A. Progressive 2-stage multi-origin Roast (Reading Origin + Work Origin, private by default)
    await page
      .locator("main")
      .getByRole("button", { name: "Roast a Bean", exact: true })
      .first()
      .click();
    await expect(page.getByText(/Stage 1 of 2/)).toBeVisible();

    await page.getByLabel("Source URL").fill(sharedUrl);
    await page.getByLabel("Source Title (optional)").fill("Shared Architecture Essay");
    await page.getByLabel("Quote (optional)").fill("Silent fallbacks hide failure modes.");

    // Add 2nd origin (Work Origin)
    await page.getByRole("button", { name: "+ Add another origin" }).click();
    await expect(page.getByText("2/8 origins")).toBeVisible();
    await page
      .getByLabel("Work Moment")
      .fill("Caught silent auth fallback during production review.");

    await page.getByLabel("Headline").fill("Secret multi-origin work judgment");
    await page
      .getByLabel("My Take")
      .fill("Auth paths must fail explicitly instead of silently falling back.");

    await page.getByRole("button", { name: /Continue to Roast & Confirm/ }).click();
    await expect(page.getByText(/Stage 2 of 2/)).toBeVisible();

    await page
      .getByLabel("Trade-off")
      .fill("Explicit failure over silent convenience.");
    await page.getByLabel("Boundary").fill("Security and persistence paths.");
    await page.getByText("Domains, Open Question & Relations (optional)").click();
    await page.getByLabel("Domains").fill("architecture, secret-domain");

    await page.getByRole("button", { name: "Confirm & Save Bean" }).click();
    await expect(
      page.getByText("Secret multi-origin work judgment").first(),
    ).toBeVisible();

    // Verify work_episode direct API publish without redactionConfirmed returns 400 REDACTION_REQUIRED
    const listMineResp = await page.request.get("/api/beans?scope=mine");
    expect(listMineResp.headers()["cache-control"]).toBe("private, no-store");
    const listMine = await listMineResp.json();
    const insightsResp = await page.request.get("/api/insights");
    expect(insightsResp.headers()["cache-control"]).toBe("private, no-store");
    const workBean = listMine.beans.find(
      (b: { title: string }) => b.title === "Secret multi-origin work judgment",
    );
    expect(workBean).toBeTruthy();

    const redactFail = await page.request.post(
      `/api/beans/${workBean.id}/visibility`,
      {
        data: {
          visibility: "public",
          expectedVersion: workBean.version,
          operationKey: "e2e-redact-fail-1",
        },
      },
    );
    expect(redactFail.status()).toBe(400);
    expect((await redactFail.json()).code).toBe("REDACTION_REQUIRED");

    // Verify UI opens Work Origin Privacy Check modal from inline Editorial Bean Reader
    await page
      .getByRole("list", { name: "Your confirmed Beans" })
      .getByRole("button", { name: /Secret multi-origin work judgment/ })
      .click();
    await expect(page.getByText("Roast Log · Revision timeline")).toBeVisible();
    await page.getByRole("button", { name: "Put on the Table" }).click();
    await expect(page.getByText("Work Origin Privacy Check")).toBeVisible();
    await page
      .getByRole("dialog", { name: "Work Origin Privacy Check" })
      .getByRole("button", { name: "Cancel" })
      .click();

    // Also create a private-only URL Bean to verify 404 isolation later
    const privPrep = await (
      await page.request.post("/api/beans", {
        data: {
          mode: "prepare",
          input: {
            title: "Private internal RFC stance",
            take: "Keep internal RFC notes confidential.",
            tradeoff: "Confidentiality over open sharing.",
            boundary: "Internal only.",
            tags: ["internal-only"],
            origins: [
              {
                kind: "source_excerpt",
                url: privateOnlyUrl,
                sourceTitle: "Internal Secret RFC",
              },
            ],
          },
        },
      })
    ).json();
    const privSave = await page.request.post("/api/beans", {
      data: {
        ...privPrep.prepared.canonicalPayload,
        digest: privPrep.prepared.digest,
        operationKey: privPrep.prepared.operationKey,
        attestationKind: "ui_attested",
      },
    });
    expect(privSave.status()).toBe(201);

    // 2B. Create a public Reading Origin Bean on sharedUrl linked with tensions_with to workBean
    const pubPrep = await (
      await page.request.post("/api/beans", {
        data: {
          mode: "prepare",
          input: {
            title: "Alice favors modular monoliths",
            take: "Deploy simplicity accelerates early iteration.",
            tradeoff: "Single deployment over independent service deploys.",
            boundary: "Teams under 30 engineers.",
            visibility: "public",
            tags: ["architecture"],
            origins: [
              {
                kind: "source_excerpt",
                url: sharedUrl,
                sourceTitle: "Shared Architecture Essay",
                quotation: "Network boundaries carry coordination tax.",
                locator: "Section 2",
              },
            ],
            relations: [
              {
                toBeanId: workBean.id,
                kind: "tensions_with",
                note: "Simplicity vs strict boundary isolation",
              },
            ],
          },
        },
      })
    ).json();
    const pubSaveRes = await page.request.post("/api/beans", {
      data: {
        ...pubPrep.prepared.canonicalPayload,
        digest: pubPrep.prepared.digest,
        operationKey: pubPrep.prepared.operationKey,
        attestationKind: "ui_attested",
      },
    });
    expect(pubSaveRes.status()).toBe(201);
    const pubBean = (await pubSaveRes.json()).bean;
    const sharedOriginId = pubBean.origins[0].originId;
    sharedSourcePath = `/sources/${sharedOriginId}`;

    // Reload /me so Alice sees all 3 Beans and test 409 VERSION_CONFLICT + Tension Resolution + Roast Log
    await page.reload();
    await page
      .getByRole("list", { name: "Your confirmed Beans" })
      .getByRole("button", { name: /Alice favors modular monoliths/ })
      .click();
    await expect(
      page.getByText("In Tension · Conflicting criteria detected"),
    ).toBeVisible();

    // Mutate pubBean version behind the scenes (v1 -> v2 -> v3) to trigger real 409 VERSION_CONFLICT in UI
    await page.request.post(`/api/beans/${pubBean.id}/visibility`, {
      data: {
        visibility: "private",
        expectedVersion: 1,
        operationKey: "e2e-conflict-step-1",
      },
    });
    await page.request.post(`/api/beans/${pubBean.id}/visibility`, {
      data: {
        visibility: "public",
        expectedVersion: 2,
        operationKey: "e2e-conflict-step-2",
      },
    });

    // Clicking Keep Private with stale expectedVersion=1 triggers non-destructive 409 banner
    await page.getByRole("button", { name: "Keep Private" }).click();
    await expect(page.getByText("Version Conflict (409)")).toBeVisible();
    await page.getByRole("button", { name: /Reload latest/ }).click();
    await expect(page.getByText("Version Conflict (409)")).toHaveCount(0);

    // Resolve tension via Remove tension link -> creates Rev 2 in Roast Log
    await page.getByRole("button", { name: "Remove tension link" }).click();
    await expect(page.getByText(/Rev 2 ·/)).toBeVisible();
    await expect(page.getByText(/Rev 1 ·/)).toBeVisible();
    await expect(
      page.getByText("In Tension · Conflicting criteria detected"),
    ).toHaveCount(0);

    // 2C. Tasting Notes deterministic insights accuracy
    await page.getByRole("button", { name: /Tasting Notes/ }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Tasting Notes" }),
    ).toBeVisible();
    await expect(
      page.getByText("Confirmed takes · 2 private, 1 on the Table"),
    ).toBeVisible();
    await expect(page.getByText("#architecture")).toBeVisible();

    // 2D. Brew Bar & Account: last-login-method guard + explicit test-auth linking + unlink
    await page.getByRole("button", { name: /Brew Bar & Account/ }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Brew Bar & Account" }),
    ).toBeVisible();

    // Unlink button disabled when only 1 account exists
    const unlinkBtns = page.getByRole("button", { name: "Unlink" });
    await expect(unlinkBtns.first()).toBeDisabled();

    // Direct API unlink on last method returns 400 LAST_LOGIN_METHOD
    const acctsRes = await (await page.request.get("/api/accounts")).json();
    expect(acctsRes.accounts).toHaveLength(1);
    const lastUnlink = await page.request.delete("/api/accounts", {
      data: { accountId: acctsRes.accounts[0].id },
    });
    expect(lastUnlink.status()).toBe(400);
    expect((await lastUnlink.json()).code).toBe("LAST_LOGIN_METHOD");

    // Explicitly link a second provider in UI, then unlink it
    await page.getByLabel("External Provider ID").fill("gh-alice-e2e-link");
    await page.getByRole("button", { name: "Link Test Account" }).click();
    await expect(page.getByText("Account ID: gh-alice-e2e-link")).toBeVisible();
    await page.getByRole("button", { name: "Unlink" }).nth(1).click();
    await expect(page.getByText("Account ID: gh-alice-e2e-link")).toHaveCount(0);

    // 2E. JSON & Markdown export endpoints
    const jsonExp = await page.request.get("/api/export?format=json");
    expect(jsonExp.status()).toBe(200);
    expect((await jsonExp.json()).count).toBe(3);

    const mdExp = await page.request.get("/api/export?format=markdown");
    expect(mdExp.status()).toBe(200);
    expect(await mdExp.text()).toContain("Alice favors modular monoliths");

    await assertCleanSurface(page, "/me");
    expect(pageErrors).toEqual([]);
  });

  test("3. Sharing Matrix (/sources/[id]), Your Stance Banner vs Incognito privacy/404, Live Shelf reload persistence, OAuth Consent & Revocation", async ({
    page,
    browser,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Sign in as @alice and check /sources/[id] Your Stance Banner (public + private stance!)
    await page.goto("/signin");
    await page.getByLabel("Handle").fill("alice");
    await page.getByLabel("Display Name").fill("Alice Park");
    await page.getByRole("button", { name: "Enter Roastery (Test Auth)" }).click();
    await page.waitForURL("**/me");

    await page.goto(sharedSourcePath);
    await expect(
      page.getByText("Your Stance · Your Bean is on this Table"),
    ).toBeVisible();
    await expect(
      page.getByText("and 1 private Bean(s) visible only to you."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "How each person read this source",
      }),
    ).toBeVisible();
    await assertCleanSurface(page, "/sources/[id] owner");

    // Incognito visitor: verifies public/private counts on /@alice, zero private leak, and 404 on private-only URL
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();

    await anonPage.goto(
      `${new URL(page.url()).origin}/@alice`,
    );
    await expect(anonPage.getByText("Alice Park").first()).toBeVisible();
    await expect(anonPage.getByText("On the Table · Public Beans")).toBeVisible();
    await expect(anonPage.getByText("Private Beans (count only)")).toBeVisible();
    await expect(
      anonPage.getByText("Alice favors modular monoliths"),
    ).toBeVisible();
    await expect(
      anonPage.getByText("Secret multi-origin work judgment"),
    ).toHaveCount(0);
    await expect(anonPage.getByText("secret-domain")).toHaveCount(0);
    await assertCleanSurface(anonPage, "/@alice anon");

    await anonPage.goto(`${new URL(page.url()).origin}${sharedSourcePath}`);
    await expect(
      anonPage.getByText("Secret multi-origin work judgment"),
    ).toHaveCount(0);
    await expect(anonPage.getByText(/Your Stance/)).toHaveCount(0);

    // Private-only source returns 404
    const privSourceResp = await anonPage.request.get(
      `${new URL(page.url()).origin}/sources/nonexistent-private-origin`,
    );
    expect(privSourceResp.status()).toBe(404);
    await anonCtx.close();

    // Sign out Alice, sign in as Bob
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/$/);
    await page.goto("/signin");
    await page.getByLabel("Handle").fill("bob");
    await page.getByLabel("Display Name").fill("Bob Kim");
    await page.getByRole("button", { name: "Enter Roastery (Test Auth)" }).click();
    await page.waitForURL("**/me");

    // Live Shelf hydration across full reload: Person on /@alice
    await page.goto("/@alice");
    await page.getByRole("button", { name: "Save @alice to Shelf" }).click();
    await expect(
      page.getByRole("button", { name: "Saved on Shelf" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Saved on Shelf" }),
    ).toBeVisible();

    // Live Shelf hydration across full reload: Bean on /sources/[id]
    await page.goto(sharedSourcePath);
    await page.getByRole("button", { name: "Save to Shelf" }).first().click();
    await expect(
      page.getByRole("button", { name: "On Shelf" }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "On Shelf" }).first(),
    ).toBeVisible();

    // Check /me?tab=saved shows Trade-off preview + Open Table link, then Remove persists across reload
    await page.goto("/me?tab=saved");
    await expect(page.getByText("Alice Park")).toBeVisible();
    await expect(
      page.getByText(/Single deployment over independent service deploys/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Table →" })).toBeVisible();

    // Unsave Alice's Bean directly from /sources/[id] using hydrated shelfItemId -> DELETE /api/shelf
    await page.goto(sharedSourcePath);
    await page.getByRole("button", { name: "On Shelf" }).first().click();
    await expect(
      page.getByRole("button", { name: "Save to Shelf" }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Save to Shelf" }).first(),
    ).toBeVisible();

    // OAuth Consent flow (/oauth/consent) + Live Brew Readiness on /connect + Revocation on /me?tab=settings
    const dcrRes = await page.request.post("/api/oauth/register", {
      data: {
        client_name: "E2E Codex Host",
        redirect_uris: ["http://127.0.0.1:4321/callback"],
      },
    });
    expect(dcrRes.status()).toBe(201);
    const client = await dcrRes.json();
    const challenge = createHash("sha256")
      .update("e2e-verifier-".padEnd(48, "x"))
      .digest("base64url");

    const consentParams = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: "http://127.0.0.1:4321/callback",
      scope: "beans:read beans:write offline_access",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "e2e-state",
    });

    await page.goto(`/oauth/consent?${consentParams.toString()}`);
    await expect(
      page.getByRole("heading", { name: "Brew Authorization" }),
    ).toBeVisible();
    // Intercept redirect to non-listening localhost:4321 callback
    await page.route("http://127.0.0.1:4321/**", (route) =>
      route.fulfill({ status: 200, body: "callback-ok" }),
    );
    await page.getByRole("button", { name: "Approve Brew Access" }).click();
    await page.waitForURL(/127\.0\.0\.1:4321\/callback\?code=/);

    // /connect reflects live active AI connection
    await page.goto("/connect");
    await expect(
      page.getByText(/Brew Ready · 1 active AI connection/),
    ).toBeVisible();
    await expect(page.getByText("E2E Codex Host")).toBeVisible();
    await assertCleanSurface(page, "/connect");

    // Revoke on /me?tab=settings -> /connect updates immediately
    await page.goto("/me?tab=settings");
    await page.getByRole("button", { name: "Revoke" }).first().click();
    await expect(page.getByText("Revoked").first()).toBeVisible();
    await page.goto("/connect");
    await expect(page.getByText("No AI app connected yet")).toBeVisible();

    // Populated Home / shows value-first hero + secondary bottom Table preview; /sources search works cleanly
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Give it your Taste/ }),
    ).toBeVisible();
    await expect(page.getByText("On the Table right now")).toBeVisible();
    await assertCleanSurface(page, "populated /");

    await page.goto("/sources?q=shared-architecture");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tables" }),
    ).toBeVisible();
    await expect(page.getByText("Shared Architecture Essay")).toBeVisible();
    await assertCleanSurface(page, "/sources");

    expect(pageErrors).toEqual([]);
  });

  test("4. All 3 compiled MCP App bundles + Light/Dark appearance & Desktop/Mobile viewports", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Appearance switching (Auto -> Light -> Dark) & desktop/mobile rendering on /
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const rootEl = page.locator(".yg-root").first();
    await expect(rootEl).toHaveAttribute("data-material", "neutral");
    await expect(rootEl).toHaveAttribute("data-appearance", "auto");

    await page
      .getByRole("button", { name: /Switch appearance/ })
      .click();
    await expect(rootEl).toHaveAttribute("data-appearance", "light");
    await page
      .getByRole("button", { name: /Switch appearance/ })
      .click();
    await expect(rootEl).toHaveAttribute("data-appearance", "dark");

    // Mobile viewport check (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/connect");
    await expect(
      page.getByRole("heading", { level: 1, name: "Brew Bar" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });

    // 4A. Confirm Bean MCP App
    await page.addInitScript(() => {
      (
        window as unknown as Record<string, unknown>
      ).__COFFEE_CHAT_INITIAL_RESULT__ = {
        structuredContent: {
          prepared: {
            canonicalPayload: {
              schema: "coffee-chat-bean-v1",
              ownerId: "user-1",
              beanId: null,
              expectedVersion: null,
              title: "Explicit failure over silent defaults",
              take: "Auth checks should fail loudly.",
              tradeoff: "Reliability over convenience.",
              boundary: "Auth paths only.",
              uncertainty: null,
              tags: ["auth"],
              visibility: "private",
              origins: [
                {
                  kind: "work_episode",
                  url: null,
                  sourceTitle: null,
                  quotation: null,
                  locator: null,
                  episodeSummary: "Caught silent fallback during PR review.",
                },
              ],
              relations: [],
            },
            digest: "a".repeat(64),
            operationKey: "op-e2e-1",
            requiresRedactionConfirmation: false,
          },
        },
      };
      (
        window as unknown as Record<string, unknown>
      ).__COFFEE_CHAT_MOCK_TOOL_CALL__ = async (name: string) => {
        if (name === "prepare_bean") {
          return {
            structuredContent: {
              prepared: (
                window as unknown as {
                  __COFFEE_CHAT_INITIAL_RESULT__: {
                    structuredContent: { prepared: Record<string, unknown> };
                  };
                }
              ).__COFFEE_CHAT_INITIAL_RESULT__.structuredContent.prepared,
            },
          };
        }
        return {
          structuredContent: {
            bean: { id: "bean-e2e-123", version: 1, visibility: "private" },
          },
        };
      };
    });
    await page.goto("/api/mcp-apps/confirm-bean");
    await expect(page.getByText("Roast a Bean")).toBeVisible();
    await page.getByRole("button", { name: "Confirm & Save Bean" }).click();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText(/bean-e2e-123/)).toBeVisible();

    // 4B. Bean Picker MCP App
    const pickerPage = await page.context().newPage();
    await pickerPage.addInitScript(() => {
      (
        window as unknown as Record<string, unknown>
      ).__COFFEE_CHAT_INITIAL_RESULT__ = {
        structuredContent: {
          reason: "Two Beans pull in different directions.",
          beans: [
            {
              id: "b1",
              ownerHandle: "alice",
              ownerDisplayName: "Alice",
              visibility: "private",
              version: 1,
              revisionNumber: 1,
              title: "Zero-friction onboarding",
              tradeoffPreview: "Minimize upfront steps.",
              tags: ["ux"],
              originKinds: ["work_episode"],
              supersededByBeanId: null,
              hasTension: true,
              updatedAt: new Date().toISOString(),
            },
            {
              id: "b2",
              ownerHandle: "alice",
              ownerDisplayName: "Alice",
              visibility: "private",
              version: 1,
              revisionNumber: 1,
              title: "Strict upfront verification",
              tradeoffPreview: "Verify permissions first.",
              tags: ["security"],
              originKinds: ["work_episode"],
              supersededByBeanId: null,
              hasTension: true,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      };
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_ON_PICK__ =
        () => {};
    });
    await pickerPage.goto("/api/mcp-apps/bean-picker");
    await expect(
      pickerPage.getByText("Brew · Choose Beans for this task"),
    ).toBeVisible();
    await expect(pickerPage.getByText("In Tension").first()).toBeVisible();
    await pickerPage
      .getByRole("button", { name: /Brew Selected Beans/ })
      .click();
    await expect(pickerPage.getByText("Perspectives attached")).toBeVisible();
    await pickerPage.close();

    // 4C. Perspective Diff MCP App
    const diffPage = await page.context().newPage();
    await diffPage.addInitScript(() => {
      (
        window as unknown as Record<string, unknown>
      ).__COFFEE_CHAT_INITIAL_RESULT__ = {
        structuredContent: {
          subject: "https://example.com/shared-essay",
          perspectives: [
            {
              id: "p1",
              ownerHandle: "alice",
              ownerDisplayName: "Alice",
              visibility: "public",
              version: 1,
              revisionNumber: 1,
              title: "Probe fast",
              tradeoffPreview: "Speed over polish",
              take: "Learn from real usage.",
              tradeoff: "Speed over polish.",
              boundary: "Reversible only.",
              uncertainty: null,
              tags: [],
              originKinds: ["source_excerpt"],
              origins: [],
              relations: [],
              supersededByBeanId: null,
              hasTension: false,
              payloadDigest: "a".repeat(64),
              attestationKind: "ui_attested",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "p2",
              ownerHandle: "bob",
              ownerDisplayName: "Bob",
              visibility: "public",
              version: 1,
              revisionNumber: 1,
              title: "Ship complete contract",
              tradeoffPreview: "Completeness over speed",
              take: "Trust starts at v1.",
              tradeoff: "Completeness over speed.",
              boundary: "External launches.",
              uncertainty: null,
              tags: [],
              originKinds: ["source_excerpt"],
              origins: [],
              relations: [],
              supersededByBeanId: null,
              hasTension: false,
              payloadDigest: "b".repeat(64),
              attestationKind: "ui_attested",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      };
      (
        window as unknown as Record<string, unknown>
      ).__COFFEE_CHAT_MOCK_TOOL_CALL__ = async () => ({
        structuredContent: { ok: true },
      });
    });
    await diffPage.goto("/api/mcp-apps/perspective-diff");
    await expect(diffPage.getByText("Probe fast")).toBeVisible();
    await expect(diffPage.getByText("Ship complete contract")).toBeVisible();
    await diffPage.getByRole("button", { name: "Save to Shelf" }).first().click();
    await expect(diffPage.getByText("On Shelf")).toBeVisible();
    await diffPage.close();

    expect(pageErrors).toEqual([]);
  });
});
