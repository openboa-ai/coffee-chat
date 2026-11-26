import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computePkceS256,
  createDatabase,
  type DatabaseHandle,
} from "@coffee-chat/core";
import { MCP_APP_MIME_TYPE, MCP_APP_URIS } from "@coffee-chat/mcp-apps";
import { setDbHandleForTests } from "@/lib/runtime";
import { GET as getProtectedResource } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as getAuthServer } from "@/app/.well-known/oauth-authorization-server/route";
import { POST as postRegister } from "@/app/api/oauth/register/route";
import { POST as postAuthorize } from "@/app/api/oauth/authorize/route";
import { POST as postToken } from "@/app/api/oauth/token/route";
import { POST as postMcp } from "@/app/api/mcp/route";
import { POST as postTestLogin } from "@/app/api/test-auth/login/route";
import { POST as postRevokeGrant } from "@/app/api/grants/[id]/revoke/route";

const ORIGIN = "http://localhost:3000";

describe("OAuth 2.1 Discovery + Streamable HTTP /api/mcp + Revocation E2E", () => {
  let dbHandle: DatabaseHandle;

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
    process.env.COFFEE_CHAT_ENABLE_TEST_AUTH = "true";
    dbHandle = await createDatabase();
    setDbHandleForTests(dbHandle);
  });

  afterEach(async () => {
    setDbHandleForTests(null);
    await dbHandle.close();
  });

  it("completes RFC 9728 discovery, DCR + PKCE S256, MCP tools & UI resources, and instant revocation", async () => {
    // 1. Unauthenticated /api/mcp returns 401 with RFC 9728 WWW-Authenticate header.
    const unauth = await postMcp(
      new Request(`${ORIGIN}/api/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
    );
    expect(unauth.status).toBe(401);
    expect(unauth.headers.get("www-authenticate")).toContain(
      `${ORIGIN}/.well-known/oauth-protected-resource`,
    );

    // 2. Discover Protected Resource & Authorization Server metadata.
    const prmRes = await getProtectedResource(
      new Request(`${ORIGIN}/.well-known/oauth-protected-resource`),
    );
    const prm = await prmRes.json();
    expect(prm.resource).toBe(`${ORIGIN}/api/mcp`);
    expect(prm.authorization_servers).toEqual([ORIGIN]);

    const asRes = await getAuthServer(
      new Request(`${ORIGIN}/.well-known/oauth-authorization-server`),
    );
    const asMeta = await asRes.json();
    expect(asMeta.code_challenge_methods_supported).toContain("S256");
    expect(asMeta.client_id_metadata_document_supported).toBe(true);

    // 3. Sign in Alice via dev/test-only local auth adapter.
    const loginRes = await postTestLogin(
      new Request(`${ORIGIN}/api/test-auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: "alice", name: "Alice Park" }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const cookieHeader = setCookie.split(";")[0]!;

    // 4. Register OAuth client (DCR) and complete PKCE authorization + token exchange.
    const regRes = await postRegister(
      new Request(`${ORIGIN}/api/oauth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_name: "Codex Test Client",
          redirect_uris: ["http://127.0.0.1:4321/cb"],
        }),
      }),
    );
    expect(regRes.status).toBe(201);
    const client = await regRes.json();

    const verifier = "pkce-verifier-for-coffee-chat-oauth-e2e-test-1234567890";
    const challenge = computePkceS256(verifier);

    const authzRes = await postAuthorize(
      new Request(`${ORIGIN}/api/oauth/authorize`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          client_id: client.client_id,
          redirect_uri: "http://127.0.0.1:4321/cb",
          resource: `${ORIGIN}/api/mcp`,
          scope: "beans:read beans:write offline_access",
          code_challenge: challenge,
          code_challenge_method: "S256",
          state: "xyz",
        }),
      }),
    );
    expect(authzRes.status).toBe(200);
    const { code, grantId, redirectTo } = await authzRes.json();
    expect(redirectTo).toContain(`code=${code}`);

    const tokenRes = await postToken(
      new Request(`${ORIGIN}/api/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: client.client_id,
          redirect_uri: "http://127.0.0.1:4321/cb",
          code_verifier: verifier,
          resource: `${ORIGIN}/api/mcp`,
        }),
      }),
    );
    expect(tokenRes.status).toBe(200);
    const tokens = await tokenRes.json();
    expect(tokens.access_token).toMatch(/^cc_at_/);
    expect(tokens.refresh_token).toMatch(/^cc_rt_/);

    const mcpCall = async (method: string, params?: Record<string, unknown>, token = tokens.access_token) => {
      const res = await postMcp(
        new Request(`${ORIGIN}/api/mcp`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        }),
      );
      return { status: res.status, body: await res.json() };
    };

    // 5. Verify initialize, tools/list (all 9 tools), and resources/read (all 3 MCP Apps).
    const init = await mcpCall("initialize");
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo.name).toBe("coffee-chat-mcp");

    const tools = await mcpCall("tools/list");
    expect(tools.body.result.tools).toHaveLength(9);

    const resources = await mcpCall("resources/list");
    expect(resources.body.result.resources).toHaveLength(3);

    const confirmHtml = await mcpCall("resources/read", {
      uri: MCP_APP_URIS.confirmBean,
    });
    expect(confirmHtml.body.result.contents[0].mimeType).toBe(MCP_APP_MIME_TYPE);
    expect(confirmHtml.body.result.contents[0].text).toContain("<!doctype html>");

    // 6. Execute full Roast prepare_bean -> save_bean -> list_beans -> get_profile over MCP!
    const prep = await mcpCall("tools/call", {
      name: "prepare_bean",
      arguments: {
        title: "Prefer small reversible probes",
        take: "Small probes validate assumptions before committing architecture.",
        tradeoff: "Learning velocity over upfront perfection.",
        boundary: "Exclude irreversible security or database migrations.",
        tags: ["architecture"],
        origins: [
          {
            kind: "source_excerpt",
            url: "https://example.com/reversible-probes",
            sourceTitle: "Reversible Probes",
            quotation: "Optimize reversible choices for feedback.",
          },
        ],
      },
    });
    expect(prep.body.result._meta.ui.resourceUri).toBe(MCP_APP_URIS.confirmBean);
    expect(prep.body.result.content[0].text).toContain("Confirm Coffee Chat Bean");
    const prepared = prep.body.result.structuredContent.prepared;
    expect(prepared.canonicalPayload.visibility).toBe("private");

    const saved = await mcpCall("tools/call", {
      name: "save_bean",
      arguments: {
        ...prepared.canonicalPayload,
        digest: prepared.digest,
        operationKey: prepared.operationKey,
        attestationKind: "ui_attested",
      },
    });
    expect(saved.body.result.isError).toBeUndefined();
    expect(saved.body.result.structuredContent.bean.visibility).toBe("private");

    const profile = await mcpCall("tools/call", {
      name: "get_profile",
      arguments: {},
    });
    expect(profile.body.result.structuredContent.publicCount).toBe(0);
    expect(profile.body.result.structuredContent.privateCount).toBe(1);

    // 7. Revoke grant from Web API -> both access token AND refresh token fail immediately!
    const revokeRes = await postRevokeGrant(
      new Request(`${ORIGIN}/api/grants/${grantId}/revoke`, {
        method: "POST",
        headers: { cookie: cookieHeader },
      }),
      { params: Promise.resolve({ id: grantId }) },
    );
    expect(revokeRes.status).toBe(200);

    const afterRevoke = await mcpCall("tools/call", {
      name: "get_profile",
      arguments: {},
    });
    expect(afterRevoke.status).toBe(401);

    const refreshAfterRevoke = await postToken(
      new Request(`${ORIGIN}/api/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
          client_id: client.client_id,
          resource: `${ORIGIN}/api/mcp`,
        }),
      }),
    );
    expect(refreshAfterRevoke.status).toBe(401);
  });
});
