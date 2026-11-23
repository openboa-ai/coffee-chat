import { notFound } from "next/navigation";
import { CoffeeChatError, getSourceCompare } from "@coffee-chat/core";
import { getDb } from "@/lib/runtime";
import { SourceCompareClient } from "@/components/SourceCompareClient";

export const dynamic = "force-dynamic";

export default async function SourceComparePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const db = await getDb();

  let sourceView;
  try {
    sourceView = await getSourceCompare(db, id);
  } catch (err) {
    if (err instanceof CoffeeChatError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return (
    <SourceCompareClient
      normalizedUrl={sourceView.normalizedUrl}
      beans={sourceView.beans}
    />
  );
}
