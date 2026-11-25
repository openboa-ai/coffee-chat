"use client";

import { useState } from "react";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Inline } from "@openboa/yogurt/inline";
import { Notice } from "@openboa/yogurt/notice";
import { RecordFacts } from "@openboa/yogurt/record-facts";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import { PageHeader } from "@openboa/yogurt/top";

export interface ConsentClientProps {
  clientId: string;
  redirectUri: string;
  resource: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
  userHandle: string;
}

function describePermissions(scopeStr: string): string {
  const parts = scopeStr.split(/\s+/).filter(Boolean);
  const labels = parts.map((s) => {
    if (s === "beans:read") return "Read Beans & Shelf";
    if (s === "beans:write") return "Save confirmed Beans";
    if (s === "offline_access") return "Stay connected";
    return s;
  });
  return labels.join(" · ");
}

export function ConsentClient(props: ConsentClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: props.clientId,
          redirect_uri: props.redirectUri,
          resource: props.resource,
          scope: props.scope,
          code_challenge: props.codeChallenge,
          code_challenge_method: props.codeChallengeMethod,
          state: props.state,
        }),
      });
      const data = (await res.json()) as { redirectTo?: string; message?: string };
      if (!res.ok || !data.redirectTo) {
        throw new Error(data.message ?? "Authorization failed.");
      }
      window.location.href = data.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={24}>
      <PageHeader
        title="Brew Authorization"
        detail="Connect an AI app to your Roastery"
      />

      <Card
        title="Review AI app permissions"
        description={`Signed in as @${props.userHandle} — you can revoke access anytime from AI & Account`}
        variant="raised"
        density="regular"
      >
        <Stack gap={16}>
          {error ? (
            <Notice title="Authorization error" tone="danger">
              {error}
            </Notice>
          ) : null}

          <RecordFacts
            title="Connection request"
            source="Coffee Chat"
            asOf="Active request"
            facts={[
              { id: "client", label: "AI App", value: props.clientId },
              {
                id: "permissions",
                label: "Permissions",
                value: describePermissions(props.scope),
              },
              { id: "resource", label: "Endpoint", value: props.resource },
            ]}
          />

          <Text variant="help">
            Nothing is saved automatically by a connected AI app without your explicit confirmation.
          </Text>

          <Inline gap={12}>
            <Button
              emphasis="filled"
              tone="brand"
              pending={submitting}
              pendingLabel="Authorizing…"
              onClick={handleApprove}
            >
              Approve Brew Access
            </Button>
            <Button
              emphasis="quiet"
              disabled={submitting}
              onClick={() => {
                window.location.href = "/me?tab=settings";
              }}
            >
              Deny
            </Button>
          </Inline>
        </Stack>
      </Card>
    </Stack>
  );
}
