import { redirect } from "next/navigation";
import { getCurrentUser, isTestAuthEnabled } from "@/lib/auth";
import { SignInPanel } from "@/components/SignInPanel";

export const dynamic = "force-dynamic";

export default async function SignInPage(props: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await props.searchParams;
  const returnTo = params.returnTo?.startsWith("/") ? params.returnTo : "/me";

  if (user) {
    redirect(returnTo);
  }

  return (
    <SignInPanel
      testAuthEnabled={isTestAuthEnabled()}
      hasGithub={Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
      )}
      hasGoogle={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      returnTo={returnTo}
    />
  );
}
