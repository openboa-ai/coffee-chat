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
        throw new Error(data.message ?? "Local sign-in failed.");
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
          <Badge tone="brand">Welcome to Coffee Chat</Badge>
          <Heading level={1}>Pull up a chair</Heading>
          <Text variant="help">
            Sign in to save your perspectives privately, share selected takes publicly, and bring
            other people&apos;s voices into your AI work.
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
            Social login activates automatically once GitHub or Google OAuth keys are configured.
          </Text>
        ) : null}

        {testAuthEnabled ? (
          <>
            <Divider />
            <Stack gap={12}>
              <Inline gap={8}>
                <Badge tone="accent">Instant Local Preview</Badge>
                <Text variant="meta">Dev/test only — disabled in production</Text>
              </Inline>

              <div className="cc-chip-row">
                <Button
                  emphasis="soft"
                  size="compact"
                  disabled={loading}
                  onClick={() => handleTestLogin("mina", "Mina Seo")}
                >
                  Try as @mina
                </Button>
                <Button
                  emphasis="soft"
                  size="compact"
                  disabled={loading}
                  onClick={() => handleTestLogin("jun", "Jun Park")}
                >
                  Try as @jun
                </Button>
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
              </div>

              <TextField
                label="Or start with your own handle"
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
                  Enter Coffee Chat
                </Button>
              </div>
            </Stack>
          </>
        ) : null}
      </Stack>
    </Surface>
  );
}
