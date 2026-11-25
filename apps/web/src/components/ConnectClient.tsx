"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { CodeBlock } from "@openboa/yogurt/code-block";
import { Inline } from "@openboa/yogurt/inline";
import { CopyButton } from "@openboa/yogurt/motion-copy-button";
import { Notice } from "@openboa/yogurt/notice";
import { Stack } from "@openboa/yogurt/stack";
import { Tabs } from "@openboa/yogurt/tabs";
import { Text } from "@openboa/yogurt/text";
import { PageHeader } from "@openboa/yogurt/top";

export interface ConnectClientProps {
  mcpUrl: string;
  signedIn: boolean;
  activeGrantCount: number;
  connectedClientNames: string[];
}

export function ConnectClient({
  mcpUrl,
  signedIn,
  activeGrantCount,
  connectedClientNames,
}: ConnectClientProps) {
  const router = useRouter();
  const [hostTab, setHostTab] = useState("codex");

  const copyText = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const hostConfigs = [
    {
      id: "codex",
      label: "Codex",
      language: "toml",
      hint: "Add Coffee Chat in ~/.codex/config.toml, then sign in once when prompted.",
      code: `[mcp_servers.coffee_chat]\nurl = "${mcpUrl}"`,
    },
    {
      id: "claude",
      label: "Claude Code",
      language: "bash",
      hint: "Register Coffee Chat once from your terminal; OAuth sign-in opens automatically.",
      code: `claude mcp add --transport http coffee-chat "${mcpUrl}"`,
    },
    {
      id: "chatgpt",
      label: "ChatGPT",
      language: "text",
      hint: "In Settings → Apps & Connectors → Add Custom Connector, enter this server URL and approve access.",
      code: `Connector URL: ${mcpUrl}\nAuth: OAuth (automatic discovery)`,
    },
    {
      id: "antigravity",
      label: "Antigravity",
      language: "json",
      hint: "Add Coffee Chat to your Antigravity remote connector config and approve on first use.",
      code: JSON.stringify(
        {
          mcpServers: {
            "coffee-chat": {
              url: mcpUrl,
            },
          },
        },
        null,
        2,
      ),
    },
    {
      id: "cursor",
      label: "Cursor",
      language: "json",
      hint: "Add to .cursor/mcp.json to Brew your Beans directly inside Cursor.",
      code: JSON.stringify(
        {
          mcpServers: {
            "coffee-chat": {
              url: mcpUrl,
            },
          },
        },
        null,
        2,
      ),
    },
  ];

  const starterPrompts = [
    {
      id: "brew-work",
      title: "Brew · Apply my Beans to a work call",
      description: "Shape concrete trade-offs and respect every stated boundary",
      prompt:
        "Before proposing a design for this task, check my confirmed Coffee Chat Beans on this topic. Apply the matching trade-offs, name which Bean guided each choice, and withhold any Bean outside its boundary.",
    },
    {
      id: "roast-work",
      title: "Roast · Capture a new Work Origin Bean",
      description: "Turn a correction into a private Bean after your confirmation",
      prompt:
        "Turn the correction I just gave you into a private Coffee Chat Bean draft with a concise take, the priority trade-off, and when it doesn't apply. Show it to me for confirmation before saving anything.",
    },
    {
      id: "brew-table",
      title: "Tables · Compare voices on a link",
      description: "Contrast public perspectives without impersonation",
      prompt:
        "Check the public Coffee Chat Table for this article and compare how different voices weigh trade-offs and boundaries. Highlight where their views diverge from my own Beans.",
    },
  ];

  return (
    <Stack gap={24}>
      <PageHeader
        title="Brew Setup"
        detail="Connect your AI apps once — Brew your confirmed Beans and Shelf wherever you work"
        action={
          signedIn ? (
            <Button
              emphasis="soft"
              size="compact"
              onClick={() => router.push("/me?tab=settings")}
            >
              Manage AI &amp; Account
            </Button>
          ) : (
            <Button
              emphasis="filled"
              tone="brand"
              size="compact"
              onClick={() => router.push("/signin?returnTo=/connect")}
            >
              Sign in first
            </Button>
          )
        }
      />

      {signedIn ? (
        activeGrantCount > 0 ? (
          <Notice
            title={`Brew Ready · ${activeGrantCount} active AI ${activeGrantCount === 1 ? "connection" : "connections"}`}
            tone="success"
            action={
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/me?tab=settings")}
              >
                Review connections
              </Button>
            }
          >
            Connected hosts:{" "}
            {connectedClientNames.length > 0
              ? connectedClientNames.join(", ")
              : "Active AI app"}
            . Your Beans stay private to you and your connected AI until you put
            one On the Table.
          </Notice>
        ) : (
          <Notice title="No AI app connected yet" tone="neutral">
            Pick your AI host below, copy the setup snippet, and approve access
            once. You can revoke any connection instantly from AI &amp; Account.
          </Notice>
        )
      ) : (
        <Notice title="Private by default" tone="neutral">
          Your AI connects with secure sign-in approval and never saves a Bean
          without your explicit confirmation.
        </Notice>
      )}

      <Card
        title="Step 1 · Add Coffee Chat to your AI host"
        description="Choose your AI app below — automatic discovery handles sign-in and permissions"
        headerAction={
          <Badge tone="neutral" dot={false}>
            5 hosts supported
          </Badge>
        }
        variant="raised"
        density="regular"
      >
        <Tabs
          label="AI host setup"
          value={hostTab}
          onValueChange={setHostTab}
          items={hostConfigs.map((cfg) => ({
            id: cfg.id,
            label: cfg.label,
            panel: (
              <Stack gap={12}>
                <Text variant="help">{cfg.hint}</Text>
                <CodeBlock
                  code={cfg.code}
                  language={cfg.language}
                  onCopy={copyText}
                />
                <Inline gap={8}>
                  <CopyButton value={cfg.code} onCopy={copyText} />
                </Inline>
              </Stack>
            ),
          }))}
        />
      </Card>

      <Stack gap={12}>
        <Stack gap={2}>
          <Text variant="body">Step 2 · Plain-language starter prompts</Text>
          <Text variant="meta">
            Copy any prompt into your connected AI — zero technical syntax
            needed
          </Text>
        </Stack>
        <div className="split-grid">
          {starterPrompts.map((item) => (
            <Card
              key={item.id}
              title={item.title}
              description={item.description}
              action={<CopyButton value={item.prompt} onCopy={copyText} />}
              variant="raised"
              density="regular"
            >
              <Text variant="help">{item.prompt}</Text>
            </Card>
          ))}
        </div>
      </Stack>
    </Stack>
  );
}
