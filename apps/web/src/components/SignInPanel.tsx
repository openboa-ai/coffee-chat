"use client";

import { useState } from "react";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { ButtonGroup } from "@openboa/yogurt/button-group";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Grid } from "@openboa/yogurt/grid";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { ProjectMark } from "@openboa/yogurt/project-mark";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
import { TextField } from "@openboa/yogurt/text-field";

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
    <Grid className="auth-split-shell" gap={24}>
      <Card variant="raised" density="spacious">
        <Stack gap={24}>
          <Stack gap={6}>
            <Heading level={1}>Pull up a chair</Heading>
            <Text variant="help">
              Sign in to My Roastery — Roast private Beans, review Tasting
              Notes, and Brew your Taste in your Agents.
            </Text>
          </Stack>

          {error ? (
            <Notice title="Sign-in error" tone="danger">
              {error}
            </Notice>
          ) : null}

          <Stack gap={12}>
            <ButtonGroup label="Sign in with a provider">
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
            </ButtonGroup>

            {!hasGithub && !hasGoogle ? (
              <Text variant="meta">
                GitHub and Google sign-in activate automatically once OAuth
                credentials are configured. Accounts stay separate unless you
                explicitly link them in Brew Bar &amp; Account.
              </Text>
            ) : null}
          </Stack>

          {testAuthEnabled ? (
            <>
              <Divider />
              <Stack gap={16}>
                <Inline gap={8} align="center" wrap>
                  <Badge tone="accent" dot={false}>
                    Local Test Auth
                  </Badge>
                  <Text variant="meta">
                    Development &amp; E2E only — disabled in production
                  </Text>
                </Inline>

                <ButtonGroup label="Quick demo accounts">
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("claire", "Claire Brooks")}
                  >
                    Sign in as @claire
                  </Button>
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("david", "David Chen")}
                  >
                    Sign in as @david
                  </Button>
                  <Button
                    emphasis="soft"
                    size="compact"
                    disabled={loading}
                    onClick={() => handleTestLogin("hannah", "Hannah Kim")}
                  >
                    Sign in as @hannah
                  </Button>
                </ButtonGroup>

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
                    help="Shown on public Beans and your public profile"
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

      <Surface variant="raised" className="auth-brand-panel">
        <Stack gap={16}>
          <ProjectMark project="coffee" label="" size={96} />
          <Stack gap={8}>
            <Heading level={2}>
              Your Taste, across{" "}
              <em className="cc-accent-ink">every Agent.</em>
            </Heading>
            <Text as="p" variant="help">
              Distill the real calls and reading takeaways you already care
              about into confirmed Beans that travel across every Agent you use.
            </Text>
          </Stack>
        </Stack>

        <ul className="auth-principles" aria-label="Coffee Chat principles">
          <li>
            <span className="auth-principle-kicker">01 · Private by default</span>
            <Text variant="help">
              Every Bean starts private in My Roastery until you choose to put
              it On the Table.
            </Text>
          </li>
          <li>
            <span className="auth-principle-kicker">
              02 · Confirmed by you
            </span>
            <Text variant="help">
              No Agent can silently write or publish a Bean without your
              explicit sign-off.
            </Text>
          </li>
          <li>
            <span className="auth-principle-kicker">
              03 · Zero server models
            </span>
            <Text variant="help">
              Coffee Chat stores structured trade-offs and boundaries—your own
              Agents do all the thinking.
            </Text>
          </li>
        </ul>
      </Surface>
    </Grid>
  );
}
