import { redirect } from "next/navigation";
import {
  getPersonalInsights,
  listBeansPage,
  listLinkedAccounts,
  listShelf,
  listUserGrants,
} from "@coffee-chat/core";
import { getCurrentUser, isTestAuthEnabled } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import {
  WorkspaceClient,
  type RoasteryTab,
} from "@/components/WorkspaceClient";

export const dynamic = "force-dynamic";

export default async function MyRoasteryPage(props: {
  searchParams: Promise<{ compose?: string; tab?: string; tag?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await props.searchParams;
  if (!user) {
    const qs = new URLSearchParams();
    if (params.compose === "1") qs.set("compose", "1");
    if (params.tab) qs.set("tab", params.tab);
    if (params.tag) qs.set("tag", params.tag);
    const returnTo = qs.toString() ? `/me?${qs.toString()}` : "/me";
    redirect(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const db = await getDb();
  const initialTab: RoasteryTab =
    params.tab === "insights" ||
    params.tab === "saved" ||
    params.tab === "settings"
      ? params.tab
      : "workspace";

  const [firstPage, allForRelations, insights, shelf, grants, linkedAccounts] =
    await Promise.all([
      listBeansPage(db, user.id, {
        scope: "mine",
        tag: params.tag || undefined,
        limit: 12,
        offset: 0,
      }),
      listBeansPage(db, user.id, { scope: "mine", limit: 100, offset: 0 }),
      getPersonalInsights(db, user.id),
      listShelf(db, user.id),
      listUserGrants(db, user.id),
      listLinkedAccounts(db, user.id),
    ]);

  return (
    <WorkspaceClient
      user={user}
      initialBeans={firstPage.items}
      initialTotalCount={firstPage.totalCount}
      initialAllBeansForRelations={allForRelations.items.map((b) => ({
        id: b.id,
        title: b.title,
      }))}
      initialInsights={insights}
      initialShelf={shelf}
      initialGrants={grants}
      initialAccounts={linkedAccounts}
      initialTab={initialTab}
      initialTag={params.tag ?? ""}
      startComposing={params.compose === "1"}
      testAuthEnabled={isTestAuthEnabled()}
      hasGithub={Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
      )}
      hasGoogle={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
    />
  );
}
