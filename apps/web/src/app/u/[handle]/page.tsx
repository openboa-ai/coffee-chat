import { notFound } from "next/navigation";
import {
  CoffeeChatError,
  getPersonProfile,
  listHydratedShelfRefs,
  listUserGrants,
} from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";
import { PersonClient } from "@/components/PersonClient";

export const dynamic = "force-dynamic";

export default async function PersonPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await props.params;
  const db = await getDb();
  const viewer = await getCurrentUser();

  // Privacy invariant: ALWAYS pass null viewerId to getPersonProfile so public profiles
  // never leak private relations even when the owner previews their own page.
  let profile;
  try {
    profile = await getPersonProfile(db, null, handle);
  } catch (err) {
    if (err instanceof CoffeeChatError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  const [shelfRefs, grants] = viewer
    ? await Promise.all([
        listHydratedShelfRefs(db, viewer.id),
        listUserGrants(db, viewer.id),
      ])
    : [[], []];

  const activeGrantCount = viewer
    ? grants.filter((g) => !g.revokedAt).length
    : undefined;

  return (
    <PersonClient
      profile={profile}
      initialShelfRefs={shelfRefs}
      signedIn={Boolean(viewer)}
      activeGrantCount={activeGrantCount}
    />
  );
}
