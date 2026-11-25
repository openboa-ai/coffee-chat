import { listPublicSourcesPage } from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { SourcesDirectoryClient } from "@/components/SourcesDirectoryClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function SourcesDirectoryPage(props: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const query = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";

  const db = await getDb();
  const [user, result] = await Promise.all([
    getCurrentUser(),
    listPublicSourcesPage(db, {
      query: query || undefined,
      tag: tag || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  return (
    <SourcesDirectoryClient
      sources={result.items}
      totalCount={result.totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      initialQuery={query}
      initialTag={tag}
      signedIn={Boolean(user)}
    />
  );
}
