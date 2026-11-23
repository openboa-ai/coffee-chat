import { redirect } from "next/navigation";
import { Notice } from "@openboa/yogurt";
import { getCurrentUser } from "@/lib/auth";
import { getMcpResourceUrl } from "@/lib/runtime";
import { ConsentClient } from "@/components/ConsentClient";

export const dynamic = "force-dynamic";

export default async function OAuthConsentPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await props.searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, v);
    }
    const returnTo = `/oauth/consent?${qs.toString()}`;
    redirect(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const clientId = params.client_id ?? "";
  const redirectUri = params.redirect_uri ?? "";
  const codeChallenge = params.code_challenge ?? "";
  const codeChallengeMethod = params.code_challenge_method ?? "S256";
  const scope = params.scope ?? "beans:read beans:write offline_access";
  const resource = params.resource ?? getMcpResourceUrl();

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <Notice title="Invalid OAuth request" tone="danger">
        Missing required client_id, redirect_uri, or PKCE code_challenge parameters.
      </Notice>
    );
  }

  return (
    <ConsentClient
      clientId={clientId}
      redirectUri={redirectUri}
      resource={resource}
      scope={scope}
      codeChallenge={codeChallenge}
      codeChallengeMethod={codeChallengeMethod}
      state={params.state}
      userHandle={user.handle}
    />
  );
}
