import {
  Badge,
  Button,
  EmptyResult,
  Heading,
  Inline,
  Link,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import { listPublicSources } from "@coffee-chat/core";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export default async function SourcesDirectoryPage() {
  const db = await getDb();
  const user = await getCurrentUser();
  const sources = await listPublicSources(db, 50);

  return (
    <Stack gap={24}>
      <div className="cc-row-between">
        <Stack gap={4}>
          <Heading level={1}>Shared Tables</Heading>
          <Text variant="help">
            Every table starts from one shared link and shows how different people read it,
            weighed trade-offs, and drew boundaries.
          </Text>
        </Stack>
        <Link href={user ? "/me?compose=1" : "/signin?returnTo=/me?compose=1"}>
          <Button emphasis="filled" tone="brand" size="compact">
            Start a new table
          </Button>
        </Link>
      </div>

      {sources.length === 0 ? (
        <EmptyResult empty="No shared tables yet. Publish a take on any article to start one." />
      ) : (
        <Stack gap={12}>
          {sources.map((src) => (
            <Surface key={src.originId} className="cc-card">
              <Stack gap={12}>
                <div className="cc-row-between">
                  <Stack gap={4}>
                    <Link href={`/sources/${src.originId}`}>
                      <Heading level={3}>
                        {src.sourceTitle ?? src.normalizedUrl}
                      </Heading>
                    </Link>
                    <Text variant="meta">{src.normalizedUrl}</Text>
                  </Stack>
                  <Badge tone="brand">
                    {src.publicBeanCount}{" "}
                    {src.publicBeanCount === 1 ? "take" : "takes"}
                  </Badge>
                </div>

                <div className="cc-row-between">
                  <Inline gap={8}>
                    {src.authorHandles.map((handle) => (
                      <Badge key={handle} tone="neutral">
                        @{handle}
                      </Badge>
                    ))}
                  </Inline>
                  <Link href={`/sources/${src.originId}`}>
                    Compare perspectives →
                  </Link>
                </div>
              </Stack>
            </Surface>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
