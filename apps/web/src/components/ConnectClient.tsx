"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  CodeBlock,
  Divider,
  Heading,
  Inline,
  Link,
  SegmentedControl,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";

export interface ConnectClientProps {
  mcpUrl: string;
}

type HostId = "claude" | "codex" | "chatgpt" | "antigravity" | "cursor";

const STARTER_PROMPTS = [
  {
    id: "capture",
    badge: "Capture while working",
    title: "Turn a correction into a reusable rule",
    prompt:
      "Save the trade-off I just gave you—explicit auth failures over silent fallbacks—as a private Coffee Chat take.",
  },
  {
    id: "work",
    badge: "Apply to Work",
    title: "Review a plan through your own trade-offs",
    prompt:
      "Review my launch plan using my Coffee Chat perspectives, and tell me which take shaped each recommendation.",
  },
  {
    id: "talk",
    badge: "Coffee Chat (Talk)",
    title: "Compare two sharp people on one read",
    prompt:
      "Compare how @mina and @jun view splitting a monolith on Coffee Chat—showing their exact trade-offs without impersonating them.",
  },
];

export function ConnectClient({ mcpUrl }: ConnectClientProps) {
  const [host, setHost] = useState<HostId>("claude");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const genericConfig = JSON.stringify(
    {
      mcpServers: {
        "coffee-chat": {
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );

  const hostSetup: Record<
    HostId,
    { title: string; subtitle: string; code: string; language: string }
  > = {
    claude: {
      title: "Claude Code & Claude Desktop",
      subtitle:
        "Run this once in your terminal (or add the URL in Claude Desktop Connectors). Your browser will open once for one-click sign-in.",
      code: `claude mcp add --transport http coffee-chat ${mcpUrl}`,
      language: "bash",
    },
    codex: {
      title: "Codex CLI & Codex App",
      subtitle:
        "Add Coffee Chat as a remote MCP server. Codex handles browser sign-in automatically—no API keys to copy.",
      code: `codex mcp add coffee-chat --url ${mcpUrl}`,
      language: "bash",
    },
    chatgpt: {
      title: "ChatGPT Connectors / Plugins",
      subtitle:
        "Add the Coffee Chat server URL as a custom MCP connector in ChatGPT settings and sign in with your account.",
      code: mcpUrl,
      language: "text",
    },
    antigravity: {
      title: "Antigravity",
      subtitle:
        "Add Coffee Chat to your MCP server config. Interactive confirmation, picker, and diff cards render right inside the chat.",
      code: genericConfig,
      language: "json",
    },
    cursor: {
      title: "Cursor",
      subtitle: "Paste into your Cursor MCP settings file to connect your perspectives.",
      code: genericConfig,
      language: "json",
    },
  };

  const active = hostSetup[host];

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <Stack gap={24}>
      <Surface className="cc-hero">
        <Stack gap={12}>
          <Badge tone="brand">30-Second Setup</Badge>
          <Heading level={1}>Use Coffee Chat Inside Your AI</Heading>
          <Text variant="body">
            Connect once—no API keys to copy. Whenever you read an article or correct your AI at
            work, confirm a take in one click and reuse it across every future conversation.
          </Text>
        </Stack>
      </Surface>

      <Surface className="cc-card">
        <Stack gap={16}>
          <Heading level={2}>1. Pick the AI you use</Heading>
          <SegmentedControl
            label="Choose AI host"
            value={host}
            onValueChange={(v) => setHost(v as HostId)}
            options={[
              { id: "claude", label: "Claude" },
              { id: "codex", label: "Codex" },
              { id: "chatgpt", label: "ChatGPT" },
              { id: "antigravity", label: "Antigravity" },
              { id: "cursor", label: "Cursor" },
            ]}
          />

          <Stack gap={8}>
            <Heading level={3}>{active.title}</Heading>
            <Text variant="help">{active.subtitle}</Text>
            <CodeBlock
              code={active.code}
              language={active.language}
              onCopy={(text) => copy("setup", text)}
            />
            <Inline gap={8}>
              <Button
                emphasis="filled"
                tone="brand"
                size="compact"
                onClick={() => copy("setup", active.code)}
              >
                {copiedId === "setup" ? "Copied!" : "Copy setup command"}
              </Button>
              <Text variant="meta">Server URL: {mcpUrl}</Text>
            </Inline>
          </Stack>
        </Stack>
      </Surface>

      <Stack gap={12}>
        <Stack gap={4}>
          <Heading level={2}>2. Try these 3 prompts right away</Heading>
          <Text variant="help">
            Once connected, your AI knows how to capture takes and bring them into new work.
          </Text>
        </Stack>

        <div className="cc-diff-grid">
          {STARTER_PROMPTS.map((item) => (
            <Surface key={item.id} className="cc-card-compact">
              <Stack gap={12}>
                <Badge tone="accent">{item.badge}</Badge>
                <Heading level={3}>{item.title}</Heading>
                <blockquote className="cc-quote">&ldquo;{item.prompt}&rdquo;</blockquote>
                <div>
                  <Button
                    emphasis="soft"
                    size="compact"
                    onClick={() => copy(item.id, item.prompt)}
                  >
                    {copiedId === item.id ? "Copied prompt" : "Copy prompt"}
                  </Button>
                </div>
              </Stack>
            </Surface>
          ))}
        </div>
      </Stack>

      <Divider />

      <div className="cc-row-between">
        <Text variant="help">
          You stay in full control—revoke any connected AI host instantly from My Table settings.
        </Text>
        <Link href="/me">Go to My Table →</Link>
      </div>
    </Stack>
  );
}
