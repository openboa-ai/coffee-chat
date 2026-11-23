import {
  Badge,
  Divider,
  Heading,
  Inline,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import { getAppOrigin } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export default function ConnectPage() {
  const origin = getAppOrigin();
  const mcpUrl = `${origin}/api/mcp`;

  const mcpJson = JSON.stringify(
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

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <Inline gap={8}>
          <Badge tone="brand">OAuth 2.1 + Streamable HTTP</Badge>
          <Badge tone="accent">MCP Apps Enabled</Badge>
        </Inline>
        <Heading level={1}>Connect Your Agent Host</Heading>
        <Text variant="help">
          Coffee Chat uses remote OAuth 2.1 (RFC 9728 + PKCE S256 + CIMD/DCR) and universal Agent
          Skills. No static API keys required.
        </Text>
      </Stack>

      <Surface className="cc-card">
        <Stack gap={12}>
          <Heading level={3}>Remote MCP Endpoint</Heading>
          <pre className="cc-pre">{mcpUrl}</pre>
          <Text variant="meta">
            Discovery: {origin}/.well-known/oauth-protected-resource
          </Text>
        </Stack>
      </Surface>

      <Surface className="cc-card">
        <Stack gap={12}>
          <Heading level={3}>Codex CLI / App</Heading>
          <pre className="cc-pre">{`codex mcp add coffee-chat --url ${mcpUrl}`}</pre>
          <Text variant="help">
            Install the universal skills from <code>skills/roast</code> and <code>skills/brew</code>{" "}
            for full Roast/Brew guidance.
          </Text>
        </Stack>
      </Surface>

      <Surface className="cc-card">
        <Stack gap={12}>
          <Heading level={3}>Claude Code / Claude Desktop</Heading>
          <pre className="cc-pre">{`claude mcp add --transport http coffee-chat ${mcpUrl}`}</pre>
          <Text variant="help">
            Interactive hosts render Confirm Bean Card, Bean Picker, and Perspective Diff Card
            inline via MCP Apps; terminal CLI hosts use clean Markdown fallbacks automatically.
          </Text>
        </Stack>
      </Surface>

      <Surface className="cc-card">
        <Stack gap={12}>
          <Heading level={3}>Antigravity / ChatGPT / Cursor (Generic MCP JSON)</Heading>
          <pre className="cc-pre">{mcpJson}</pre>
        </Stack>
      </Surface>

      <Divider />

      <Text variant="meta">
        You can revoke any connected host immediately from My Roastery. Revocation invalidates both
        access and refresh tokens immediately.
      </Text>
    </Stack>
  );
}
