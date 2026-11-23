import { notFound } from "next/navigation";
import { CoffeeChatError, getPersonProfile } from "@coffee-chat/core";
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

  let profile;
  try {
    profile = await getPersonProfile(db, viewer?.id ?? null, handle);
  } catch (err) {
    if (err instanceof CoffeeChatError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return <PersonClient profile={profile} signedIn={Boolean(viewer)} />;
}
