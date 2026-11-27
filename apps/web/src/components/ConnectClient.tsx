"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { CodeBlock } from "@openboa/yogurt/code-block";
import { Inline } from "@openboa/yogurt/inline";
import { ListHeader } from "@openboa/yogurt/list-header";
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
  const [hostTab, setHostTab] = useState("oauth-url");
  const [copiedQuickStart, setCopiedQuickStart] = useState(false);

  const universalStartPrompt = `Connect to Coffee Chat at ${mcpUrl} (sign in when prompted). Once connected, help me Roast my first private Bean from a real decision or article I share with you—ask what mattered more and when the rule stops applying, and wait for my confirmation before saving.`;

  const copyText = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleCopyQuickStart = async () => {
    try {
      await copyText(universalStartPrompt);
    } catch {
      // Clipboard may be unavailable in restricted contexts.
    }
    setCopiedQuickStart(true);
    window.setTimeout(() => setCopiedQuickStart(false), 3000);
  };

  const hostConfigs = [
    {
      id: "oauth-url",
      label: "Remote URL (OAuth)",
      language: "text",
      hint: "For web and desktop Agents with custom MCP connectors: paste this URL and approve sign-in once via OAuth auto-discovery.",
      code: `Connector URL: ${mcpUrl}\nTransport: Streamable HTTP\nAuth: OAuth 2.1 + PKCE (automatic discovery)`,
    },
    {
      id: "json",
      label: "JSON (mcpServers)",
      language: "json",
      hint: "Standard MCP client configuration for IDEs, desktop Agents, and local workspaces.",
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
      id: "toml",
      label: "TOML",
      language: "toml",
      hint: "For Agents configured with TOML server entries — approve sign-in once on first call.",
      code: `[mcp_servers.coffee_chat]\nurl = "${mcpUrl}"`,
    },
    {
      id: "http",
      label: "Discovery & Metadata",
      language: "bash",
      hint: "Inspect the live OAuth Protected Resource metadata or register a dynamic client directly.",
      code: `curl -s "${mcpUrl.replace(/\/api\/mcp$/, "")}/.well-known/oauth-protected-resource"`,
    },
  ];

  const starterPrompts = [
    {
      id: "brew-work",
      step: "01 · Brew",
      title: "Answer with my Taste",
      description: "Apply your confirmed priorities and respect every boundary",
      prompt:
        "Before recommending a path here, check my confirmed Coffee Chat Beans on this topic. Apply what I actually prioritize, tell me which Bean guided the call, and hold back any Bean outside its stated boundary.",
    },
    {
      id: "roast-work",
      step: "02 · Roast",
      title: "Save a correction as a private Bean",
      description:
        "Turn one real pushback into a lasting rule after your confirmation",
      prompt:
        "Turn the correction I just gave you into a private Coffee Chat Bean draft with a crisp takeaway, what mattered more, and when the rule stops applying. Show it to me for confirmation before saving anything.",
    },
    {
      id: "coffee-chat-other",
      step: "03 · Coffee Chat",
      title: "Consult someone else’s Taste",
      description:
        "Weigh another person’s confirmed Beans without fake roleplay",
      prompt:
        "Have a Coffee Chat with @claire using her confirmed public Coffee Chat Beans on this decision. Walk through what she puts first, note where her boundary stops, and attribute every point explicitly without impersonating her.",
    },
  ];

  return (
    <Stack gap={24}>
      <PageHeader
        title="Brew Bar"
        detail="Connect your Agents once — Brew your own Taste or Coffee Chat with anyone else’s anywhere you work"
        action={
          <Inline gap={8}>
            {signedIn ? (
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/me?tab=settings")}
              >
                Manage Brew Bar &amp; Account
              </Button>
            ) : (
              <Button
                emphasis="soft"
                size="compact"
                onClick={() => router.push("/signin?returnTo=/connect")}
              >
                Pull up a chair
              </Button>
            )}
          </Inline>
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
            Connected Agents:{" "}
            {connectedClientNames.length > 0
              ? connectedClientNames.join(", ")
              : "Active Agent"}
            . Your Beans stay private to you and your connected Agents until you
            put one On the Table.
          </Notice>
        ) : (
          <Notice title="No AI app connected yet" tone="neutral">
            Copy the universal start prompt below or use a manual MCP config
            snippet. You can revoke any connection instantly from Brew Bar &amp;
            Account.
          </Notice>
        )
      ) : (
        <Notice title="Private by default" tone="neutral">
          Your Agents connect with secure sign-in approval and never roast or
          save a Bean without your explicit confirmation.
        </Notice>
      )}

      <Card
        title="Fastest start · Paste into any Agent"
        description="Works with any MCP-compatible Agent — no config file needed to begin"
        headerAction={
          <Button
            emphasis="filled"
            tone="brand"
            size="compact"
            onClick={() => void handleCopyQuickStart()}
          >
            {copiedQuickStart ? "Copied prompt" : "Copy start prompt"}
          </Button>
        }
        variant="raised"
        density="regular"
      >
        <div className="prompt-code-wrap">
          <CodeBlock
            code={universalStartPrompt}
            language="text"
            onCopy={copyText}
          />
        </div>
      </Card>

      <Card
        title="Manual MCP configuration"
        description="Prefer configuring your connector directly? Pick your format below"
        headerAction={
          <Badge tone="neutral" dot={false}>
            Standard MCP + OAuth 2.1
          </Badge>
        }
        variant="raised"
        density="regular"
      >
        <Tabs
          label="Manual MCP setup"
          presentation="pill"
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
              </Stack>
            ),
          }))}
        />
      </Card>

      <Stack gap={16}>
        <ListHeader
          title="Plain-language prompts to try right away"
          detail="Step 2 · First pours"
        />
        <div className="cc-equal-cards">
          {starterPrompts.map((item) => (
            <Card
              key={item.id}
              title={item.title}
              description={`${item.step} · ${item.description}`}
              action={<CopyButton value={item.prompt} onCopy={copyText} />}
              variant="raised"
              density="regular"
            >
              <p className="cc-prompt-quote">{item.prompt}</p>
            </Card>
          ))}
        </div>
      </Stack>
    </Stack>
  );
}
