import { notFound } from "next/navigation";
import {
  CoffeeChatError,
  getSourceCompare,
  getViewerStanceForOrigin,
  listBeans,
  listHydratedShelfRefs,
  listUserGrants,
} from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { SourceCompareClient } from "@/components/SourceCompareClient";

export const dynamic = "force-dynamic";

export default async function SourceComparePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ add?: string }>;
}) {
  const { id } = await props.params;
  const search = await props.searchParams;
  const db = await getDb();
  const user = await getCurrentUser();

  // Privacy invariant: private-only URLs return 404 BEFORE any viewer stance lookup.
  let sourceView;
  try {
    sourceView = await getSourceCompare(db, id);
  } catch (err) {
    if (err instanceof CoffeeChatError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  const firstTitle =
    sourceView.beans
      .flatMap((b) => b.origins)
      .find((o) => o.url === sourceView.normalizedUrl && o.sourceTitle)
      ?.sourceTitle ?? null;

  const [viewerStance, shelfRefs, ownerBeans, grants] = user
    ? await Promise.all([
        getViewerStanceForOrigin(db, user.id, sourceView.originId),
        listHydratedShelfRefs(db, user.id),
        listBeans(db, user.id, { scope: "mine", limit: 100 }),
        listUserGrants(db, user.id),
      ])
    : [null, [], [], []];

  const activeGrantCount = user
    ? grants.filter((g) => !g.revokedAt).length
    : undefined;

  return (
    <SourceCompareClient
      originId={sourceView.originId}
      normalizedUrl={sourceView.normalizedUrl}
      sourceTitle={firstTitle}
      initialBeans={sourceView.beans}
      viewerStance={viewerStance}
      initialShelfRefs={shelfRefs}
      ownerBeanChoices={ownerBeans.map((b) => ({ id: b.id, title: b.title }))}
      signedIn={Boolean(user)}
      activeGrantCount={activeGrantCount}
      startAdding={search.add === "1"}
    />
  );
}
