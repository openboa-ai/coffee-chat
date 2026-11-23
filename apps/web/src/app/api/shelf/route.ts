import { addToShelf, listShelf, removeFromShelf } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const items = await listShelf(db, user.id);
    return jsonNoStore({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as
      | { targetType: "person"; handle: string }
      | { targetType: "bean"; beanId: string };
    const item = await addToShelf(db, user.id, body);
    return jsonNoStore({ item }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as { shelfItemId: string };
    const result = await removeFromShelf(db, user.id, body.shelfItemId);
    return jsonNoStore(result);
  } catch (err) {
    return handleApiError(err);
  }
}
