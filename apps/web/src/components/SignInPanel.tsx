"use client";

import { useState } from "react";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { TextField } from "@openboa/yogurt/text-field";
import { PageHeader } from "@openboa/yogurt/top";

export interface SignInPanelProps {
  testAuthEnabled: boolean;
  hasGithub: boolean;
  hasGoogle: boolean;
  returnTo?: string;
}

export function SignInPanel({
  testAuthEnabled,
  hasGithub,
  hasGoogle,
  returnTo = "/me",
}: SignInPanelProps) {
  const [handle, setHandle] = useState("alice");
  const [name, setName] = useState("Alice Park");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeReturnTo =
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("\\")
      ? returnTo
      : "/me";

  const handleSocial = async (provider: "github" | "google") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, callbackURL: safeReturnTo }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message ?? `Could not start ${provider} sign-in.`);
    } catch {
      setError(`Could not reach ${provider} sign-in endpoint.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (
    presetHandle?: string,
    presetName?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const targetHandle = (presetHandle ?? handle).trim().toLowerCase();
      const targetName = (presetName ?? name).trim() || targetHandle;
      const res = await fetch("/api/test-auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: targetHandle,
          name: targetName,
          email: `${targetHandle}@example.test`,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Local sign-in failed.");
      }
      window.location.href = safeReturnTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap={24}>
      <PageHeader
        title="Pull up a chair"
        detail="Sign in to My Roastery — Roast private Beans, check Tasting Notes, and Brew your Taste in AI"
      />

      <Card
        title="Enter My Roastery"
        description="Accounts stay separate unless you explicitly link them in Brew Bar & Account"
        variant="raised"
        density="regular"
      >
        <Stack gap={16}>
          {error ? (
            <Notice title="Sign-in error" tone="danger">
              {error}
            </Notice>
          ) : null}

          <Inline gap={12}>
            <Button
              emphasis="filled"
              tone="brand"
              disabled={!hasGithub || loading}
              onClick={() => handleSocial("github")}
            >
              Continue with GitHub
            </Button>
            <Button
              emphasis="soft"
              disabled={!hasGoogle || loading}
              onClick={() => handleSocial("google")}
            >
              Continue with Google
            </Button>
          </Inline>

          {!hasGithub && !hasGoogle ? (
            <Text variant="meta">
              GitHub and Google sign-in activate automatically once OAuth client
              credentials are configured in the environment.
            </Text>
          ) : null}

          {testAuthEnabled ? (
            <>
              <Divider />
              <Stack gap={12}>
                <Inline gap={8} align="center">
                  <Badge tone="accent" dot={false}>
                    Local Test Auth
                  </Badge>
                  <Text variant="meta">
                    Development and E2E only — disabled in production
                  </Text>
                </Inline>

                <Inline gap={8} wrap>
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("mina", "Mina Seo")}
                  >
                    Sign in as @mina
                  </Button>
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("jun", "Jun Park")}
                  >
                    Sign in as @jun
                  </Button>
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("sora", "Sora Han")}
                  >
                    Sign in as @sora
                  </Button>
                </Inline>

                <Stack gap={12}>
                  <TextField
                    label="Handle"
                    help="Lowercase profile handle for local testing"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="alice"
                  />
                  <TextField
                    label="Display Name"
                    help="Shown on public Beans and your Voice Profile"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alice Park"
                  />
                  <Inline gap={8}>
                    <Button
                      emphasis="filled"
                      tone="neutral"
                      pending={loading}
                      disabled={!handle.trim() || loading}
                      onClick={() => handleTestLogin()}
                    >
                      Enter Roastery (Test Auth)
                    </Button>
                  </Inline>
                </Stack>
              </Stack>
            </>
          ) : null}
        </Stack>
      </Card>
    </Stack>
  );
}
