"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Heading,
  Inline,
  Notice,
  Stack,
  Surface,
  Text,
  TextField,
} from "@openboa/yogurt";

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

  const handleSocial = async (provider: "github" | "google") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, callbackURL: returnTo }),
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

  const handleTestLogin = async (presetHandle?: string, presetName?: string) => {
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
        throw new Error(data.message ?? "Local test sign-in failed.");
      }
      window.location.href = returnTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface className="cc-card">
      <Stack gap={16}>
        <Stack gap={4}>
          <Badge tone="brand">Authentication</Badge>
          <Heading level={2}>Sign in to Coffee Chat</Heading>
          <Text variant="help">
            Sign in with GitHub or Google. Additional providers can be linked explicitly later in
            your Roastery settings.
          </Text>
        </Stack>

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
            Configure GITHUB_CLIENT_ID/SECRET or GOOGLE_CLIENT_ID/SECRET in environment variables to
            enable production social sign-in.
          </Text>
        ) : null}

        {testAuthEnabled ? (
          <>
            <Divider />
            <Stack gap={12}>
              <Inline gap={8}>
                <Badge tone="warning">Local Dev / Test Adapter</Badge>
                <Text variant="meta">Disabled automatically in production</Text>
              </Inline>

              <Inline gap={8}>
                <Button
                  emphasis="soft"
                  size="compact"
                  disabled={loading}
                  onClick={() => handleTestLogin("alice", "Alice Park")}
                >
                  Quick sign in as @alice
                </Button>
                <Button
                  emphasis="soft"
                  size="compact"
                  disabled={loading}
                  onClick={() => handleTestLogin("bob", "Bob Kim")}
                >
                  Quick sign in as @bob
                </Button>
              </Inline>

              <TextField
                label="Custom test handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
              <TextField
                label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div>
                <Button
                  emphasis="filled"
                  tone="brand"
                  pending={loading}
                  onClick={() => handleTestLogin()}
                >
                  Sign in with local test account
                </Button>
              </div>
            </Stack>
          </>
        ) : null}
      </Stack>
    </Surface>
  );
}
