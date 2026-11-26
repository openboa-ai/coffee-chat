import {
  CoffeeChatError,
  linkProviderAccount,
  listLinkedAccounts,
  unlinkProviderAccount,
} from "@coffee-chat/core";
import { isTestAuthEnabled, requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const accounts = await listLinkedAccounts(db, user.id);
    return jsonNoStore({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    if (!isTestAuthEnabled()) {
      throw new CoffeeChatError(
        "FORBIDDEN",
        403,
        "Direct account linking is disabled outside test-auth mode. Use verified OAuth linking.",
      );
    }
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as {
      providerId: "github" | "google" | "local-test";
      providerAccountId: string;
    };
    const account = await linkProviderAccount(
      db,
      user.id,
      body.providerId,
      body.providerAccountId,
    );
    return jsonNoStore({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as { accountId: string };
    const result = await unlinkProviderAccount(db, user.id, body.accountId);
    return jsonNoStore(result);
  } catch (err) {
    return handleApiError(err);
  }
}
