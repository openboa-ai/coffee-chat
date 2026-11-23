"use client";

import type { ReactNode } from "react";
import {
  Badge,
  Divider,
  Heading,
  Inline,
  Stack,
  Surface,
  Text,
} from "@openboa/yogurt";
import type { UiBeanDetail } from "./types.js";

export interface BeanCardProps {
  bean: UiBeanDetail;
  actions?: ReactNode;
  showOwner?: boolean;
}

export function BeanCard({
  bean,
  actions,
  showOwner = true,
}: BeanCardProps) {
  return (
    <Surface className="cc-card">
      <Stack gap={12}>
        <div className="cc-row-between">
          <Inline gap={8}>
            <Badge tone={bean.visibility === "public" ? "brand" : "neutral"}>
              {bean.visibility}
            </Badge>
            <Text variant="meta">
              v{bean.version} · rev {bean.revisionNumber}
            </Text>
            {bean.supersededByBeanId ? (
              <Badge tone="warning">Superseded</Badge>
            ) : null}
            {bean.hasTension ? <Badge tone="warning">Tension</Badge> : null}
          </Inline>
          {showOwner ? (
            <Text variant="meta">
              {bean.ownerDisplayName} (@{bean.ownerHandle})
            </Text>
          ) : null}
        </div>

        <Heading level={3}>{bean.title}</Heading>

        <Stack gap={8}>
          <div>
            <Text variant="meta">Take</Text>
            <p>
              <Text variant="body">{bean.take}</Text>
            </p>
          </div>
          <div>
            <Text variant="meta">Priority &amp; Trade-off</Text>
            <p>
              <Text variant="body">{bean.tradeoff}</Text>
            </p>
          </div>
          <div>
            <Text variant="meta">Boundary</Text>
            <p>
              <Text variant="help">{bean.boundary}</Text>
            </p>
          </div>
        </Stack>

        {bean.origins.length > 0 ? (
          <Stack gap={8}>
            <Text variant="meta">Origins</Text>
            {bean.origins.map((o, idx) => (
              <div key={idx} className="cc-muted-box">
                <Stack gap={4}>
                  <Inline gap={8}>
                    <Badge tone="neutral">
                      {o.kind === "source_excerpt" ? "Source" : "Work Episode"}
                    </Badge>
                    {o.locator ? <Text variant="meta">{o.locator}</Text> : null}
                  </Inline>
                  {o.kind === "source_excerpt" ? (
                    <>
                      <Text variant="body">{o.sourceTitle ?? o.url}</Text>
                      {o.url ? <Text variant="meta">{o.url}</Text> : null}
                      {o.quotation ? (
                        <blockquote className="cc-quote">
                          &ldquo;{o.quotation}&rdquo;
                        </blockquote>
                      ) : null}
                    </>
                  ) : (
                    <Text variant="body">{o.episodeSummary}</Text>
                  )}
                </Stack>
              </div>
            ))}
          </Stack>
        ) : null}

        {bean.relations.length > 0 ? (
          <Stack gap={4}>
            <Text variant="meta">Relations</Text>
            <Inline gap={8}>
              {bean.relations.map((rel, idx) => (
                <Badge
                  key={rel.id ?? idx}
                  tone={rel.kind === "tensions_with" ? "warning" : "accent"}
                >
                  {rel.direction === "incoming" ? "← " : "→ "}
                  {rel.kind}: {rel.relatedBeanTitle || rel.relatedBeanId}
                </Badge>
              ))}
            </Inline>
          </Stack>
        ) : null}

        {bean.tags.length > 0 ? (
          <Inline gap={4}>
            {bean.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                #{tag}
              </Badge>
            ))}
          </Inline>
        ) : null}

        {actions ? (
          <>
            <Divider />
            <Inline gap={8}>{actions}</Inline>
          </>
        ) : null}
      </Stack>
    </Surface>
  );
}
