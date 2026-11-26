import {
  CoffeeChatError,
  exchangeAuthorizationCode,
  refreshOAuthToken,
} from "@coffee-chat/core";
import {
  getDb,
  getMcpResourceUrl,
  handleApiError,
  jsonNoStore,
} from "@/lib/runtime";

async function parseTokenBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      out[k] = String(v);
    }
    return out;
  }
  const raw = (await request.json()) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await parseTokenBody(request);
    const grantType = body.grant_type;
    const resource = body.resource || getMcpResourceUrl(request);

    if (grantType === "authorization_code") {
      const tokens = await exchangeAuthorizationCode(db, {
        code: body.code ?? "",
        clientId: body.client_id ?? "",
        redirectUri: body.redirect_uri ?? "",
        codeVerifier: body.code_verifier ?? "",
        resource,
      });
      return jsonNoStore(tokens);
    }

    if (grantType === "refresh_token") {
      const tokens = await refreshOAuthToken(db, {
        refreshToken: body.refresh_token ?? "",
        clientId: body.client_id ?? "",
        resource,
      });
      return jsonNoStore(tokens);
    }

    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      `Unsupported grant_type: "${grantType ?? ""}"`,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
