import {
  getBean,
  getSourceCompare,
  listBeansPage,
  listHydratedShelfRefs,
  listPublicPeople,
  listPublicSources,
  listUserGrants,
} from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function HomePage(props: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const query = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";

  const db = await getDb();
  const user = await getCurrentUser();

  const [
    corpusCheck,
    publicSources,
    people,
    filteredPage,
    shelfRefs,
    grants,
  ] = await Promise.all([
    listBeansPage(db, null, { scope: "public", limit: 1, offset: 0 }),
    listPublicSources(db, 10),
    listPublicPeople(db, 6),
    listBeansPage(db, null, {
      scope: "public",
      query: query || undefined,
      tag: tag || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    user ? listHydratedShelfRefs(db, user.id) : Promise.resolve([]),
    user ? listUserGrants(db, user.id) : Promise.resolve([]),
  ]);

  const featuredMeta =
    publicSources.find((s) => s.publicBeanCount >= 2) ??
    publicSources[0] ??
    null;

  const featuredTable = featuredMeta
    ? {
        originId: featuredMeta.originId,
        normalizedUrl: featuredMeta.normalizedUrl,
        sourceTitle: featuredMeta.sourceTitle,
        beans: (await getSourceCompare(db, featuredMeta.originId)).beans,
      }
    : null;

  const publicBeans = await Promise.all(
    filteredPage.items.map((s) => getBean(db, null, s.id)),
  );

  const activeGrantCount = user
    ? grants.filter((g) => !g.revokedAt).length
    : undefined;

  return (
    <HomeClient
      signedIn={Boolean(user)}
      totalCorpusPublicCount={corpusCheck.totalCount}
      featuredTable={featuredTable}
      people={people}
      publicBeans={publicBeans}
      filteredTotalCount={filteredPage.totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      initialQuery={query}
      initialTag={tag}
      initialShelfRefs={shelfRefs}
      activeGrantCount={activeGrantCount}
    />
  );
}
