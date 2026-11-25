import { listUserGrants } from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getAppOrigin, getDb } from "@/lib/runtime";
import { ConnectClient } from "@/components/ConnectClient";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const origin = getAppOrigin();
  const user = await getCurrentUser();
  const grants = user ? await listUserGrants(await getDb(), user.id) : [];
  const activeGrants = grants.filter((g) => !g.revokedAt);

  return (
    <ConnectClient
      mcpUrl={`${origin}/api/mcp`}
      signedIn={Boolean(user)}
      activeGrantCount={activeGrants.length}
      connectedClientNames={activeGrants.map((g) => g.clientName || g.clientId)}
    />
  );
}
