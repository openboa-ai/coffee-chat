import { NextResponse } from "next/server";
import { ALLOWED_MCP_SCOPES } from "@coffee-chat/core";
import { getAppOrigin } from "@/lib/runtime";

export async function GET(request: Request) {
  const origin = getAppOrigin(request);
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ALLOWED_MCP_SCOPES,
      client_id_metadata_document_supported: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
