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
  const [hostTab, setHostTab] = useState("chatgpt");
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
      id: "chatgpt",
      label: "ChatGPT",
      language: "text",
      hint: "In Settings → Apps & Connectors → Add Custom Connector, paste this URL and approve once.",
      code: `Connector URL: ${mcpUrl}\nAuth: OAuth (automatic discovery)`,
    },
    {
      id: "claude",
      label: "Claude",
      language: "bash",
      hint: "Add Coffee Chat to Claude Code once from your terminal, or connect the URL in Claude Connectors.",
      code: `claude mcp add --transport http coffee-chat "${mcpUrl}"`,
    },
    {
      id: "codex",
      label: "Codex",
      language: "toml",
      hint: "Add Coffee Chat to ~/.codex/config.toml, then approve sign-in once when prompted.",
      code: `[mcp_servers.coffee_chat]\nurl = "${mcpUrl}"`,
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
  ];

  const starterPrompts = [
    {
      id: "brew-work",
      title: "Brew · Answer with my Taste",
      description: "Apply your confirmed priorities and respect every boundary",
      prompt:
        "Before recommending a path here, check my confirmed Coffee Chat Beans on this topic. Apply what I actually prioritize, tell me which Bean guided the call, and hold back any Bean outside its stated boundary.",
    },
    {
      id: "roast-work",
      title: "Roast · Save a correction as a private Bean",
      description:
        "Turn one real pushback into a lasting rule after your confirmation",
      prompt:
        "Turn the correction I just gave you into a private Coffee Chat Bean draft with a crisp takeaway, what mattered more, and when the rule stops applying. Show it to me for confirmation before saving anything.",
    },
    {
      id: "coffee-chat-other",
      title: "Coffee Chat · Ask someone else’s Taste",
      description:
        "Consult another person’s confirmed Beans without fake roleplay",
      prompt:
        "Have a Coffee Chat with @claire using her confirmed public Coffee Chat Beans on this decision. Walk through what she puts first, note where her boundary stops, and attribute every point explicitly without impersonating her.",
    },
  ];

  return (
    <Stack gap={24}>
      <PageHeader
        title="Brew Bar"
        detail="Connect your AI once — Brew your own Taste or Coffee Chat with anyone else’s anywhere you work"
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
                emphasis="filled"
                tone="brand"
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
            Connected apps:{" "}
            {connectedClientNames.length > 0
              ? connectedClientNames.join(", ")
              : "Active AI app"}
            . Your Beans stay private to you and your connected AI until you put
            one On the Table.
          </Notice>
        ) : (
          <Notice title="No AI app connected yet" tone="neutral">
            Copy the universal start prompt below or pick your AI app for manual
            setup. You can revoke any connection instantly from Brew Bar &amp;
            Account.
          </Notice>
        )
      ) : (
        <Notice title="Private by default" tone="neutral">
          Your AI connects with secure sign-in approval and never roasts or
          saves a Bean without your explicit confirmation.
        </Notice>
      )}

      <Card
        title="Fastest start · Paste into any AI"
        description="Works regardless of which AI app you use — no config file needed to begin"
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
        title="Manual setup by AI app"
        description="Prefer configuring your connector directly? Pick your AI app below"
        headerAction={
          <Badge tone="neutral" dot={false}>
            5 AI apps supported
          </Badge>
        }
        variant="raised"
        density="regular"
      >
        <Tabs
          label="AI host setup"
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
