import { expect, test } from "@playwright/test";

test.describe("Coffee Chat Service Web & MCP Apps E2E", () => {
  test("verifies Landing, 30s Connect, 1-step Capture in My Table, Person Page counts/privacy, Source Compare A vs B, and Shelf", async ({
    page,
    context,
  }) => {
    // 1. Landing & 30-second Connect pages
    await page.goto("/");
    await expect(
      page.getByText("Knowledge is shared. What a person makes of it is personal."),
    ).toBeVisible();

    await page.goto("/connect");
    await expect(
      page.getByRole("heading", { name: "Use Coffee Chat Inside Your AI" }),
    ).toBeVisible();
    await page.getByText("Codex", { exact: true }).click();
    await expect(page.getByText("Codex CLI & Codex App")).toBeVisible();

    // 2. Sign in as @alice via test-only local auth adapter
    await page.goto("/signin");
    await page.getByRole("button", { name: "Quick sign in as @alice" }).click();
    await page.waitForURL("**/me");
    await expect(page.getByRole("heading", { name: "My Table" })).toBeVisible();

    // 3. Capture a private work decision in ONE click (defaults to private!)
    await page.getByRole("button", { name: "Capture a take" }).click();
    await page.getByText("A call I made at work").click();
    await page
      .getByLabel("What situation sparked this? (keep it free of secrets or private code)")
      .fill("Corrected silent fallback in auth helper.");
    await page
      .getByLabel("Headline — your take in one line")
      .fill("Secret internal work judgment");
    await page
      .getByLabel("What it meant to you")
      .fill("Keep auth errors loud during refactors.");
    await page
      .getByLabel("What mattered more (the trade-off)")
      .fill("Explicit failure over silent convenience.");
    await page
      .getByLabel("When it doesn't apply (the exception)")
      .fill("Security paths only.");
    await expect(page.getByText("Private (default)")).toBeVisible();
    await page.getByRole("button", { name: "Save Perspective" }).click();
    await expect(
      page.getByRole("heading", { name: "Secret internal work judgment" }),
    ).toBeVisible();

    // 4. Capture a shared-URL take for Alice and publish it in ONE click
    const sharedUrl = "https://example.com/shared-architecture-essay";
    await page.getByRole("button", { name: "Capture a take" }).click();
    await page.getByLabel("Article or link URL").fill(sharedUrl);
    await page
      .getByLabel("Line that stood out (optional quote)")
      .fill("Network calls have tax.");
    await page
      .getByLabel("Headline — your take in one line")
      .fill("Alice favors modular monoliths");
    await page
      .getByLabel("What it meant to you")
      .fill("Deploy simplicity accelerates iteration.");
    await page
      .getByLabel("What mattered more (the trade-off)")
      .fill("Single deployment over independent service deploys.");
    await page
      .getByLabel("When it doesn't apply (the exception)")
      .fill("Teams under 30 engineers.");
    await page
      .getByRole("switch", { name: "Share publicly on my Coffee Chat page" })
      .click();
    await page.getByRole("button", { name: "Save Perspective" }).click();
    await expect(
      page.getByRole("heading", { name: "Alice favors modular monoliths" }),
    ).toBeVisible();

    // Verify JSON & Markdown export endpoints return Alice's data cleanly
    const jsonExport = await page.request.get("/api/export?format=json");
    expect(jsonExport.status()).toBe(200);
    const jsonBody = await jsonExport.json();
    expect(jsonBody.count).toBeGreaterThanOrEqual(2);

    const mdExport = await page.request.get("/api/export?format=markdown");
    expect(mdExport.status()).toBe(200);
    expect(await mdExport.text()).toContain("Alice favors modular monoliths");

    // 5. Open Alice's public Person Page /@alice in a fresh unauthenticated context!
    const anonPage = await context.browser()!.newPage();
    await anonPage.goto(`${page.url().replace(/\/me.*$/, "")}/@alice`);
    await expect(anonPage.getByText("1 public")).toBeVisible();
    await expect(anonPage.getByText("1 private")).toBeVisible();
    await expect(
      anonPage.getByRole("heading", { name: "Alice favors modular monoliths" }),
    ).toBeVisible();
    // Private Bean content MUST NEVER appear publicly!
    await expect(anonPage.getByText("Secret internal work judgment")).toHaveCount(0);
    await anonPage.close();

    // 6. Sign out Alice, sign in as Bob, save @alice to Shelf, and add contrasting take RIGHT ON the shared Source Compare table!
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/");
    await page.goto("/signin");
    await page.getByRole("button", { name: "Quick sign in as @bob" }).click();
    await page.waitForURL("**/me");

    await page.goto("/@alice");
    await page.getByRole("button", { name: "Save @alice to Shelf" }).click();
    await expect(page.getByText("Saved to Shelf")).toBeVisible();

    await page.getByRole("link", { name: "Compare on Source Page" }).click();
    await page.waitForURL("**/sources/**");

    // Add Bob's contrasting take directly on the Source Compare page (URL pre-filled!)
    await page.getByRole("button", { name: "Add your take to this table" }).click();
    await page
      .getByLabel("Line that stood out (optional quote)")
      .fill("Blast radius dictates boundaries.");
    await page
      .getByLabel("Headline — your take in one line")
      .fill("Bob favors early service isolation");
    await page
      .getByLabel("What it meant to you")
      .fill("Blast radius matters early on sensitive systems.");
    await page
      .getByLabel("What mattered more (the trade-off)")
      .fill("Security isolation over simpler local debugging.");
    await page
      .getByLabel("When it doesn't apply (the exception)")
      .fill("Systems handling PII or billing.");
    await page
      .getByRole("switch", { name: "Share publicly on my Coffee Chat page" })
      .click();
    await page.getByRole("button", { name: "Save Perspective" }).click();

    await expect(
      page.getByRole("heading", { name: "Alice favors modular monoliths" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bob favors early service isolation" }),
    ).toBeVisible();
    await expect(page.getByText("2 confirmed perspectives")).toBeVisible();
  });

  test("renders and interacts with all 3 compiled MCP App HTML bundles", async ({
    page,
  }) => {
    // 1. Confirm Bean Card MCP App
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_INITIAL_RESULT__ = {
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
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_MOCK_TOOL_CALL__ =
        async (name: string) => {
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
    await expect(page.getByText("Review and confirm this perspective")).toBeVisible();
    await page.getByRole("button", { name: "Confirm & Save Bean" }).click();
    await expect(page.getByText("Confirmed & Saved")).toBeVisible();
    await expect(page.getByText("bean-e2e-123")).toBeVisible();

    // 2. Bean Picker MCP App
    const pickerPage = await page.context().newPage();
    await pickerPage.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_INITIAL_RESULT__ = {
        structuredContent: {
          reason: "Two Beans are marked tensions_with each other.",
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
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_ON_PICK__ = () => {};
    });
    await pickerPage.goto("/api/mcp-apps/bean-picker");
    await expect(pickerPage.getByText("Choose perspectives for this task")).toBeVisible();
    await expect(pickerPage.getByText("tension").first()).toBeVisible();
    await pickerPage.getByRole("button", { name: /Apply Selected Perspectives/ }).click();
    await expect(pickerPage.getByText("Perspectives attached")).toBeVisible();
    await pickerPage.close();

    // 3. Perspective Diff Card MCP App
    const diffPage = await page.context().newPage();
    await diffPage.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_INITIAL_RESULT__ = {
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
      (window as unknown as Record<string, unknown>).__COFFEE_CHAT_MOCK_TOOL_CALL__ =
        async () => ({ structuredContent: { ok: true } });
    });
    await diffPage.goto("/api/mcp-apps/perspective-diff");
    await expect(diffPage.getByText("Probe fast")).toBeVisible();
    await expect(diffPage.getByText("Ship complete contract")).toBeVisible();
    await diffPage.getByRole("button", { name: "Save to Shelf" }).first().click();
    await expect(diffPage.getByText("Saved to Shelf")).toBeVisible();
    await diffPage.close();
  });
});
