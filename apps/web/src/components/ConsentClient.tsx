"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Heading,
  Inline,
  Notice,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";

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
    <Surface className="cc-card">
      <Stack gap={16}>
        <Badge tone="brand">OAuth 2.1 MCP Consent</Badge>
        <Heading level={2}>Authorize MCP Client</Heading>
        <Text variant="help">
          Signed in as <strong>@{props.userHandle}</strong>. An external agent host is requesting
          access to your Coffee Chat MCP endpoint.
        </Text>

        {error ? (
          <Notice title="Authorization error" tone="danger">
            {error}
          </Notice>
        ) : null}

        <div className="cc-muted-box">
          <Stack gap={4}>
            <Text variant="meta">Client ID: {props.clientId}</Text>
            <Text variant="meta">Resource: {props.resource}</Text>
            <Text variant="meta">Requested scopes: {props.scope}</Text>
          </Stack>
        </div>

        <Inline gap={12}>
          <Button
            emphasis="filled"
            tone="brand"
            pending={submitting}
            onClick={handleApprove}
          >
            Approve Access
          </Button>
          <Button
            emphasis="quiet"
            onClick={() => {
              window.location.href = "/me";
            }}
          >
            Cancel
          </Button>
        </Inline>
      </Stack>
    </Surface>
  );
}
