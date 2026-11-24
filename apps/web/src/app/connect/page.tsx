import { getAppOrigin } from "@/lib/runtime";
import { ConnectClient } from "@/components/ConnectClient";

export const dynamic = "force-dynamic";

export default function ConnectPage() {
  const origin = getAppOrigin();
  return <ConnectClient mcpUrl={`${origin}/api/mcp`} />;
}
