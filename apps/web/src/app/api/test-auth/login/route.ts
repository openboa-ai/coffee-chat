import { ensureUser } from "@coffee-chat/core";
import { isTestAuthEnabled, TEST_SESSION_COOKIE } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

/**
 * Dev/test-only local login adapter for deterministic automated E2E verification.
 * Strictly disabled in production (returns 404).
 */
export async function POST(request: Request) {
  if (!isTestAuthEnabled()) {
    return jsonNoStore({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const db = await getDb();
    const body = (await request.json()) as {
      handle?: string;
      name?: string;
      email?: string;
      providerId?: string;
    };

    const handle = (body.handle || "alice").trim().toLowerCase();
    const name = (body.name || handle).trim();
    const email = (body.email || `${handle}@example.test`).trim().toLowerCase();
    const providerId = body.providerId || "github";

    const user = await ensureUser(db, {
      handle,
      name,
      email,
      providerId,
      providerAccountId: `${providerId}-${handle}`,
    });

    const response = jsonNoStore({ user });
    response.cookies.set(TEST_SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
