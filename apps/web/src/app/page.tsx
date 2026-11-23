import {
  Badge,
  Divider,
  Heading,
  Inline,
  Link,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import { listPublicSources } from "@coffee-chat/core";
import { getDb } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const publicSources = await listPublicSources(db, 10);

  return (
    <Stack gap={32}>
      <Surface className="cc-card">
        <Stack gap={16}>
          <Inline gap={8}>
            <Badge tone="brand">Coffee Chat</Badge>
            <Badge tone="neutral">Private by default</Badge>
            <Badge tone="accent">Zero-AI Web + OAuth 2.1 MCP</Badge>
          </Inline>
          <Heading level={1}>
            Knowledge is shared. What a person makes of it is personal.
          </Heading>
          <Text variant="body">
            Capture author-confirmed perspectives from reading or real work decisions—preserving
            what mattered, which trade-offs you accepted, and where your judgment stops—then reuse
            them across any agent host for Work and human Talk.
          </Text>
          <Inline gap={16}>
            <Link href="/me">Open My Roastery</Link>
            <Link href="/connect">Connect Codex / Claude / Antigravity</Link>
            <Link href="/sources">Browse Public Sources</Link>
          </Inline>
        </Stack>
      </Surface>

      <div className="cc-diff-grid">
        <Surface className="cc-card">
          <Stack gap={8}>
            <Badge tone="brand">1. Roast</Badge>
            <Heading level={3}>Capture in one click</Heading>
            <Text variant="help">
              Notice a trade-off while correcting an agent or reading an article. Review the
              Confirm Bean Card and save with an exact RFC 8785 digest. Private by default.
            </Text>
          </Stack>
        </Surface>

        <Surface className="cc-card">
          <Stack gap={8}>
            <Badge tone="accent">2. Living Taste</Badge>
            <Heading level={3}>Evolve without silent overwrite</Heading>
            <Text variant="help">
              Connect confirmed Beans with supersedes, refines, and tensions_with relations so
              agents know which criteria are active and when to ask.
            </Text>
          </Stack>
        </Surface>

        <Surface className="cc-card">
          <Stack gap={8}>
            <Badge tone="success">3. Brew (Work &amp; Talk)</Badge>
            <Heading level={3}>Reuse across any agent host</Heading>
            <Text variant="help">
              Bring your Beans—and public perspectives saved to your Shelf—into new tasks with
              transparent attribution and zero impersonation.
            </Text>
          </Stack>
        </Surface>
      </div>

      <Divider />

      <Stack gap={12}>
        <Heading level={2}>Public Sources to Compare ({publicSources.length})</Heading>
        {publicSources.length === 0 ? (
          <Text variant="help">
            No public source comparisons yet. Publish a source-grounded Bean in My Roastery to open a
            shared Source Compare page.
          </Text>
        ) : (
          <Stack gap={8}>
            {publicSources.map((src) => (
              <Surface key={src.originId} className="cc-card">
                <div className="cc-row-between">
                  <Link href={`/sources/${src.originId}`}>{src.normalizedUrl}</Link>
                  <Badge tone="brand">{src.publicBeanCount} public Beans</Badge>
                </div>
              </Surface>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
