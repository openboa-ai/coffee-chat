import { getPersonalInsights } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const insights = await getPersonalInsights(db, user.id);
    return jsonNoStore({ insights });
  } catch (err) {
    return handleApiError(err);
  }
}
