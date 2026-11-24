import { redirect } from "next/navigation";
import {
  getBean,
  listBeans,
  listLinkedAccounts,
  listShelf,
  listUserGrants,
} from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { RoasteryClient } from "@/components/RoasteryClient";

export const dynamic = "force-dynamic";

export default async function MyRoasteryPage(props: {
  searchParams: Promise<{ compose?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await props.searchParams;
  if (!user) {
    redirect(params.compose === "1" ? "/signin?returnTo=/me?compose=1" : "/signin?returnTo=/me");
  }

  const db = await getDb();
  const summaries = await listBeans(db, user.id, { scope: "mine", limit: 100 });
  const details = await Promise.all(
    summaries.map((s) => getBean(db, user.id, s.id)),
  );
  const shelf = await listShelf(db, user.id);
  const grants = await listUserGrants(db, user.id);
  const linkedAccounts = await listLinkedAccounts(db, user.id);

  return (
    <RoasteryClient
      user={user}
      initialBeans={details}
      initialShelf={shelf}
      initialGrants={grants}
      initialAccounts={linkedAccounts}
      startComposing={params.compose === "1"}
    />
  );
}
