import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { CoffeeChatDb } from "../db/client.js";
import { beanRevisions, beans, shelfItems, users } from "../db/schema.js";
import {
  CoffeeChatError,
  type HydratedShelfRef,
  type NormalizedOrigin,
} from "../types.js";

function extractFirstSourceOriginId(originsJson: unknown): string | null {
  const list = (originsJson ?? []) as NormalizedOrigin[];
  const found = list.find(
    (o) => o.kind === "source_excerpt" && typeof o.originId === "string" && o.originId.length > 0,
  );
  return found?.originId ?? null;
}

export interface ShelfEntryView {
  id: string;
  targetType: "person" | "bean";
  createdAt: string;
  person?: {
    userId: string;
    handle: string;
    displayName: string;
    publicBeanCount: number;
  };
  bean?: {
    beanId: string;
    title: string;
    tradeoff: string;
    ownerHandle: string;
    ownerDisplayName: string;
    version: number;
    firstSourceOriginId: string | null;
  };
}

export async function addToShelf(
  db: CoffeeChatDb,
  userId: string,
  input:
    | { targetType: "person"; handle: string }
    | { targetType: "bean"; beanId: string },
): Promise<ShelfEntryView> {
  if (input.targetType === "person") {
    const cleanHandle = input.handle.replace(/^@/, "").trim().toLowerCase();
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.handle, cleanHandle))
      .limit(1);

    if (!target) {
      throw new CoffeeChatError(
        "NOT_FOUND",
        404,
        `Person @${cleanHandle} not found.`,
      );
    }

    const existing = await db
      .select()
      .from(shelfItems)
      .where(
        and(
          eq(shelfItems.userId, userId),
          eq(shelfItems.targetType, "person"),
          eq(shelfItems.targetUserId, target.id),
        ),
      )
      .limit(1);

    const item =
      existing[0] ??
      (
        await db
          .insert(shelfItems)
          .values({
            id: randomUUID(),
            userId,
            targetType: "person",
            targetUserId: target.id,
            targetBeanId: null,
          })
          .returning()
      )[0]!;

    const publicBeans = await db
      .select({ id: beans.id })
      .from(beans)
      .where(and(eq(beans.ownerId, target.id), eq(beans.visibility, "public")));

    return {
      id: item.id,
      targetType: "person",
      createdAt: item.createdAt.toISOString(),
      person: {
        userId: target.id,
        handle: target.handle,
        displayName: target.name,
        publicBeanCount: publicBeans.length,
      },
    };
  }

  // Target is a specific Bean: MUST currently be public (or owned by caller).
  const [targetBean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, input.beanId))
    .limit(1);

  if (!targetBean || targetBean.visibility !== "public") {
    throw new CoffeeChatError("NOT_FOUND", 404, "Public Bean not found.");
  }

  const existing = await db
    .select()
    .from(shelfItems)
    .where(
      and(
        eq(shelfItems.userId, userId),
        eq(shelfItems.targetType, "bean"),
        eq(shelfItems.targetBeanId, targetBean.id),
      ),
    )
    .limit(1);

  const item =
    existing[0] ??
    (
      await db
        .insert(shelfItems)
        .values({
          id: randomUUID(),
          userId,
          targetType: "bean",
          targetUserId: null,
          targetBeanId: targetBean.id,
        })
        .returning()
    )[0]!;

  const [rev] = targetBean.currentRevisionId
    ? await db
        .select()
        .from(beanRevisions)
        .where(eq(beanRevisions.id, targetBean.currentRevisionId))
        .limit(1)
    : [];
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetBean.ownerId))
    .limit(1);

  return {
    id: item.id,
    targetType: "bean",
    createdAt: item.createdAt.toISOString(),
    bean: {
      beanId: targetBean.id,
      title: rev?.title ?? "",
      tradeoff: rev?.tradeoff ?? "",
      ownerHandle: owner?.handle ?? "unknown",
      ownerDisplayName: owner?.name ?? "Unknown",
      version: targetBean.version,
      firstSourceOriginId: extractFirstSourceOriginId(rev?.originsJson),
    },
  };
}

export async function removeFromShelf(
  db: CoffeeChatDb,
  userId: string,
  shelfItemId: string,
): Promise<{ removed: boolean }> {
  const deleted = await db
    .delete(shelfItems)
    .where(and(eq(shelfItems.id, shelfItemId), eq(shelfItems.userId, userId)))
    .returning({ id: shelfItems.id });

  return { removed: deleted.length > 0 };
}

/**
 * Resolves live Shelf entries. Any target Bean that became private or was deleted
 * is omitted immediately — never cached or copied into the viewer's ownership.
 */
export async function listShelf(
  db: CoffeeChatDb,
  userId: string,
): Promise<ShelfEntryView[]> {
  const rows = await db
    .select()
    .from(shelfItems)
    .where(eq(shelfItems.userId, userId));

  const results: ShelfEntryView[] = [];
  for (const row of rows) {
    if (row.targetType === "person" && row.targetUserId) {
      const [target] = await db
        .select()
        .from(users)
        .where(eq(users.id, row.targetUserId))
        .limit(1);
      if (!target) continue;
      const publicBeans = await db
        .select({ id: beans.id })
        .from(beans)
        .where(
          and(eq(beans.ownerId, target.id), eq(beans.visibility, "public")),
        );
      results.push({
        id: row.id,
        targetType: "person",
        createdAt: row.createdAt.toISOString(),
        person: {
          userId: target.id,
          handle: target.handle,
          displayName: target.name,
          publicBeanCount: publicBeans.length,
        },
      });
    } else if (row.targetType === "bean" && row.targetBeanId) {
      const [targetBean] = await db
        .select()
        .from(beans)
        .where(eq(beans.id, row.targetBeanId))
        .limit(1);
      // Live visibility check: private or deleted Beans vanish immediately.
      if (!targetBean || targetBean.visibility !== "public") continue;
      const [rev] = targetBean.currentRevisionId
        ? await db
            .select()
            .from(beanRevisions)
            .where(eq(beanRevisions.id, targetBean.currentRevisionId))
            .limit(1)
        : [];
      const [owner] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetBean.ownerId))
        .limit(1);
      if (!rev || !owner) continue;
      results.push({
        id: row.id,
        targetType: "bean",
        createdAt: row.createdAt.toISOString(),
        bean: {
          beanId: targetBean.id,
          title: rev.title,
          tradeoff: rev.tradeoff,
          ownerHandle: owner.handle,
          ownerDisplayName: owner.name,
          version: targetBean.version,
          firstSourceOriginId: extractFirstSourceOriginId(rev.originsJson),
        },
      });
    }
  }

  return results;
}

/**
 * Compact live Shelf reference list used by browse SSR pages to hydrate
 * Save / On Shelf toggle state and pass shelfItemId directly to DELETE /api/shelf.
 */
export async function listHydratedShelfRefs(
  db: CoffeeChatDb,
  userId: string,
): Promise<HydratedShelfRef[]> {
  const entries = await listShelf(db, userId);
  const refs: HydratedShelfRef[] = [];
  for (const entry of entries) {
    if (entry.targetType === "person" && entry.person) {
      refs.push({
        targetType: "person",
        targetId: entry.person.userId,
        shelfItemId: entry.id,
      });
    } else if (entry.targetType === "bean" && entry.bean) {
      refs.push({
        targetType: "bean",
        targetId: entry.bean.beanId,
        shelfItemId: entry.id,
      });
    }
  }
  return refs;
}
