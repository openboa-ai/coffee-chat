"use client";

import type { ReactNode } from "react";
import { Avatar } from "@openboa/yogurt/avatar";
import { Badge } from "@openboa/yogurt/badge";
import { Card } from "@openboa/yogurt/card";
import { Divider } from "@openboa/yogurt/divider";
import { Heading } from "@openboa/yogurt/heading";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Stack } from "@openboa/yogurt/stack";
import { Text } from "@openboa/yogurt/text";
import type { UiBeanDetail, UiRelationKind } from "./types.js";

export function formatRelationHumanLabel(
  kind: UiRelationKind,
  direction?: "outgoing" | "incoming",
): string {
  if (kind === "supersedes") {
    return direction === "incoming"
      ? "Updated Mind · Replaced by"
      : "Updated Mind · Replaces";
  }
  if (kind === "refines") {
    return direction === "incoming"
      ? "Refined · Built on by"
      : "Refined · Builds on";
  }
  return "In Tension · Conflicts with";
}

export interface BeanCardProps {
  bean: UiBeanDetail;
  actions?: ReactNode;
  showOwner?: boolean;
  showVisibilityBadge?: boolean;
}

export function BeanCard({
  bean,
  actions,
  showOwner = true,
  showVisibilityBadge = true,
}: BeanCardProps) {
  const firstSource = bean.origins.find((o) => o.kind === "source_excerpt");
  const firstWork = bean.origins.find((o) => o.kind === "work_episode");
  const originLabel =
    firstSource && firstWork
      ? "Reading & Work Origins"
      : firstSource
        ? "Reading Origin · From reading"
        : "Work Origin · From work";

  return (
    <Card variant="raised" density="regular">
      <Stack gap={16}>
        <Inline justify="between" align="center" gap={12}>
          {showOwner ? (
            <Inline gap={8} align="center">
              <Avatar label={bean.ownerDisplayName} size="compact" />
              <Stack gap={2}>
                <Link href={`/@${bean.ownerHandle}`}>
                  <Text variant="body">{bean.ownerDisplayName}</Text>
                </Link>
                <Text variant="meta">@{bean.ownerHandle}</Text>
              </Stack>
            </Inline>
          ) : (
            <Inline gap={8} align="center">
              {showVisibilityBadge ? (
                <Badge
                  tone={bean.visibility === "public" ? "brand" : "neutral"}
                  dot={false}
                >
                  {bean.visibility === "public"
                    ? "On the Table · Public"
                    : "Private · Only me & my AI"}
                </Badge>
              ) : null}
              <Badge tone="neutral" dot={false}>
                {originLabel}
              </Badge>
            </Inline>
          )}

          <Inline gap={8} align="center">
            {showOwner && showVisibilityBadge ? (
              <Badge
                tone={bean.visibility === "public" ? "brand" : "neutral"}
                dot={false}
              >
                {bean.visibility === "public" ? "On the Table" : "Private"}
              </Badge>
            ) : null}
            {bean.supersededByBeanId ? (
              <Badge tone="warning">Updated Mind</Badge>
            ) : null}
            {bean.hasTension ? (
              <Badge tone="warning">In Tension</Badge>
            ) : null}
          </Inline>
        </Inline>

        <Stack gap={8}>
          <Heading level={3}>{bean.title}</Heading>
          <Text as="p" variant="body">
            {bean.take}
          </Text>
        </Stack>

        {firstSource?.quotation ? (
          <blockquote className="bean-quote">
            <Stack gap={4}>
              <Text variant="body">&ldquo;{firstSource.quotation}&rdquo;</Text>
              {firstSource.sourceTitle ? (
                <Text variant="meta">
                  — {firstSource.sourceTitle}
                  {firstSource.locator ? ` · ${firstSource.locator}` : ""}
                </Text>
              ) : null}
            </Stack>
          </blockquote>
        ) : null}

        <div className="bean-axis-tradeoff">
          <Stack gap={4}>
            <Text variant="meta">Trade-off · What mattered more</Text>
            <Text as="p" variant="body">
              {bean.tradeoff}
            </Text>
          </Stack>
        </div>

        <div className="bean-axis-boundary">
          <Stack gap={4}>
            <Text variant="meta">Boundary · When it doesn&apos;t apply</Text>
            <Text as="p" variant="help">
              {bean.boundary}
            </Text>
          </Stack>
        </div>

        {firstWork?.episodeSummary ? (
          <Text variant="meta">Work Origin: {firstWork.episodeSummary}</Text>
        ) : null}

        {firstSource && !firstSource.quotation && firstSource.url ? (
          <Text variant="meta">
            Reading Origin: {firstSource.sourceTitle ?? firstSource.url}
          </Text>
        ) : null}

        {bean.relations.length > 0 ? (
          <Inline gap={8}>
            {bean.relations.map((rel, idx) => (
              <Badge
                key={rel.id ?? idx}
                tone={rel.kind === "tensions_with" ? "warning" : "accent"}
                dot={false}
              >
                {formatRelationHumanLabel(rel.kind, rel.direction)}:{" "}
                {rel.relatedBeanTitle || rel.relatedBeanId}
              </Badge>
            ))}
          </Inline>
        ) : null}

        {bean.tags.length > 0 ? (
          <Inline gap={8}>
            {bean.tags.map((tag) => (
              <Badge key={tag} tone="neutral" dot={false}>
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
    </Card>
  );
}
