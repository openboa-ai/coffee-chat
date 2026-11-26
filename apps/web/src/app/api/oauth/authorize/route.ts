import { NextResponse } from "next/server";
import { approveOAuthAuthorization } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import {
  getAppOrigin,
  getDb,
  getMcpResourceUrl,
  handleApiError,
  jsonNoStore,
} from "@/lib/runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const consentUrl = new URL("/oauth/consent", getAppOrigin(request));
  url.searchParams.forEach((value, key) => {
    consentUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(consentUrl, { status: 302 });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as Record<string, unknown>;

    const clientId = String(body.client_id ?? "");
    const redirectUri = String(body.redirect_uri ?? "");
    const resource =
      typeof body.resource === "string" && body.resource.length > 0
        ? body.resource
        : getMcpResourceUrl(request);
    const scope = String(body.scope ?? "beans:read beans:write offline_access");
    const codeChallenge = String(body.code_challenge ?? "");
    const codeChallengeMethod = String(body.code_challenge_method ?? "S256");
    const state = typeof body.state === "string" ? body.state : undefined;

    const { code, grantId } = await approveOAuthAuthorization(db, {
      userId: user.id,
      clientId,
      redirectUri,
      resource,
      scopes: scope,
      codeChallenge,
      codeChallengeMethod,
    });

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set("code", code);
    if (state) callbackUrl.searchParams.set("state", state);

    return jsonNoStore({
      code,
      grantId,
      redirectTo: callbackUrl.toString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
