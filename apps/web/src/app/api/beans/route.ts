import {
  listBeansPage,
  prepareBean,
  saveBean,
  type BeanLifecycleState,
  type OriginKind,
  type Visibility,
} from "@coffee-chat/core";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError, jsonNoStore } from "@/lib/runtime";

function parseNonNegativeInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);

    const scope = (searchParams.get("scope") ??
      (user ? "mine" : "public")) as
      | "mine"
      | "public"
      | "shelf"
      | "all_accessible";
    const query = searchParams.get("q") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const ownerHandle = searchParams.get("handle") ?? undefined;
    const rawOriginKind = searchParams.get("originKind");
    const originKind: OriginKind | undefined =
      rawOriginKind === "source_excerpt" || rawOriginKind === "work_episode"
        ? rawOriginKind
        : undefined;
    const rawLifecycle = searchParams.get("lifecycleState");
    const lifecycleState: BeanLifecycleState | undefined =
      rawLifecycle === "active" ||
      rawLifecycle === "in_tension" ||
      rawLifecycle === "superseded"
        ? rawLifecycle
        : undefined;
    const rawVisibility = searchParams.get("visibility");
    const visibility: Visibility | undefined =
      rawVisibility === "private" || rawVisibility === "public"
        ? rawVisibility
        : undefined;
    const offset = parseNonNegativeInt(searchParams.get("offset"));
    const limit = parseNonNegativeInt(searchParams.get("limit"));

    const page = await listBeansPage(db, user?.id ?? null, {
      scope,
      query,
      tag,
      ownerHandle,
      originKind,
      lifecycleState,
      visibility,
      offset,
      limit,
    });
    return jsonNoStore({
      beans: page.items,
      totalCount: page.totalCount,
      hasMore: page.hasMore,
    });
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
