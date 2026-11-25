"use client";

import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Button } from "@openboa/yogurt/button";
import { ButtonGroup } from "@openboa/yogurt/button-group";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { EmptyResult } from "@openboa/yogurt/empty-result";
import { Grid } from "@openboa/yogurt/grid";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Stack } from "@openboa/yogurt/stack";
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
        subtitle ??
        "Table · Side-by-side Beans comparing trade-offs and boundaries"
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
          <Grid className="split-grid" gap={16}>
            {perspectives.map((bean) => {
              const isSaved = savedIds.includes(bean.id);
              const firstSource = bean.origins.find(
                (o) => o.kind === "source_excerpt",
              );
              return (
                <Card key={bean.id} variant="outlined" density="compact">
                  <Stack gap={12}>
                    <Inline justify="between" align="center" gap={8}>
                      <Inline gap={8} align="center">
                        <Avatar label={bean.ownerDisplayName} size="compact" />
                        {linkAuthors ? (
                          <Link
                            href={`/@${bean.ownerHandle}`}
                            className="person-inline-link"
                          >
                            <Text variant="body">{bean.ownerDisplayName}</Text>
                            <Text variant="meta">@{bean.ownerHandle}</Text>
                          </Link>
                        ) : (
                          <Stack gap={2}>
                            <Text variant="body">{bean.ownerDisplayName}</Text>
                            <Text variant="meta">@{bean.ownerHandle}</Text>
                          </Stack>
                        )}
                      </Inline>
                      {bean.supersededByBeanId ? (
                        <Badge tone="warning">Updated Mind</Badge>
                      ) : null}
                    </Inline>

                    <Heading level={3}>{bean.title}</Heading>

                    {firstSource?.quotation ? (
                      <blockquote className="cc-quote">
                        <Text variant="help">
                          &ldquo;{firstSource.quotation}&rdquo;
                        </Text>
                      </blockquote>
                    ) : null}

                    <Text as="p" variant="body" className="editorial-lead">
                      {bean.take}
                    </Text>

                    <div className="cc-criteria-grid">
                      <Stack gap={4}>
                        <Text variant="meta">What mattered more</Text>
                        <Text as="p" variant="body">
                          {bean.tradeoff}
                        </Text>
                      </Stack>
                      <Stack gap={4}>
                        <Text variant="meta">Except when</Text>
                        <Text as="p" variant="help">
                          {bean.boundary}
                        </Text>
                      </Stack>
                    </div>

                    <Divider />

                    <ButtonGroup label={`Actions for ${bean.title}`}>
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
                    </ButtonGroup>
                  </Stack>
                </Card>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Card>
  );
}
