"use client";

import {
  Badge,
  Button,
  Divider,
  EmptyResult,
  Heading,
  Inline,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import type { UiBeanDetail } from "./types.js";

export interface PerspectiveDiffCardProps {
  subject: string;
  perspectives: UiBeanDetail[];
  onSaveToShelf?: (bean: UiBeanDetail) => void;
  onOpenUrl?: (url: string) => void;
  savedIds?: string[];
}

export function PerspectiveDiffCard({
  subject,
  perspectives,
  onSaveToShelf,
  onOpenUrl,
  savedIds = [],
}: PerspectiveDiffCardProps) {
  return (
    <Surface className="cc-card">
      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={4}>
            <Badge tone="accent">Perspective Diff</Badge>
            <Heading level={3}>{subject}</Heading>
          </Stack>
          <Text variant="meta">{perspectives.length} confirmed perspectives</Text>
        </div>

        <Text variant="help">
          Compare what different authors noticed, prioritized, and bounded on the same subject.
        </Text>

        {perspectives.length === 0 ? (
          <EmptyResult empty="No public perspectives found for this subject yet." />
        ) : (
          <div className="cc-diff-grid">
            {perspectives.map((bean) => {
              const isSaved = savedIds.includes(bean.id);
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt",
              );
              return (
                <div key={bean.id} className="cc-muted-box">
                  <Stack gap={12}>
                    <div className="cc-row-between">
                      <Stack gap={2}>
                        <Text variant="body">
                          <strong>{bean.ownerDisplayName}</strong>
                        </Text>
                        <Text variant="meta">@{bean.ownerHandle} · rev {bean.revisionNumber}</Text>
                      </Stack>
                      <Badge tone={bean.visibility === "public" ? "brand" : "neutral"}>
                        {bean.visibility}
                      </Badge>
                    </div>

                    <Heading level={4}>{bean.title}</Heading>

                    {firstSource?.quotation ? (
                      <blockquote className="cc-quote">
                        &ldquo;{firstSource.quotation}&rdquo;
                      </blockquote>
                    ) : null}

                    <Stack gap={4}>
                      <Text variant="meta">Take</Text>
                      <Text variant="body">{bean.take}</Text>
                    </Stack>

                    <Stack gap={4}>
                      <Text variant="meta">Priority &amp; Trade-off</Text>
                      <Text variant="body">{bean.tradeoff}</Text>
                    </Stack>

                    <Stack gap={4}>
                      <Text variant="meta">Boundary</Text>
                      <Text variant="help">{bean.boundary}</Text>
                    </Stack>

                    <Divider />

                    <Inline gap={8}>
                      {onSaveToShelf && bean.visibility === "public" ? (
                        <Button
                          emphasis={isSaved ? "quiet" : "soft"}
                          size="compact"
                          disabled={isSaved}
                          onClick={() => onSaveToShelf(bean)}
                        >
                          {isSaved ? "Saved to Shelf" : "Save to Shelf"}
                        </Button>
                      ) : null}
                      {onOpenUrl && firstSource?.url ? (
                        <Button
                          emphasis="quiet"
                          size="compact"
                          onClick={() => onOpenUrl(firstSource.url!)}
                        >
                          Open Source
                        </Button>
                      ) : null}
                    </Inline>
                  </Stack>
                </div>
              );
            })}
          </div>
        )}
      </Stack>
    </Surface>
  );
}
