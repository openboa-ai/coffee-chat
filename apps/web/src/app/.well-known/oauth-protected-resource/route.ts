import { NextResponse } from "next/server";
import { ALLOWED_MCP_SCOPES } from "@coffee-chat/core";
import { getAppOrigin, getMcpResourceUrl } from "@/lib/runtime";

export async function GET(request: Request) {
  const origin = getAppOrigin(request);
  return NextResponse.json(
    {
      resource: getMcpResourceUrl(request),
      authorization_servers: [origin],
      scopes_supported: ALLOWED_MCP_SCOPES,
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
