import {
  listBeans,
  prepareBean,
  saveBean,
} from "@coffee-chat/core";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    const scope = (searchParams.get("scope") ??
      (user ? "mine" : "public")) as "mine" | "public" | "shelf" | "all_accessible";
    const query = searchParams.get("q") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const ownerHandle = searchParams.get("handle") ?? undefined;

    const beans = await listBeans(db, user?.id ?? null, {
      scope,
      query,
      tag,
      ownerHandle,
    });
    return jsonNoStore({ beans });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.mode === "prepare") {
      const prepared = await prepareBean(db, user.id, body.input as never);
      return jsonNoStore({ prepared });
    }

    const result = await saveBean(db, user.id, body as never);
    return jsonNoStore(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
