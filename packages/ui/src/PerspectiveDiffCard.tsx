"use client";

import {
  Avatar,
  Badge,
  Button,
  Divider,
  EmptyResult,
  Heading,
  Inline,
  Link,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import type { UiBeanDetail } from "./types.js";

export interface PerspectiveDiffCardProps {
  subject: string;
  subtitle?: string;
  perspectives: UiBeanDetail[];
  onSaveToShelf?: (bean: UiBeanDetail) => void;
  onOpenUrl?: (url: string) => void;
  savedIds?: string[];
  linkAuthors?: boolean;
}

export function PerspectiveDiffCard({
  subject,
  subtitle,
  perspectives,
  onSaveToShelf,
  onOpenUrl,
  savedIds = [],
  linkAuthors = false,
}: PerspectiveDiffCardProps) {
  return (
    <Surface className="cc-card">
      <Stack gap={16}>
        <div className="cc-row-between">
          <Stack gap={4}>
            <Badge tone="accent">Same Read · Different Takes</Badge>
            <Heading level={2}>{subject}</Heading>
            {subtitle ? <Text variant="meta">{subtitle}</Text> : null}
          </Stack>
          <Badge tone="neutral">{perspectives.length} confirmed perspectives</Badge>
        </div>

        <Text variant="help">
          Notice how different people highlight different lines, prioritize different trade-offs, and
          draw different boundaries on the exact same read.
        </Text>

        {perspectives.length === 0 ? (
          <EmptyResult empty="No public perspectives on this read yet." />
        ) : (
          <div className="cc-diff-grid">
            {perspectives.map((bean) => {
              const isSaved = savedIds.includes(bean.id);
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt",
              );
              return (
                <div key={bean.id} className="cc-card-compact">
                  <Stack gap={12}>
                    <div className="cc-row-between">
                      <Inline gap={8}>
                        <Avatar label={bean.ownerDisplayName} size={28} />
                        <Stack gap={2}>
                          {linkAuthors ? (
                            <Link href={`/@${bean.ownerHandle}`}>
                              <strong>{bean.ownerDisplayName}</strong>
                            </Link>
                          ) : (
                            <Text variant="body">
                              <strong>{bean.ownerDisplayName}</strong>
                            </Text>
                          )}
                          <Text variant="meta">@{bean.ownerHandle}</Text>
                        </Stack>
                      </Inline>
                      {bean.supersededByBeanId ? (
                        <Badge tone="warning">Updated later</Badge>
                      ) : null}
                    </div>

                    <Heading level={3}>{bean.title}</Heading>

                    {firstSource?.quotation ? (
                      <blockquote className="cc-quote">
                        &ldquo;{firstSource.quotation}&rdquo;
                      </blockquote>
                    ) : null}

                    <p className="cc-paragraph">
                      <Text variant="body">{bean.take}</Text>
                    </p>

                    <div className="cc-tradeoff-box">
                      <Stack gap={4}>
                        <Text variant="meta">What mattered more</Text>
                        <Text variant="body">
                          <strong>{bean.tradeoff}</strong>
                        </Text>
                      </Stack>
                    </div>

                    <div className="cc-boundary-box">
                      <Stack gap={4}>
                        <Text variant="meta">When it doesn&apos;t apply</Text>
                        <Text variant="help">{bean.boundary}</Text>
                      </Stack>
                    </div>

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
                          Read original
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
