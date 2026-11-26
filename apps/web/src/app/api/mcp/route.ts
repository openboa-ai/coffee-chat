import { NextResponse } from "next/server";
import { verifyAccessToken } from "@coffee-chat/core";
import { handleMcpJsonRpc, type JsonRpcRequest } from "@/lib/mcp-server";
import {
  getAppOrigin,
  getDb,
  getMcpResourceUrl,
  jsonNoStore,
} from "@/lib/runtime";

function unauthorizedMcpResponse(request: Request, message: string) {
  const origin = getAppOrigin(request);
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource`;
  return NextResponse.json(
    { error: "UNAUTHORIZED", message },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match?.[1]) {
    return unauthorizedMcpResponse(
      request,
      "Bearer access token is required to call /api/mcp.",
    );
  }

  const db = await getDb();
  const resource = getMcpResourceUrl(request);

  let principal;
  try {
    // Uncached per-request token & grant verification against Postgres.
    principal = await verifyAccessToken(db, match[1], resource);
  } catch (err) {
    return unauthorizedMcpResponse(
      request,
      err instanceof Error ? err.message : "Invalid or revoked access token.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: invalid JSON body." },
      },
      { status: 400 },
    );
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((item) =>
        handleMcpJsonRpc(db, principal, item as JsonRpcRequest),
      ),
    );
    return jsonNoStore(responses);
  }

  const rpcResponse = await handleMcpJsonRpc(
    db,
    principal,
    body as JsonRpcRequest,
  );
  return jsonNoStore(rpcResponse);
}

export async function GET(request: Request) {
  return unauthorizedMcpResponse(
    request,
    "Coffee Chat MCP uses stateless Streamable HTTP POST requests with OAuth 2.1 Bearer authentication.",
  );
}
