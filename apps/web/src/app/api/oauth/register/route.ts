import {
  registerOAuthClientCimd,
  registerOAuthClientDcr,
} from "@coffee-chat/core";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.client_id === "string" && body.client_id.startsWith("https://")) {
      const registered = await registerOAuthClientCimd(db, {
        clientIdUrl: body.client_id,
        clientName: String(body.client_name ?? "MCP Client"),
        redirectUris: Array.isArray(body.redirect_uris)
          ? body.redirect_uris.map(String)
          : [],
      });
      return jsonNoStore(registered, { status: 201 });
    }

    const registered = await registerOAuthClientDcr(db, {
      clientName: String(body.client_name ?? ""),
      redirectUris: Array.isArray(body.redirect_uris)
        ? body.redirect_uris.map(String)
        : [],
    });
    return jsonNoStore(registered, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
