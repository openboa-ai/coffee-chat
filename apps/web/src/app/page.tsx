import {
  getBean,
  getSourceCompare,
  listBeans,
  listPublicPeople,
  listPublicSources,
} from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const user = await getCurrentUser();

  const [publicSources, people, publicSummaries] = await Promise.all([
    listPublicSources(db, 10),
    listPublicPeople(db, 6),
    listBeans(db, null, { scope: "public", limit: 12 }),
  ]);

  // Prefer the first source with 2+ contrasting takes for the featured Coffee Chat Table.
  const featuredMeta =
    publicSources.find((s) => s.publicBeanCount >= 2) ?? publicSources[0] ?? null;

  const featuredSource = featuredMeta
    ? {
        originId: featuredMeta.originId,
        normalizedUrl: featuredMeta.normalizedUrl,
        sourceTitle: featuredMeta.sourceTitle,
        beans: (await getSourceCompare(db, featuredMeta.originId)).beans,
      }
    : null;

  const recentPublicBeans = await Promise.all(
    publicSummaries.map((s) => getBean(db, null, s.id)),
  );

  return (
    <HomeClient
      signedIn={Boolean(user)}
      featuredSource={featuredSource}
      people={people}
      recentPublicBeans={recentPublicBeans}
    />
  );
}
