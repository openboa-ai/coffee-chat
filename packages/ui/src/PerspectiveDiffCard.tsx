"use client";

import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Stack } from "@openboa/yogurt/stack";
import { Surface } from "@openboa/yogurt/surface";
import { Text } from "@openboa/yogurt/text";
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
    <Card
      title={subject}
      description={
        subtitle ?? "Table · Side-by-side Beans comparing trade-offs and boundaries"
      }
      headerAction={
        <Badge tone="neutral" dot={false}>
          {perspectives.length} confirmed Beans
        </Badge>
      }
      variant="raised"
      density="regular"
    >
      <Stack gap={16}>
        {perspectives.length === 0 ? (
          <EmptyResult empty="No public Beans on this Table yet." />
        ) : (
          <div className="split-grid">
            {perspectives.map((bean) => {
              const isSaved = savedIds.includes(bean.id);
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt",
              );
              return (
                <Surface key={bean.id} variant="outlined" density="compact">
                  <Stack gap={12}>
                    <Inline justify="between" align="center" gap={8}>
                      <Inline gap={8} align="center">
                        <Avatar label={bean.ownerDisplayName} size="compact" />
                        <Stack gap={2}>
                          {linkAuthors ? (
                            <Link href={`/@${bean.ownerHandle}`}>
                              <Text variant="body">{bean.ownerDisplayName}</Text>
                            </Link>
                          ) : (
                            <Text variant="body">{bean.ownerDisplayName}</Text>
                          )}
                          <Text variant="meta">@{bean.ownerHandle}</Text>
                        </Stack>
                      </Inline>
                      {bean.supersededByBeanId ? (
                        <Badge tone="warning">Updated Mind</Badge>
                      ) : null}
                    </Inline>

                    <Heading level={3}>{bean.title}</Heading>

                    {firstSource?.quotation ? (
                      <blockquote className="bean-quote">
                        <Text variant="body">
                          &ldquo;{firstSource.quotation}&rdquo;
                        </Text>
                      </blockquote>
                    ) : null}

                    <p className="editorial-lead">{bean.take}</p>

                    <div className="bean-pull">
                      <Stack gap={2}>
                        <Text variant="meta">What mattered more</Text>
                        <Text as="p" variant="body">
                          {bean.tradeoff}
                        </Text>
                      </Stack>
                    </div>

                    <p className="bean-footnote">Except when: {bean.boundary}</p>

                    <Divider />

                    <Inline gap={8}>
                      {onSaveToShelf && bean.visibility === "public" ? (
                        <Button
                          emphasis={isSaved ? "quiet" : "soft"}
                          size="compact"
                          disabled={isSaved}
                          onClick={() => onSaveToShelf(bean)}
                        >
                          {isSaved ? "On Shelf" : "Save to Shelf"}
                        </Button>
                      ) : null}
                      {onOpenUrl && firstSource?.url ? (
                        <Button
                          emphasis="quiet"
                          size="compact"
                          onClick={() => onOpenUrl(firstSource.url!)}
                        >
                          Read source
                        </Button>
                      ) : null}
                    </Inline>
                  </Stack>
                </Surface>
              );
            })}
          </div>
        )}
      </Stack>
    </Card>
  );
}
