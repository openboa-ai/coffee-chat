import { notFound } from "next/navigation";
import { CoffeeChatError, getSourceCompare } from "@coffee-chat/core";
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

  return (
    <SourceCompareClient
      originId={sourceView.originId}
      normalizedUrl={sourceView.normalizedUrl}
      sourceTitle={firstTitle}
      initialBeans={sourceView.beans}
      signedIn={Boolean(user)}
      startAdding={search.add === "1"}
    />
  );
}
