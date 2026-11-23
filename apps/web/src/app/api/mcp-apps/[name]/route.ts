import { NextResponse } from "next/server";
import { getMcpAppResource, MCP_APP_MIME_TYPE } from "@coffee-chat/mcp-apps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const clean = name.replace(/\.html$/, "");
  const resource = getMcpAppResource(`ui://coffee-chat/${clean}.html`);
  if (!resource) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return new NextResponse(resource.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-MCP-App-Mime": MCP_APP_MIME_TYPE,
      "Cache-Control": "no-store",
    },
  });
}
