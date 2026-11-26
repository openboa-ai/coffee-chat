import { deleteBean, getBean } from "@coffee-chat/core";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const user = await getCurrentUser(request);
    const bean = await getBean(db, user?.id ?? null, id);
    return jsonNoStore({ bean });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as {
      expectedVersion: number;
      operationKey: string;
    };
    const result = await deleteBean(db, user.id, {
      beanId: id,
      expectedVersion: body.expectedVersion,
      operationKey: body.operationKey,
    });
    return jsonNoStore(result);
  } catch (err) {
    return handleApiError(err);
  }
}
