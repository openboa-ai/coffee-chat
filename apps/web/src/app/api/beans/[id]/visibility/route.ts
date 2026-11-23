import { setBeanVisibility } from "@coffee-chat/core";
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
    const body = (await request.json()) as {
      visibility: "private" | "public";
      expectedVersion: number;
      operationKey: string;
      redactionConfirmed?: boolean;
    };

    const result = await setBeanVisibility(db, user.id, {
      beanId: id,
      visibility: body.visibility,
      expectedVersion: body.expectedVersion,
      operationKey: body.operationKey,
      redactionConfirmed: body.redactionConfirmed,
    });
    return jsonNoStore(result);
  } catch (err) {
    return handleApiError(err);
  }
}
