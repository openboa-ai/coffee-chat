import { listUserGrants } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const grants = await listUserGrants(db, user.id);
    return jsonNoStore({ grants });
  } catch (err) {
    return handleApiError(err);
  }
}
