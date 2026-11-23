import {
  Badge,
  EmptyResult,
  Heading,
  Link,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import { listPublicSources } from "@coffee-chat/core";
import { getDb } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export default async function SourcesDirectoryPage() {
  const db = await getDb();
  const sources = await listPublicSources(db, 50);

  return (
    <Stack gap={24}>
      <Stack gap={4}>
        <Heading level={1}>Public Sources</Heading>
        <Text variant="help">
          Only URLs referenced by at least one currently public Bean appear here. Private-only URLs
          are never listed.
        </Text>
      </Stack>

      {sources.length === 0 ? (
        <EmptyResult empty="No public sources yet." />
      ) : (
        <Stack gap={12}>
          {sources.map((src) => (
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
  );
}
