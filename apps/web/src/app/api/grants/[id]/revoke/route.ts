import { revokeUserGrant } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const result = await revokeUserGrant(db, user.id, id);
    return jsonNoStore(result);
  } catch (err) {
    return handleApiError(err);
  }
}
